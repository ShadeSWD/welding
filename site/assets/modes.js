/* modes.js — живой подбор режима дуговой сварки. */
'use strict';
(function () {
  const W = window.W;
  const f = W.f, num = W.num, val = W.val, el = W.el;

  // Практический предел сечения одного прохода, мм² (нормативный потолок — 100 мм²).
  const F1MAX = { smaw: 40, gmaw: 45, saw: 100, fcaw: 60, gtaw: 25 };
  // Типовая плотность тока для проволоки, А/мм².
  const JTYP = { gmaw: 130, fcaw: 110, saw: 45 };
  const POS = { down: 'нижнее', horiz: 'горизонтальное', vert: 'вертикальное', over: 'потолочное' };

  /* ---------- геометрия сечения по толщине ---------- */
  function grooveOf(s) {
    if (s <= 5) return { form: 'none', alpha: 0, c: s, b: 1.5, g: 1.5, gr: 0, name: 'без скоса кромок' };
    if (s <= 12) return { form: 'V', alpha: 60, c: 2, b: 2, g: 2, gr: 0, name: 'V-образная, угол раскрытия 60°' };
    return { form: 'X', alpha: 60, c: 2, b: 2, g: 2, gr: 2, name: 'X-образная (двусторонняя), угол раскрытия 60°' };
  }
  function section() {
    const s = num('s'), joint = val('joint'), K = num('K');
    if (joint === 'fillet') {
      const F = W.areaFillet(K);
      return { F: F, name: 'угловой шов с катетом ' + f(K, 1) + ' мм', gr: null,
               expl: 'F = 1,2 · K²/2 = 1,2 · ' + f(K, 1) + '²/2 = ' + f(F, 1) + ' мм²' };
    }
    const gr = grooveOf(s);
    const a = W.areaButt(s, gr.b, gr.c, gr.alpha, gr.g, gr.form, gr.gr);
    return { F: a.F, name: 'стыковой шов, разделка ' + gr.name, gr: gr, a: a,
             expl: 'F = ' + f(a.Fgroove, 1) + ' (разделка) + ' + f(a.Fgap, 1) +
                   ' (зазор) + ' + f(a.Freinf, 1) + ' (усиление) = ' + f(a.F, 1) + ' мм²' };
  }

  /* ---------- автоподбор ---------- */
  function suggestD(proc, s) {
    if (proc === 'smaw') return W.dBySmaw(s)[0];
    if (proc === 'gmaw') return s <= 3 ? 1.0 : s <= 8 ? 1.2 : 1.6;
    if (proc === 'fcaw') return s <= 6 ? 1.2 : 1.6;
    if (proc === 'saw') return s <= 10 ? 3 : s <= 20 ? 4 : 5;
    return s <= 3 ? 1.6 : s <= 8 ? 2.4 : 3.0;   // присадка TIG
  }
  function corrections(proc, s, d, joint, pos) {
    const c = [];
    if (s > 3 * d) c.push({ k: 1.12, why: 's > 3d — массивные кромки, +12 %' });
    else if (s < 1.5 * d) c.push({ k: 0.88, why: 's < 1,5d — риск прожога, −12 %' });
    if (joint === 'fillet') c.push({ k: 1.12, why: 'угловой шов, +12 %' });
    if (pos === 'vert' || pos === 'over') c.push({ k: 0.88, why: POS[pos] + ' положение, −12 %' });
    return c;
  }
  function suggestI(proc, d, s) {
    if (proc === 'smaw') return W.mid(W.kByD(d)) * d;
    if (proc === 'gtaw') return Math.max(40, Math.min(300, 30 * s));
    return JTYP[proc] * Math.PI * d * d / 4;
  }
  function suggestU(proc, I) {
    const p = W.PROC[proc];
    let U;
    if (proc === 'smaw') U = W.mid(p.uTyp);
    else if (proc === 'gtaw') U = W.mid(p.uTyp);
    else if (proc === 'saw') U = 23 + 27 * Math.log(Math.max(I, 150) / 150) / Math.log(10);
    else U = 20 + 0.04 * I;
    return Math.max(p.uRange[0], Math.min(p.uRange[1], U));
  }
  function doAuto() {
    const proc = val('proc'), s = num('s'), joint = val('joint'), pos = val('pos');
    const d = suggestD(proc, s);
    el('d').value = f(d, 1).replace(',', '.');
    let I = suggestI(proc, d, s);
    corrections(proc, s, d, joint, pos).forEach((c) => { I *= c.k; });
    el('I').value = Math.round(I / 5) * 5;
    const U = suggestU(proc, I);
    el('U').value = Math.round(U * 2) / 2;
    // скорость — из баланса наплавки
    const sec = section();
    const n = Math.max(1, Math.ceil(sec.F / F1MAX[proc]));
    const aN = W.mid(W.PROC[proc].alphaN);
    let v = W.speedFromDeposit(aN, I, sec.F / n);
    const vr = W.PROC[proc].vRange;
    v = Math.max(vr[0], Math.min(vr[1], v));
    el('v').value = Math.round(v * 10) / 10;
    recalc();
  }

  /* ---------- основной пересчёт ---------- */
  function recalc() {
    const proc = val('proc'), p = W.PROC[proc];
    const s = num('s'), joint = val('joint'), pos = val('pos'), base = val('base');
    const d = num('d'), I = num('I'), U = num('U'), v_mh = num('v');
    const v = W.mhToMms(v_mh);
    el('K').closest('label').style.display = joint === 'fillet' ? '' : 'none';

    /* диаметр */
    const rec = suggestD(proc, s);
    W.out('o_d', 'd = ', 'толщина ' + f(s, 1) + ' мм → рекомендуется ' + f(rec, 1) + ' мм',
      f(d, 1) + ' мм',
      proc === 'smaw' ? 'Для РДС — по таблице «диаметр электрода по толщине металла».'
        : 'Для проволоки диаметр выбирают по толщине и требуемой производительности; ' +
          'проверкой служит плотность тока.');

    /* ток */
    const corr = corrections(proc, s, d, joint, pos);
    let base_I, leadI;
    if (proc === 'smaw') {
      const kd = W.kByD(d), kdm = W.mid(kd);
      base_I = kdm * d;
      leadI = f(kdm, 1) + ' · ' + f(d, 1);
    } else if (proc === 'gtaw') {
      base_I = suggestI(proc, d, s);
      leadI = '30 · ' + f(s, 1) + ' (оценка по толщине)';
    } else {
      base_I = JTYP[proc] * Math.PI * d * d / 4;
      leadI = f(JTYP[proc], 0) + ' · π · ' + f(d, 1) + '²/4';
    }
    let Ical = base_I, ctxt = '';
    corr.forEach((c) => { Ical *= c.k; ctxt += ' · ' + f(c.k, 2); });
    W.out('o_I', 'I = ', leadI + ctxt, f(Ical, 0) + ' А (в расчёте принято ' + f(I, 0) + ' А)',
      corr.length ? 'Поправки: ' + corr.map((c) => c.why).join('; ') + '.'
                  : 'Поправок нет: стыковой шов в нижнем положении, 1,5d ≤ s ≤ 3d.');

    /* плотность тока */
    const j = W.currentDensity(I, d);
    let jNote = '';
    if (proc === 'gmaw' || proc === 'fcaw') {
      jNote = j < 50 ? 'Ниже рабочего диапазона 50–250 А/мм² — дуга будет гореть неустойчиво.'
        : j <= 250 ? 'В рабочем диапазоне 50–250 А/мм².'
        : j <= 450 ? 'Форсированный режим (250–450 А/мм²) — допустим, но требует контроля вылета.'
        : 'Выше 450 А/мм² — проволока перегревается по вылету.';
    } else {
      jNote = 'Нормативный диапазон плотности тока в использованных источниках задан только для механизированной сварки плавящейся проволокой; здесь величина приведена справочно.';
    }
    W.out('o_j', 'j = ', '4 · ' + f(I, 0) + ' / (π · ' + f(d, 1) + '²)', f(j, 1) + ' А/мм²', jNote);

    /* скорость */
    W.out('o_v', 'v = ', f(v_mh, 2) + ' / 3,6', f(v, 3) + ' мм/с',
      'Та же скорость: ' + f(v_mh * 1000 / 60, 1) + ' мм/мин.');

    /* погонная энергия */
    const k = p.k, eta = W.mid(p.eta);
    const Qen = W.heatInputEN(k, U, I, v);
    const Qru = W.heatInputRU(eta, U, I, v);
    const Q = base === 'en' ? Qen : Qru;
    const coef = base === 'en' ? k : eta;
    const cname = base === 'en' ? 'k' : 'η';
    W.out('o_Q', 'Q = ', cname + ' = ' + f(coef, 2) + ': ' + f(coef, 2) + ' · ' + f(U, 1) +
      ' · ' + f(I, 0) + ' / ' + f(v, 3) + ' / 1000',
      f(Q, 3) + ' кДж/мм = ' + f(Q * 1000, 0) + ' Дж/мм',
      'По второй базе получилось бы ' + f(base === 'en' ? Qru : Qen, 3) + ' кДж/мм ' +
      '(' + (base === 'en' ? 'η = ' + f(eta, 2) : 'k = ' + f(k, 2)) + ').');

    const v_cms = v / 10;
    const qcal = W.heatInputCal(eta, U, I, v_cms);
    W.out('o_Qcal', 'q_п = ', '0,24 · ' + f(I, 0) + ' · ' + f(U, 1) + ' · ' + f(eta, 2) +
      ' / ' + f(v_cms, 4), f(qcal, 0) + ' кал/см',
      'Обратный перевод: ' + f(qcal, 0) + ' · 0,41868 = ' + f(qcal * 0.41868, 0) + ' Дж/мм.');

    /* сечение и проходы */
    const sec = section();
    const n = Math.max(1, Math.ceil(sec.F / F1MAX[proc]));
    const F1 = sec.F / n;
    W.out('o_F', 'F = ', sec.expl.replace(/^F = /, ''),
      f(sec.F, 1) + ' мм², проходов n = ' + n + ', на проход F₁ = ' + f(F1, 1) + ' мм²',
      'Число проходов: F / F₁max = ' + f(sec.F, 1) + ' / ' + F1MAX[proc] + ' → округление вверх. ' +
      'Практический предел сечения прохода для этого способа принят ' + F1MAX[proc] +
      ' мм² при нормативном потолке 100 мм².');

    const aN = W.mid(p.alphaN);
    const vBal = W.speedFromDeposit(aN, I, F1);
    W.out('o_vcalc', 'v = ', f(aN, 1) + ' · ' + f(I, 0) + ' / (3600 · 7,85 · ' + f(F1 / 100, 4) + ')',
      f(vBal * 100 / 3600, 4) + ' см/с = ' + f(vBal, 2) + ' м/ч',
      'Коэффициент наплавки для этого способа α_н = ' + f(p.alphaN[0], 1) + '…' +
      f(p.alphaN[1], 1) + ' г/(А·ч), принято среднее. Введённая скорость ' + f(v_mh, 2) +
      ' м/ч отличается на ' + f(Math.abs(v_mh - vBal) / vBal * 100, 0) + ' %.');

    /* сводка */
    W.setHtml('sum', [
      ['Погонная энергия', f(Q, 3) + ' кДж/мм'],
      ['Ток', f(I, 0) + ' А'],
      ['Напряжение', f(U, 1) + ' В'],
      ['Скорость', f(v_mh, 1) + ' м/ч'],
      ['Проходов', String(n)],
      ['Плотность тока', f(j, 0) + ' А/мм²'],
    ].map(([kk, vv]) => '<div class="cell"><span class="k">' + kk + '</span><span class="v">' +
      vv + '</span></div>').join(''));

    /* проверки */
    const ch = [];
    const badge = (ok, t) => '<span class="badge ' + (ok ? 'ok' : 'bad') + '">' + t + '</span>';
    if (proc === 'gmaw' || proc === 'fcaw')
      ch.push(badge(j >= 50 && j <= 450, 'плотность тока ' + f(j, 0) + ' А/мм²'));
    ch.push(badge(U >= p.uRange[0] && U <= p.uRange[1],
      'напряжение в диапазоне ' + p.uRange[0] + '–' + p.uRange[1] + ' В'));
    ch.push(badge(F1 <= 100, 'сечение прохода ' + f(F1, 0) + ' мм² ≤ 100 мм²'));
    if (proc === 'smaw')
      ch.push(badge(d >= 1.6 && d <= 6, 'диаметр электрода ' + f(d, 1) + ' мм'));
    ch.push(badge(v_mh >= p.vRange[0] && v_mh <= p.vRange[1],
      'скорость в типовом диапазоне ' + p.vRange[0] + '–' + p.vRange[1] + ' м/ч'));
    if (p.gas) ch.push('<span class="badge ok">защитный газ ' + p.gas[0] + '–' + p.gas[1] + ' л/мин</span>');
    if (proc === 'smaw')
      ch.push('<span class="badge ok">длина дуги ' + f(0.5 * d, 1) + '–' + f(1.1 * d, 1) + ' мм</span>');
    W.setHtml('checks', '<div class="controls" style="gap:6px 8px">' + ch.join(' ') + '</div>' +
      '<div class="small" style="margin-top:6px">' + W.esc(p.name) +
      ', номер процесса по ISO 4063 — ' + p.iso + '. ' + W.esc(sec.name) + '.</div>');

    /* таблица диаметров: подсветка строки */
    document.querySelectorAll('#tab_d tbody tr').forEach((tr) => {
      tr.classList.toggle('on', s <= parseFloat(tr.dataset.smax) &&
        (tr.previousElementSibling ? s > parseFloat(tr.previousElementSibling.dataset.smax) : true));
    });

    draw(s, d, joint, num('K'), sec, n, proc);
  }

  /* ---------- схема ---------- */
  function draw(s, d, joint, K, sec, n, proc) {
    const H = 300, cx = 320, yTop = 186;
    let sc = 70 / Math.max(s, 1);
    sc = Math.max(2.2, Math.min(22, sc));
    const S = s * sc, D = Math.max(4, d * sc);
    const g = [];
    const cap = (x, y, t, cls, anchor) =>
      '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + t + '</text>';

    if (joint === 'fillet') {
      const Kp = Math.max(6, K * sc);
      // горизонтальная полка
      g.push('<rect class="fill-steel" x="90" y="' + yTop + '" width="460" height="' + S + '" stroke="#16161a" stroke-width="1.6"/>');
      // вертикальная стенка
      g.push('<rect class="fill-steel" x="' + (cx - S / 2) + '" y="' + Math.max(40, yTop - 120) + '" width="' + S + '" height="' + (yTop - Math.max(40, yTop - 120)) + '" stroke="#16161a" stroke-width="1.6"/>');
      // два угловых шва
      [-1, 1].forEach((sg) => {
        const x0 = cx + sg * S / 2;
        g.push('<path class="fill-weld" d="M ' + x0 + ' ' + yTop + ' L ' + (x0 + sg * Kp) + ' ' + yTop +
          ' Q ' + (x0 + sg * Kp * 0.45) + ' ' + (yTop - Kp * 0.45) + ' ' + x0 + ' ' + (yTop - Kp) +
          ' Z" stroke="#b3382e" stroke-width="1.6"/>');
      });
      g.push('<line class="ln-dim" x1="' + (cx + S / 2) + '" y1="' + (yTop + 26) + '" x2="' + (cx + S / 2 + Kp) + '" y2="' + (yTop + 26) + '"/>');
      g.push(cap(cx + S / 2 + Kp / 2, yTop + 40, 'K = ' + f(K, 1) + ' мм', 'red', 'middle'));
      g.push(cap(150, yTop - 10, 'полка', 'gray'));
      g.push(cap(cx + S / 2 + 10, 80, 'стенка набора', 'gray'));
    } else {
      const gr = sec.gr, b = gr.b * sc;
      const tgv = Math.tan(gr.alpha * Math.PI / 360);
      const cP = gr.c * sc, hP = (gr.form === 'X' ? (S - cP) / 2 : S - cP);
      const open = gr.form === 'none' ? 0 : hP * tgv;
      const yBot = yTop + S;
      // левая и правая кромки с разделкой
      const edge = (sg) => {
        const x = cx + sg * b / 2;
        if (gr.form === 'none')
          return 'M ' + x + ' ' + yTop + ' L ' + x + ' ' + yBot + ' L ' + (cx + sg * 260) + ' ' + yBot +
                 ' L ' + (cx + sg * 260) + ' ' + yTop + ' Z';
        if (gr.form === 'V')
          return 'M ' + (x + sg * open) + ' ' + yTop + ' L ' + x + ' ' + (yTop + hP) + ' L ' + x + ' ' + yBot +
                 ' L ' + (cx + sg * 260) + ' ' + yBot + ' L ' + (cx + sg * 260) + ' ' + yTop + ' Z';
        return 'M ' + (x + sg * open) + ' ' + yTop + ' L ' + x + ' ' + (yTop + hP) + ' L ' + x + ' ' + (yBot - hP) +
               ' L ' + (x + sg * open) + ' ' + yBot + ' L ' + (cx + sg * 260) + ' ' + yBot +
               ' L ' + (cx + sg * 260) + ' ' + yTop + ' Z';
      };
      g.push('<path class="fill-steel" d="' + edge(-1) + '" stroke="#16161a" stroke-width="1.6"/>');
      g.push('<path class="fill-steel" d="' + edge(1) + '" stroke="#16161a" stroke-width="1.6"/>');
      // наплавленный металл
      const gRe = gr.g * sc, eW = (sec.a ? sec.a.e : 8) * sc;
      const weld = gr.form === 'none'
        ? 'M ' + (cx - b / 2) + ' ' + yTop + ' L ' + (cx + b / 2) + ' ' + yTop + ' L ' + (cx + b / 2) + ' ' + yBot +
          ' L ' + (cx - b / 2) + ' ' + yBot + ' Z'
        : 'M ' + (cx - b / 2 - open) + ' ' + yTop + ' L ' + (cx - b / 2) + ' ' + (yTop + hP) +
          ' L ' + (cx + b / 2) + ' ' + (yTop + hP) + ' L ' + (cx + b / 2 + open) + ' ' + yTop + ' Z';
      g.push('<path class="fill-weld" d="' + weld + '" stroke="#b3382e" stroke-width="1.4"/>');
      g.push('<path class="fill-weld" d="M ' + (cx - eW / 2) + ' ' + yTop + ' Q ' + cx + ' ' + (yTop - 2 * gRe) +
        ' ' + (cx + eW / 2) + ' ' + yTop + ' Z" stroke="#b3382e" stroke-width="1.4"/>');
      // размеры
      g.push('<line class="ln-dim" x1="70" y1="' + yTop + '" x2="70" y2="' + yBot + '"/>');
      g.push(cap(64, (yTop + yBot) / 2 + 4, 's = ' + f(s, 1) + ' мм', 'blue', 'end'));
      g.push(cap(cx, yBot + 20, 'зазор b = ' + f(gr.b, 1) + ' мм, притупление c = ' + f(gr.c, 1) + ' мм', 'gray', 'middle'));
      g.push('<line class="ln-thin gray" x1="' + (cx - eW / 2) + '" y1="' + (yTop - gRe) +
        '" x2="' + Math.max(96, cx - eW / 2 - 40) + '" y2="' + (yTop - gRe - 24) + '"/>');
      g.push(cap(Math.max(94, cx - eW / 2 - 42), yTop - gRe - 28,
        'усиление g = ' + f(gr.g, 1) + ' мм, разделка ' + f(gr.alpha, 0) + '°', 'red', 'end'));
    }

    // электрод и дуга
    const arc = Math.max(8, (proc === 'smaw' ? 0.8 * d : 3) * sc);
    const ex = cx, ey = yTop - arc;
    const ang = 15 * Math.PI / 180, len = 110;
    const ux = Math.sin(ang), uy = -Math.cos(ang);
    const x2 = ex + ux * len, y2 = Math.max(24, ey + uy * len);
    g.push('<line x1="' + ex + '" y1="' + ey + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="#6b6b74" stroke-width="' + Math.min(26, D) + '" stroke-linecap="butt"/>');
    g.push('<line x1="' + ex + '" y1="' + ey + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="#16161a" stroke-width="' + Math.min(26, D) + '" stroke-linecap="butt" fill="none" opacity="0.25"/>');
    g.push('<path d="M ' + (ex - arc * 0.5) + ' ' + yTop + ' Q ' + ex + ' ' + (ey - arc * 0.3) + ' ' +
      (ex + arc * 0.5) + ' ' + yTop + ' Z" fill="#b45309" opacity="0.55"/>');
    g.push('<line class="ln-dim" x1="' + (ex + 54) + '" y1="' + ey + '" x2="' + (ex + 54) + '" y2="' + yTop + '"/>');
    g.push(cap(ex + 60, (ey + yTop) / 2 + 4, 'длина дуги', 'red'));
    g.push(cap(Math.min(560, x2 + 18), y2 + 14, 'электрод d = ' + f(d, 1) + ' мм', 'gray'));
    // стрелка скорости
    g.push('<line class="ln-dim" x1="' + (cx - 150) + '" y1="34" x2="' + (cx - 40) + '" y2="34"/>');
    g.push(cap(cx - 150, 24, 'направление сварки, v = ' + f(num('v'), 1) + ' м/ч', 'blue'));
    g.push(cap(20, 292, 'проходов: ' + n + ' · сечение наплавки ' + f(sec.F, 1) + ' мм²', 'gray'));

    el('board').innerHTML = g.join('');
  }

  el('auto').addEventListener('click', doAuto);
  ['proc', 's', 'joint', 'pos'].forEach((id) => {
    el(id).addEventListener('change', () => { if (id !== 's') doAuto(); });
  });
  W.bind('in', recalc);
})();
