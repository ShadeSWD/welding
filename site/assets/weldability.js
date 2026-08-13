/* weldability.js — углеродный эквивалент и скорость охлаждения ЗТВ. */
'use strict';
(function () {
  const W = window.W, f = W.f, num = W.num, val = W.val, el = W.el;
  const ELS = ['C', 'Si', 'Mn', 'Cr', 'Mo', 'Ni', 'Cu', 'V', 'B', 'P'];

  function comp() {
    const c = {};
    ELS.forEach((k) => { c[k] = num(k); });
    return c;
  }
  const p2 = (x) => f(x, 2).replace(',', ',');

  function recalcCE() {
    const c = comp(), grade = val('grade'), t = num('t');
    const cev = W.CEV(c), cet = W.CET(c), pcm = W.Pcm(c), ce = W.CE_GOST(c);

    W.out('o_cev', 'CEV = ',
      f(c.C, 3) + ' + ' + f(c.Mn, 2) + '/6 + (' + f(c.Cr, 2) + ' + ' + f(c.Mo, 2) + ' + ' +
      f(c.V, 2) + ')/5 + (' + f(c.Ni, 2) + ' + ' + f(c.Cu, 2) + ')/15',
      f(cev, 3),
      'Слагаемые: ' + f(c.C, 3) + ' + ' + f(c.Mn / 6, 3) + ' + ' +
      f((c.Cr + c.Mo + c.V) / 5, 3) + ' + ' + f((c.Ni + c.Cu) / 15, 3) + '.' +
      (c.B > 0 ? ' <b>Сталь содержит бор — формула CEV к ней неприменима.</b>' : ''));

    W.out('o_cet', 'CET = ',
      f(c.C, 3) + ' + (' + f(c.Mn, 2) + ' + ' + f(c.Mo, 2) + ')/10 + (' + f(c.Cr, 2) + ' + ' +
      f(c.Cu, 2) + ')/20 + ' + f(c.Ni, 2) + '/40', f(cet, 3),
      'Слагаемые: ' + f(c.C, 3) + ' + ' + f((c.Mn + c.Mo) / 10, 3) + ' + ' +
      f((c.Cr + c.Cu) / 20, 3) + ' + ' + f(c.Ni / 40, 3) + '.');

    W.out('o_pcm', 'P_cm = ',
      f(c.C, 3) + ' + ' + f(c.Si, 2) + '/30 + (' + f(c.Mn, 2) + ' + ' + f(c.Cu, 2) + ' + ' +
      f(c.Cr, 2) + ')/20 + ' + f(c.Ni, 2) + '/60 + ' + f(c.Mo, 2) + '/15 + ' + f(c.V, 2) +
      '/10 + 5 · ' + f(c.B, 4), f(pcm, 3),
      pcm <= 0.35 ? 'Ниже ориентировочного порога 0,35.' :
                    'Выше ориентировочного порога 0,35 — повышенная склонность к холодным трещинам.');

    W.out('o_gost', 'C_э = ',
      f(c.C, 3) + ' + ' + f(c.Mn, 2) + '/6 + ' + f(c.Si, 2) + '/24 + ' + f(c.Cr, 2) + '/5 + ' +
      f(c.Ni, 2) + '/40 + ' + f(c.Cu, 2) + '/13 + ' + f(c.V, 2) + '/14 + ' + f(c.P, 3) + '/2',
      f(ce, 3), 'Запись ГОСТ 27772; предельные значения в стандарте заданы по классам ' +
      'прочности проката (0,49 для С390, 0,51 для С440).');

    const lim = W.cevLimit(grade, t);
    const ok = cev <= lim + 1e-9;
    W.out('o_lim', 'CEV / [CEV] = ', f(cev, 3) + ' / ' + f(lim, 2),
      f(cev / lim, 3) + (ok ? ' — в пределах нормы' : ' — превышение'),
      'Категория ' + W.esc(el('grade').selectedOptions[0].text) + ', толщина ' + f(t, 0) +
      ' мм → предельное значение ' + f(lim, 2) + ' (Правила РМРС, часть XIII, табл. 3.2.2-3).');

    const Tp = W.preheatCET(cet);
    const TpFull = W.preheatB(cet, num('d'), num('hd'), num('qq'));
    W.out('o_tp', 'T_p^CET = ', '750 · ' + f(cet, 3) + ' − 150', f(Tp, 0) + ' °C',
      'Это первое слагаемое разложения, взятое отдельно: оценка «по одному только ' +
      'химическому составу», без учёта толщины, водорода и погонной энергии. ' +
      'Полный расчёт по уравнению C.8 при введённых выше d, H_D и Q даёт ' +
      f(TpFull, 0) + ' °C — разница ' + f(Math.abs(Tp - TpFull), 0) + ' °C.');

    W.setHtml('sum', [
      ['CEV', f(cev, 3)], ['CET', f(cet, 3)], ['P_cm', f(pcm, 3)],
      ['C_э (ГОСТ 27772)', f(ce, 3)],
      ['Предел CEV', f(lim, 2)],
      ['Оценка', ok ? 'в норме' : 'превышение'],
    ].map(([k, v]) => '<div class="cell"><span class="k">' + k + '</span><span class="v">' +
      v + '</span></div>').join(''));

    document.querySelectorAll('#tab_lim tbody tr').forEach((tr) => {
      tr.classList.toggle('on', tr.dataset.g === grade);
    });
    document.querySelectorAll('#tab_light tbody tr').forEach((tr) => {
      tr.classList.toggle('on', cev >= parseFloat(tr.dataset.lo) && cev < parseFloat(tr.dataset.hi));
    });
    recalcPreheat();
  }

  /* ---------- подогрев по методу B EN 1011-2 ---------- */
  function recalcPreheat() {
    const cet = W.CET(comp());
    const d = num('d'), hd = num('hd'), Q = num('qq'), wt = val('wtype');
    const Tp = W.preheatB(cet, d, hd, Q);
    const p = W.preheatBParts(cet, d, hd, Q);

    W.out('o_tpB', 'T_p = ',
      '697 · ' + f(cet, 3) + ' + 160 · th(' + f(d, 0) + '/35) + 62 · ' + f(hd, 1) +
      '^0,35 + (53 · ' + f(cet, 3) + ' − 32) · ' + f(Q, 2) + ' − 328',
      f(Tp, 0) + ' °C',
      (Tp <= 20 ? 'Подогрев по методу B не требуется. '
                : 'Требуется подогрев не ниже ' + f(Math.ceil(Tp / 5) * 5, 0) + ' °C. ') +
      (wt === 'fillet'
        ? 'Для однопроходного углового шва стандарт указывает, что температура, найденная ' +
          'для стыкового шва, завышена примерно на 60 °C: ориентир ' + f(Tp - 60, 0) + ' °C.'
        : 'Расчёт относится к стыковому шву.'));

    W.out('o_p1', 'T_p^CET = ', '750 · ' + f(cet, 3) + ' − 150', f(p.cet, 0) + ' °C',
      'Каждая сотая доля процента CET добавляет 7,5 °C.');
    W.out('o_p2', 'T_p^d = ', '160 · th(' + f(d, 0) + '/35) − 110', f(p.d, 0) + ' °C',
      'Гиперболический тангенс насыщается: свыше примерно 60 мм дальнейший рост толщины ' +
      'почти не влияет на требуемый подогрев.');
    const sc = W.hdScale(hd);
    W.out('o_p3', 'T_p^H = ', '62 · ' + f(hd, 1) + '^0,35 − 100', f(p.hd, 0) + ' °C',
      'Шкала водорода по табл. C.2: ' + sc.txt + ' мл/100 г.');
    W.out('o_p4', 'T_p^Q = ', '(53 · ' + f(cet, 3) + ' − 32) · ' + f(Q, 2) + ' − 53 · ' +
      f(cet, 3) + ' + 32', f(p.q, 0) + ' °C',
      'Коэффициент при Q отрицателен при CET < 0,604 — рост погонной энергии снижает ' +
      'требуемый подогрев, потому что замедляет охлаждение.');

    const sum = p.cet + p.d + p.hd + p.q;
    const chk = [];
    const bad = (c, t) => { if (!c) chk.push(t); };
    bad(cet >= 0.2 && cet <= 0.5, 'CET = ' + f(cet, 3) + ' вне диапазона 0,2…0,5 %');
    bad(d >= 10 && d <= 90, 'толщина ' + f(d, 0) + ' мм вне диапазона 10…90 мм');
    bad(hd >= 1 && hd <= 20, 'H_D = ' + f(hd, 1) + ' вне диапазона 1…20 мл/100 г');
    bad(Q >= 0.5 && Q <= 4, 'Q = ' + f(Q, 2) + ' вне диапазона 0,5…4,0 кДж/мм');
    const sgn = (x) => (x < 0 ? '− ' + f(-x, 1) : '+ ' + f(x, 1));
    W.out('o_pchk', 'сумма C.3…C.6 = ', f(p.cet, 1) + ' ' + sgn(p.d) + ' ' + sgn(p.hd) +
      ' ' + sgn(p.q), f(sum, 0) + ' °C — совпадает с C.8',
      chk.length ? '<b>Выход за область применимости:</b> ' + chk.join('; ') +
        '. Формула построена для сталей с пределом текучести до 1000 Н/мм².'
        : 'Все входные величины в области применимости метода B (предел текучести стали ' +
          'до 1000 Н/мм², CET 0,2…0,5 %, толщина 10…90 мм, H_D 1…20 мл/100 г, Q 0,5…4,0 кДж/мм).');

    document.querySelectorAll('#tab_hd tbody tr').forEach((tr) => {
      tr.classList.toggle('on', tr.dataset.k === sc.k);
    });
    drawParts(p, Tp);
  }

  /* Столбиковая диаграмма вкладов. */
  function drawParts(p, Tp) {
    const items = [
      ['состав, CET', p.cet], ['толщина d', p.d],
      ['водород H_D', p.hd], ['энергия Q', p.q], ['итого T_p', Tp],
    ];
    const y0 = 140, x0 = 60, bw = 84, gap = 30;
    const maxAbs = Math.max(60, ...items.map((i) => Math.abs(i[1])));
    const sc = 70 / maxAbs;
    const g = [];
    const cap = (x, y, t, cls, an) => '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y +
      '"' + (an ? ' text-anchor="' + an + '"' : '') + '>' + t + '</text>';
    g.push('<line class="ln-axis" x1="30" y1="' + y0 + '" x2="614" y2="' + y0 + '"/>');
    items.forEach((it, i) => {
      const x = x0 + i * (bw + gap);
      const h = it[1] * sc;
      const yTop = h >= 0 ? y0 - h : y0;
      const col = i === 4 ? '#b45309' : (it[1] >= 0 ? '#b3382e' : '#1a7f37');
      g.push('<rect x="' + x + '" y="' + yTop.toFixed(1) + '" width="' + bw + '" height="' +
        Math.abs(h).toFixed(1) + '" fill="' + col + '" opacity="0.45" stroke="' + col +
        '" stroke-width="1.4"/>');
      g.push(cap(x + bw / 2, (h >= 0 ? yTop - 6 : yTop + Math.abs(h) + 14).toFixed(1),
        f(it[1], 0) + ' °C', i === 4 ? 'b' : (it[1] >= 0 ? 'red' : 'green'), 'middle'));
      g.push(cap(x + bw / 2, 244, it[0], 'gray', 'middle'));
    });
    g.push(cap(30, 22, 'Вклады в требуемую температуру подогрева (C.3–C.6) и итог (C.8)', 'b'));
    g.push(cap(30, 38, 'зелёным — вклады, снижающие требуемый подогрев', 'green'));
    el('board3').innerHTML = g.join('');
  }

  /* ---------- скорость охлаждения ---------- */
  function recalcCool() {
    const qk = num('q'), q = qk * 1000, s = num('s'), T0 = num('T0'), T = num('T');
    const lam = num('lam'), cg = num('cg');
    const wThick = W.coolThick(q, T, T0, lam);
    const wThin = W.coolThin(q, T, T0, s, lam, cg);
    const ss = W.sStar(q, T, T0, cg);
    const thin = s < ss;
    const w = thin ? wThin : wThick;

    W.out('o_sstar', 's* = ', '√(' + f(q, 0) + ' / (' + f(cg, 4) + ' · (' + f(T, 0) + ' − ' +
      f(T0, 0) + ')))', f(ss, 1) + ' мм',
      'Толщина ' + f(s, 1) + ' мм ' + (thin ? 'меньше' : 'больше') + ' граничной → ' +
      (thin ? 'схема пластины' : 'схема массивного тела') + '.');

    W.out('o_wthick', 'ω = ', '2π · ' + f(lam, 3) + ' · (' + f(T, 0) + ' − ' + f(T0, 0) +
      ')² / ' + f(q, 0), f(wThick, 2) + ' °C/с');

    W.out('o_wthin', 'ω = ', '2π · ' + f(lam, 3) + ' · ' + f(cg, 4) + ' · (' + f(T, 0) + ' − ' +
      f(T0, 0) + ')³ / (' + f(q, 0) + '/' + f(s, 1) + ')²', f(wThin, 2) + ' °C/с');

    W.out('o_w', 'ω = ', 'min(' + f(wThick, 2) + '; ' + f(wThin, 2) + ')', f(w, 2) + ' °C/с',
      'Скорость охлаждения при ' + f(T, 0) + ' °C. Подогрев до ' + f(T0, 0) +
      ' °C уже учтён: он входит в разность (T − T₀).');

    const tt = W.t85(q, T0, s, lam, cg);
    W.out('o_t85', 'Δt_8/5 = ',
      thin ? '(' + f(q, 0) + '/' + f(s, 1) + ')² / (4π · ' + f(lam, 3) + ' · ' + f(cg, 4) +
             ') · [1/(500 − ' + f(T0, 0) + ')² − 1/(800 − ' + f(T0, 0) + ')²]'
           : f(q, 0) + ' / (2π · ' + f(lam, 3) + ') · [1/(500 − ' + f(T0, 0) + ') − 1/(800 − ' +
             f(T0, 0) + ')]',
      f(tt.dt, 1) + ' с',
      'Вторая схема дала бы ' + f(thin ? tt.thick : tt.thin, 1) + ' с. Чем больше Δt_8/5, ' +
      'тем мягче термический цикл и тем меньше вероятность закалочных структур.');

    drawCool(q, s, T0, lam, cg, thin, w, T, tt.dt);
  }

  /* Кривая охлаждения T(t) по выбранной схеме. */
  function drawCool(q, s, T0, lam, cg, thin, w, Tmark, dt85) {
    const x0 = 62, x1 = 610, y0 = 250, y1 = 34;
    const Tmax = 1500;
    // t(T): из интегрирования 1/ω
    const tOf = (T) => thin
      ? Math.pow(q / s, 2) / (4 * Math.PI * lam * cg) * (1 / Math.pow(T - T0, 2))
      : q / (2 * Math.PI * lam) * (1 / (T - T0));
    const tRef = tOf(1500);
    const tEnd = Math.max(tOf(300) - tRef, 1);
    const X = (t) => x0 + (x1 - x0) * Math.min(1, t / tEnd);
    const Y = (T) => y0 - (y0 - y1) * (T - T0) / (Tmax - T0);
    const g = [];
    const cap = (x, y, t, cls, an) => '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y +
      '"' + (an ? ' text-anchor="' + an + '"' : '') + '>' + t + '</text>';
    // оси
    g.push('<line class="ln-axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '"/>');
    g.push('<line class="ln-axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '"/>');
    g.push(cap(x1, y0 + 18, 'время, с', 'gray', 'end'));
    g.push(cap(x0 - 6, y1 - 8, 'T, °C', 'gray', 'start'));
    [200, 500, 800, 1100, 1400].forEach((T) => {
      if (T <= T0) return;
      g.push('<line class="ln-link" x1="' + x0 + '" y1="' + Y(T) + '" x2="' + x1 + '" y2="' + Y(T) + '"/>');
      g.push(cap(x0 - 6, Y(T) + 4, String(T), 'gray', 'end'));
    });
    // кривая
    const pts = [];
    for (let i = 0; i <= 220; i++) {
      const T = Tmax - i * (Tmax - Math.max(T0 + 20, 250)) / 220;
      const t = tOf(T) - tRef;
      if (t > tEnd) break;
      pts.push(X(t).toFixed(1) + ',' + Y(T).toFixed(1));
    }
    g.push('<polyline class="ln red" points="' + pts.join(' ') + '" stroke-width="2.2"/>');
    // полоса 800–500
    const xa = X(tOf(800) - tRef), xb = X(tOf(500) - tRef);
    g.push('<rect x="' + xa + '" y="' + Y(800) + '" width="' + Math.max(1, xb - xa) + '" height="' +
      (Y(500) - Y(800)) + '" fill="rgba(21,94,117,.12)" stroke="#155e75" stroke-width="1"/>');
    g.push('<line class="ln-dim" x1="' + xa + '" y1="' + (Y(500) + 22) + '" x2="' + xb + '" y2="' + (Y(500) + 22) + '"/>');
    g.push(cap(Math.min(x1 - 4, (xa + xb) / 2), Y(500) + 38,
      'Δt 800→500 = ' + f(dt85, 1) + ' с', 'blue', 'middle'));
    // отметка температуры расчёта
    if (Tmark > T0 + 10 && Tmark < Tmax) {
      const xm = X(tOf(Tmark) - tRef);
      g.push('<circle class="pt green" cx="' + xm + '" cy="' + Y(Tmark) + '" r="4"/>');
      g.push(cap(Math.min(x1 - 4, xm + 8), Y(Tmark) - 6,
        'ω(' + f(Tmark, 0) + ' °C) = ' + f(w, 2) + ' °C/с', 'green'));
    }
    // линия подогрева
    if (T0 > 20) {
      g.push('<line class="ln-thin ln-dash gray" x1="' + x0 + '" y1="' + Y(T0) + '" x2="' + x1 + '" y2="' + Y(T0) + '"/>');
      g.push(cap(x1 - 4, Y(T0) - 6, 'подогрев T₀ = ' + f(T0, 0) + ' °C', 'gray', 'end'));
    }
    g.push(cap(x0 + 6, y1 + 4, (thin ? 'схема пластины' : 'схема массивного тела') +
      ', s = ' + f(s, 1) + ' мм', 'gray'));
    el('board2').innerHTML = g.join('');
  }

  W.bind('in3', recalcPreheat);
  W.bind('in', recalcCE);
  W.bind('in2', recalcCool);
})();
