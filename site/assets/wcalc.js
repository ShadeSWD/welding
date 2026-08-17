/* wcalc.js — общая расчётная библиотека сайта «Сварка судовых конструкций».
 * Чистые функции (без DOM) + мелкие помощники вывода «формула = подстановка =
 * результат». Подключается перед скриптом конкретной страницы. */
'use strict';
window.W = (function () {

  /* ---------- форматирование ---------- */
  // Число с русской запятой и заданным числом значащих/десятичных знаков.
  function f(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    if (dec === undefined) {
      const a = Math.abs(x);
      dec = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
    }
    return x.toFixed(dec).replace('.', ',').replace('-', '−');
  }
  // Согласование существительного с числом: 1 проход, 2 прохода, 5 проходов.
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }
  const num = (id) => parseFloat(String(el(id).value).replace(',', '.')) || 0;
  const val = (id) => el(id).value;
  const el = (id) => document.getElementById(id);
  const setHtml = (id, s) => { const n = el(id); if (n) n.innerHTML = s; };

  /* Строка живого расчёта: подстановка серым, результат жирным.
   * out('q', 'q_п = ', '0,8 · 25 · 160 / 3,889', '0,823 кДж/мм') */
  function out(id, lead, subst, result, why) {
    const n = el(id);
    if (!n) return;
    n.innerHTML = esc(lead) + '<span class="sub">' + esc(subst) + '</span> = <b>' +
      esc(result) + '</b>' + (why ? '<div class="why">' + why + '</div>' : '');
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Привязать пересчёт ко всем полям контейнера.
  function bind(container, fn) {
    const box = typeof container === 'string' ? el(container) : container;
    if (!box) return;
    box.querySelectorAll('input, select').forEach((n) => {
      n.addEventListener('input', fn);
      n.addEventListener('change', fn);
    });
    fn();
  }

  /* ---------- физические постоянные (низкоуглеродистая и низколегированная сталь) ---------- */
  const STEEL = {
    rho: 7.85,        // г/см³, плотность
    cg: 0.0047,       // Дж/(мм³·°C), объёмная теплоёмкость
    alpha: 0.12e-4,   // 1/°C, коэффициент линейного расширения
    E: 2.0e5,         // МПа, модуль упругости
    sigmaT: 240,      // МПа, предел текучести (условно)
    lambda: 0.04,     // Вт/(мм·°C), теплопроводность
  };
  const RHO = { steel: 7.85, stainless: 8.02, titanium: 4.51 };

  /* ---------- способы сварки ---------- */
  /* k — термический КПД по BS EN 1011-1:2009 (табл. 1);
     eta — эффективный КПД по отечественной записи q_п = 0,24·I·U·η/v;
     iso — номер процесса по ISO 4063. */
  const PROC = {
    smaw:  { iso: 111, name: 'Ручная дуговая покрытым электродом (РДС)', k: 0.8, eta: [0.70, 0.70],
             dRange: [2.0, 6.0], uRange: [20, 36], uTyp: [22, 28], vRange: [6, 20],
             alphaN: [8, 10], kEl: [1.6, 1.7], kPog: [0.50, 0.55], gas: null },
    gmaw:  { iso: 135, name: 'Механизированная в активном газе (MAG, CO₂)', k: 0.8, eta: [0.80, 0.84],
             dRange: [0.8, 1.6], uRange: [16, 34], uTyp: [18, 32], vRange: [15, 45],
             alphaN: [10, 16], kEl: [1.05, 1.08], kPog: [0.57, 0.60], gas: [8, 18] },
    saw:   { iso: 121, name: 'Автоматическая под флюсом', k: 1.0, eta: [0.85, 0.95],
             dRange: [2.0, 5.0], uRange: [22, 55], uTyp: [28, 40], vRange: [20, 60],
             alphaN: [14, 22], kEl: [1.02, 1.03], kPog: [0.60, 0.70], gas: null },
    fcaw:  { iso: 136, name: 'Порошковой проволокой в активном газе', k: 0.8, eta: [0.78, 0.82],
             dRange: [1.2, 2.4], uRange: [18, 34], uTyp: [22, 30], vRange: [12, 35],
             alphaN: [13.6, 26.6], kEl: [1.25, 1.35], kPog: [0.55, 0.60], gas: [12, 20] },
    gtaw:  { iso: 141, name: 'Аргонодуговая неплавящимся электродом (TIG)', k: 0.6, eta: [0.50, 0.50],
             dRange: [1.6, 3.0], uRange: [10, 16], uTyp: [11, 14], vRange: [4, 12],
             alphaN: [4.2, 10], kEl: [1.01, 1.02], kPog: [0.50, 0.55], gas: [8, 12] },
  };
  const mid = (r) => (r[0] + r[1]) / 2;

  /* ---------- погонная энергия ---------- */
  // Q [кДж/мм] по BS EN 1011-1: Q = k·U·I/v ·10⁻³, v в мм/с.
  function heatInputEN(k, U, I, v_mms) { return k * U * I / v_mms / 1000; }
  // То же в отечественной записи через эффективный КПД: q_п = η·U·I/v.
  function heatInputRU(eta, U, I, v_mms) { return eta * U * I / v_mms / 1000; }
  // q_п в кал/см: 0,24·I·U·η/v, v в см/с.
  function heatInputCal(eta, U, I, v_cms) { return 0.24 * I * U * eta / v_cms; }
  const mhToMms = (v) => v / 3.6;          // м/ч → мм/с

  /* ---------- эквивалент углерода ---------- */
  // c — объект с массовыми долями в процентах: C, Si, Mn, Cr, Mo, Ni, Cu, V, B, P.
  const g = (c, k) => (c && isFinite(c[k]) ? c[k] : 0);
  function CEV(c) {  // IIW, EN 1011-2 п. C.2.1
    return g(c,'C') + g(c,'Mn')/6 + (g(c,'Cr') + g(c,'Mo') + g(c,'V'))/5 + (g(c,'Ni') + g(c,'Cu'))/15;
  }
  function CET(c) {  // EN 1011-2 п. C.3.2.1
    return g(c,'C') + (g(c,'Mn') + g(c,'Mo'))/10 + (g(c,'Cr') + g(c,'Cu'))/20 + g(c,'Ni')/40;
  }
  function Pcm(c) {  // Ito–Bessyo, IIW IX-576-68
    return g(c,'C') + g(c,'Si')/30 + (g(c,'Mn') + g(c,'Cu') + g(c,'Cr'))/20 +
           g(c,'Ni')/60 + g(c,'Mo')/15 + g(c,'V')/10 + 5 * g(c,'B');
  }
  function CE_GOST(c) {  // ГОСТ 27772, п. 4.3
    return g(c,'C') + g(c,'Mn')/6 + g(c,'Si')/24 + g(c,'Cr')/5 + g(c,'Ni')/40 +
           g(c,'Cu')/13 + g(c,'V')/14 + g(c,'P')/2;
  }
  /* Температура предварительного подогрева по EN 1011-2:2001+A1:2003,
     приложение C, метод B, уравнение (C.8):
       Tp = 697·CET + 160·tanh(d/35) + 62·HD^0,35 + (53·CET − 32)·Q − 328, °C
     d — толщина листа, мм (для разнотолщинных — по более толстому);
     HD — диффузионный водород, мл/100 г (по ISO 3690); Q — погонная энергия, кДж/мм.
     Область: R_eH ≤ 1000 Н/мм², CET 0,2…0,5 %, d 10…90 мм, HD 1…20, Q 0,5…4,0. */
  const preheatB = (cet, d, HD, Q) =>
    697 * cet + 160 * Math.tanh(d / 35) + 62 * Math.pow(HD, 0.35) + (53 * cet - 32) * Q - 328;
  /* Разложение на четыре вклада — уравнения (C.3)…(C.6); их сумма (C.7) тождественна (C.8). */
  const preheatBParts = (cet, d, HD, Q) => ({
    cet: 750 * cet - 150,
    d: 160 * Math.tanh(d / 35) - 110,
    hd: 62 * Math.pow(HD, 0.35) - 100,
    q: (53 * cet - 32) * Q - 53 * cet + 32,
  });
  // Вклад химического состава по отдельности — уравнение (C.3).
  const preheatCET = (cet) => 750 * cet - 150;
  /* Шкалы содержания диффузионного водорода, EN 1011-2 табл. C.2, мл/100 г. */
  const HD_SCALE = [
    { k: 'A', lo: 15, hi: 999, txt: 'A — свыше 15' },
    { k: 'B', lo: 10, hi: 15, txt: 'B — свыше 10 до 15' },
    { k: 'C', lo: 5, hi: 10, txt: 'C — свыше 5 до 10' },
    { k: 'D', lo: 3, hi: 5, txt: 'D — свыше 3 до 5' },
    { k: 'E', lo: 0, hi: 3, txt: 'E — не более 3' },
  ];
  const hdScale = (hd) => (HD_SCALE.find((s) => hd > s.lo && hd <= s.hi) ||
    (hd > 15 ? HD_SCALE[0] : HD_SCALE[4]));

  /* Предельный углеродный эквивалент по Правилам РМРС, часть XIII,
     табл. 3.2.2-3 (стали после термомеханической обработки). */
  const CEV_LIMIT = {
    'A32': [0.36, 0.38], 'D32': [0.36, 0.38], 'E32': [0.36, 0.38], 'F32': [0.36, 0.38],
    'A36': [0.38, 0.40], 'D36': [0.38, 0.40], 'E36': [0.38, 0.40], 'F36': [0.38, 0.40],
    'A40': [0.40, 0.42], 'D40': [0.40, 0.42], 'E40': [0.40, 0.42], 'F40': [0.40, 0.42],
    'CMn': [0.41, 0.41],
  };
  const cevLimit = (grade, t) => {
    const r = CEV_LIMIT[grade] || CEV_LIMIT.CMn;
    return t <= 50 ? r[0] : r[1];
  };

  /* ---------- скорость охлаждения ЗТВ (схемы Н. Н. Рыкалина) ---------- */
  // Массивное тело (трёхмерный поток): ω = 2πλ(T − T₀)²/q_п. q_п в Дж/мм.
  function coolThick(q_Jmm, T, T0, lam) {
    lam = lam || STEEL.lambda;
    return 2 * Math.PI * lam * Math.pow(T - T0, 2) / q_Jmm;
  }
  // Пластина (двумерный поток): ω = 2πλcγ(T − T₀)³/(q_п/s)².
  function coolThin(q_Jmm, T, T0, s, lam, cg) {
    lam = lam || STEEL.lambda; cg = cg || STEEL.cg;
    return 2 * Math.PI * lam * cg * Math.pow(T - T0, 3) / Math.pow(q_Jmm / s, 2);
  }
  // Толщина, при которой обе схемы дают одно и то же: s* = √(q_п/(cγ(T − T₀))).
  function sStar(q_Jmm, T, T0, cg) {
    cg = cg || STEEL.cg;
    return Math.sqrt(q_Jmm / (cg * (T - T0)));
  }
  /* Время охлаждения в интервале 800→500 °C. Получено интегрированием тех же
     зависимостей Рыкалина: dt = dT / ω(T).
       массивное тело: Δt = q/(2πλ) [1/(500−T₀) − 1/(800−T₀)];
       пластина:       Δt = (q/s)²/(4πλcγ) [1/(500−T₀)² − 1/(800−T₀)²]. */
  function t85(q_Jmm, T0, s, lam, cg) {
    lam = lam || STEEL.lambda; cg = cg || STEEL.cg;
    const a = q_Jmm / (2 * Math.PI * lam) * (1 / (500 - T0) - 1 / (800 - T0));
    const b = Math.pow(q_Jmm / s, 2) / (4 * Math.PI * lam * cg) *
              (1 / Math.pow(500 - T0, 2) - 1 / Math.pow(800 - T0, 2));
    const ss = sStar(q_Jmm, 550, T0, cg);
    return { thick: a, thin: b, dt: s < ss ? b : a, scheme: s < ss ? 'thin' : 'thick' };
  }

  /* ---------- геометрия шва и расход ---------- */
  // Угловой шов по катету: F = K²/2, с учётом выпуклости — ×1,2.
  const areaFillet = (K, conv) => (K * K / 2) * (conv === undefined ? 1.2 : conv);
  // Число проходов углового шва по катету (практика).
  function passesFillet(K) {
    if (K <= 9) return 1;
    if (K <= 14) return 2;
    if (K <= 16) return 3;
    if (K <= 20) return 4;
    return Math.ceil(K / 5);
  }
  /* Стыковой шов с разделкой: F = F_разд + F_зазора + F_усиления.
     s — толщина, b — зазор, c — притупление, alphaDeg — угол раскрытия разделки,
     gRe — высота усиления, form — 'none' | 'V' | 'X'. */
  function areaButt(s, b, c, alphaDeg, gRe, form, gRoot) {
    const tg = Math.tan(alphaDeg * Math.PI / 360);   // tg(α/2)
    let Fg = 0, hV = 0, eW = 0;
    if (form === 'V') { hV = Math.max(s - c, 0); Fg = hV * hV * tg; eW = b + 2 * hV * tg + 3; }
    else if (form === 'X') { hV = Math.max((s - c) / 2, 0); Fg = 2 * hV * hV * tg; eW = b + 2 * hV * tg + 3; }
    else { hV = 0; Fg = 0; eW = b + Math.min(2 * s, 14); }
    const Fb = b * s;                                 // зазор
    const Fr = 0.73 * eW * gRe;                       // усиление лицевой стороны
    const Fr2 = form === 'X' || gRoot ? 0.73 * eW * (gRoot || 0) : 0;
    return { F: Fg + Fb + Fr + Fr2, Fgroove: Fg, Fgap: Fb, Freinf: Fr + Fr2, e: eW, h: hV, tg: tg };
  }
  // Масса наплавленного металла, кг: F [мм²] · L [м] · ρ [г/см³] / 1000.
  const massDeposit = (F_mm2, L_m, rho) => F_mm2 * L_m * (rho || RHO.steel) / 1000;
  // Скорость сварки из баланса наплавки: v [м/ч] = α_н·I/(ρ·F), F в см².
  const speedFromDeposit = (alphaN, I, F_mm2, rho) =>
    alphaN * I / ((rho || RHO.steel) * (F_mm2 / 100)) / 100;
  // Плотность тока в электроде/проволоке, А/мм².
  const currentDensity = (I, d) => I / (Math.PI * d * d / 4);
  /* Скорость подачи проволоки, м/ч: v_п = 4·α_н·I/(π·d²·ρ), d в мм.
     Размерность: α_н·I [г/ч] / ρ [г/см³] = [см³/ч]; делим на сечение проволоки
     π(d/10)²/4 [см²] — получаем см/ч; перевод в м/ч даёт как раз эту запись. */
  const wireFeed = (alphaN, I, d, rho) =>
    4 * alphaN * I / (Math.PI * d * d * (rho || RHO.steel));

  /* ---------- деформации ---------- */
  // Поперечное укорочение однопроходного шва: ΔW = α·q_п/(cγ·s), мм.
  const shrinkTrans = (q_Jmm, s) => STEEL.alpha * q_Jmm / (STEEL.cg * s);
  // Относительное продольное укорочение: ε = 0,3354·α·q_п/(cγ·A), A в мм².
  const shrinkLongRel = (q_Jmm, A_mm2) => 0.3354 * STEEL.alpha * q_Jmm / (STEEL.cg * A_mm2);
  // Усадочная сила: F_s = 0,3354·α·q_п·E/(cγ), Н.
  const shrinkForce = (q_Jmm) => 0.3354 * STEEL.alpha * q_Jmm * STEEL.E / STEEL.cg;
  // Стрела прогиба балки от эксцентричной усадочной силы: f = F_s·e·L²/(8·E·J).
  const camber = (Fs_N, e_mm, L_mm, J_mm4) => Fs_N * e_mm * L_mm * L_mm / (8 * STEEL.E * J_mm4);

  /* ---------- подбор режима РДС ---------- */
  // Диаметр покрытого электрода по толщине металла (практика РДС).
  const D_BY_S = [
    { s: 2,  d: [1.6, 2.0] }, { s: 3,  d: [2.0, 3.0] }, { s: 5,  d: [3.0, 4.0] },
    { s: 10, d: [4.0, 5.0] }, { s: 15, d: [5.0, 5.0] }, { s: 1e9, d: [5.0, 6.0] },
  ];
  function dBySmaw(s) {
    for (const r of D_BY_S) if (s <= r.s) return r.d;
    return [5, 6];
  }
  // Плотностный коэффициент k в формуле I = k·d, А/мм.
  function kByD(d) {
    if (d <= 2) return [25, 30];
    if (d <= 4) return [30, 45];
    return [45, 60];
  }

  return {
    f, plural, el, num, val, setHtml, out, bind, esc,
    STEEL, PROC, mid,
    heatInputEN, heatInputRU, heatInputCal, mhToMms,
    CEV, CET, Pcm, CE_GOST, preheatCET, preheatB, preheatBParts,
    hdScale, cevLimit,
    coolThick, coolThin, sStar, t85,
    areaFillet, passesFillet, areaButt, massDeposit,
    speedFromDeposit, currentDensity, wireFeed,
    shrinkTrans, shrinkLongRel, shrinkForce, camber,
    dBySmaw, kByD,
  };
})();
