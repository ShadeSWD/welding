/* consumption.js — расход сварочных материалов, время и электроэнергия. */
'use strict';
(function () {
  const W = window.W, f = W.f, num = W.num, val = W.val, el = W.el;
  const F1MAX = { smaw: 40, gmaw: 45, saw: 100, fcaw: 60, gtaw: 25 };
  const DEF = {   // значения, подставляемые при смене способа сварки
    smaw: { d: 4, an: 9, kel: 1.65, kp: 0.52, qg: 0, I: 150, U: 25 },
    gmaw: { d: 1.2, an: 13, kel: 1.06, kp: 0.585, qg: 15, I: 200, U: 28 },
    saw:  { d: 4, an: 18, kel: 1.025, kp: 0.65, qg: 0, I: 600, U: 36 },
    fcaw: { d: 1.6, an: 18, kel: 1.30, kp: 0.575, qg: 16, I: 250, U: 30 },
    gtaw: { d: 2.4, an: 7, kel: 1.015, kp: 0.52, qg: 10, I: 130, U: 12.5 },
  };

  function geom() {
    const joint = val('joint');
    if (joint === 'fillet') {
      const K = num('K');
      return { joint: joint, K: K, F: W.areaFillet(K), n: W.passesFillet(K) };
    }
    const s = num('s'), form = val('form'), alpha = num('alpha'), c = num('c'),
      b = num('b'), g = num('g');
    const a = W.areaButt(s, b, c, alpha, g, form, form === 'X' ? g : 0);
    const proc = val('proc');
    return { joint: joint, s: s, form: form, alpha: alpha, c: c, b: b, g: g, a: a,
             F: a.F, n: Math.max(1, Math.ceil(a.F / F1MAX[proc])) };
  }

  function recalc() {
    const proc = val('proc'), G = geom();
    const L = num('L'), I = num('I'), U = num('U'), d = num('d'), an = num('an');
    const kel = num('kel'), kp = num('kp'), qg = num('qg'), kfl = num('kfl');
    const rho = num('rho'), eff = num('eff'), pxx = num('pxx');
    const fillet = G.joint === 'fillet';

    // видимость полей
    el('K').closest('label').style.display = fillet ? '' : 'none';
    ['s', 'form', 'alpha', 'c', 'b', 'g'].forEach((id) => {
      el(id).closest('label').style.display = fillet ? 'none' : '';
    });
    const none = val('form') === 'none';
    if (!fillet) ['alpha', 'c'].forEach((id) => {
      el(id).closest('label').style.display = none ? 'none' : '';
    });
    el('qg').closest('label').style.display = W.PROC[proc].gas ? '' : 'none';
    el('kfl').closest('label').style.display = proc === 'saw' ? '' : 'none';

    /* площадь */
    if (fillet) {
      W.out('o_ffil', 'F_н = ', '1,2 · ' + f(G.K, 1) + '² / 2', f(G.F, 1) + ' мм²',
        'Без учёта выпуклости было бы ' + f(G.K * G.K / 2, 1) + ' мм².');
      W.out('o_fbutt', 'F = ', '— выбран угловой шов —', '—');
      W.out('o_e', 'e = ', '— выбран угловой шов —', '—');
    } else {
      const a = G.a, tg = a.tg;
      W.out('o_ffil', 'F_н = ', '— выбран стыковой шов —', '—');
      W.out('o_fbutt', 'F = ',
        f(a.h, 1) + '² · tg(' + f(G.alpha / 2, 0) + '°) + ' + f(G.b, 1) + ' · ' + f(G.s, 1) +
        ' + 0,73 · ' + f(a.e, 1) + ' · ' + f(G.g, 1) +
        (G.form === 'X' ? ' (усиление с двух сторон)' : ''),
        f(a.F, 1) + ' мм²',
        'По слагаемым: разделка ' + f(a.Fgroove, 1) + ' + зазор ' + f(a.Fgap, 1) +
        ' + усиление ' + f(a.Freinf, 1) + ' мм². Глубина разделки h = ' + f(a.h, 1) + ' мм' +
        (G.form === 'X' ? ' на каждую сторону' : '') + '.');
      const psi = a.e / Math.max(G.g, 0.01);
      W.out('o_e', 'e = ', f(G.b, 1) + ' + 2 · ' + f(a.h, 1) + ' · tg(' + f(G.alpha / 2, 0) +
        '°) + 2 · 1,5', f(a.e, 1) + ' мм',
        'Коэффициент формы усиления ψ_в = e/g = ' + f(a.e, 1) + '/' + f(G.g, 1) + ' = ' +
        f(psi, 1) + (psi >= 7 && psi <= 10 ? ' — в рекомендуемых пределах 7–10.'
          : ' — вне рекомендуемых пределов 7–10: ' +
            (psi < 7 ? 'усиление слишком высокое и узкое, у перехода к основному металлу возникает концентратор напряжений.'
                     : 'усиление слишком плоское и широкое.')));
    }

    /* проходы */
    const n = Math.max(1, G.n), F1 = G.F / n;
    W.out('o_n', 'n = ', fillet ? 'по катету ' + f(G.K, 1) + ' мм'
      : f(G.F, 1) + ' / ' + F1MAX[proc] + ' (округление вверх)',
      n + ' (сечение прохода F₁ = ' + f(F1, 1) + ' мм²)',
      F1 <= 100 ? 'Сечение прохода не превышает предельных 100 мм².'
                : 'Сечение прохода превышает 100 мм² — нужно увеличить число проходов.');

    /* масса */
    const M = W.massDeposit(G.F, L, rho);
    W.out('o_M', 'M = ', f(G.F, 1) + ' мм² · ' + f(L, 2) + ' м · ' + f(rho, 2) + ' г/см³ / 1000',
      f(M, 3) + ' кг',
      'То же в объёме: ' + f(G.F * L, 0) + ' см³ (сечение ' + f(G.F, 1) +
      ' мм² на длине ' + f(L * 1000, 0) + ' мм). На один метр шва — ' +
      f(M / Math.max(L, 1e-9), 3) + ' кг/м.');

    /* расход материалов */
    const Gm = M * kel;
    W.out('o_G', 'G = ', f(M, 3) + ' · ' + f(kel, 3), f(Gm, 3) + ' кг',
      'Потери составляют ' + f((kel - 1) * 100, 1) + ' % от массы наплавки, то есть ' +
      f(Gm - M, 3) + ' кг' +
      (proc === 'smaw' ? ' (огарки, покрытие, разбрызгивание).' : ' (разбрызгивание, угар).'));

    const t0 = M * 1000 / (an * I);          // основное время, ч
    const t = t0 / kp;                        // полное время, ч
    const Vg = qg * t0 * 60;                  // литры
    if (W.PROC[proc].gas)
      W.out('o_gas', 'V_г = ', f(qg, 0) + ' л/мин · ' + f(t0 * 60, 1) + ' мин',
        f(Vg, 0) + ' л = ' + f(Vg / 1000, 3) + ' м³',
        'Расход газа считают по основному времени: подача открыта только при горении дуги ' +
        '(плюс продувка до и после — обычно 1–3 с).');
    else W.out('o_gas', 'V_г = ', 'способ без защитного газа', '—');

    const Gf = proc === 'saw' ? Gm * kfl : 0;
    if (proc === 'saw')
      W.out('o_flux', 'G_ф = ', f(Gm, 3) + ' · ' + f(kfl, 2), f(Gf, 3) + ' кг',
        'Расход флюса принимают примерно равным расходу проволоки; неспёкшуюся часть ' +
        'собирают флюсоотсосом и возвращают в бункер, поэтому фактический расход ниже.');
    else W.out('o_flux', 'G_ф = ', 'сварка без флюса', '—');

    /* скорость и время */
    const v = W.speedFromDeposit(an, I, F1, rho);
    W.out('o_v', 'v = ', f(an, 1) + ' · ' + f(I, 0) + ' / (3600 · ' + f(rho, 2) + ' · ' +
      f(F1 / 100, 4) + ')', f(v * 100 / 3600, 4) + ' см/с = ' + f(v, 2) + ' м/ч',
      'Это скорость движения дуги на одном проходе. При ' + n + ' ' +
      W.plural(n, 'проходе', 'проходах', 'проходах') + ' суммарный путь дуги — ' +
      f(L * n, 1) + ' м.');

    const vp = W.wireFeed(an, I, d, rho);
    W.out('o_vp', 'v_п = ', '4 · ' + f(an, 1) + ' · ' + f(I, 0) + ' / (π · ' + f(d, 1) +
      '² · ' + f(rho, 2) + ')', f(vp, 1) + ' м/ч = ' + f(vp / 60, 2) + ' м/мин',
      proc === 'smaw' || proc === 'gtaw'
        ? 'Для покрытого электрода и присадочного прутка величина справочная — ' +
          'она показывает, с какой скоростью плавится стержень.'
        : 'Скорость подачи проволоки — величина, которая настраивается прямо на подающем механизме.');

    W.out('o_t0', 't₀ = ', f(M * 1000, 0) + ' г / (' + f(an, 1) + ' · ' + f(I, 0) + ')',
      f(t0, 3) + ' ч = ' + f(t0 * 60, 1) + ' мин',
      'Основное время — только горение дуги. Проверка: длина ' + f(L, 2) + ' м при ' + n +
      ' ' + W.plural(n, 'проходе', 'проходах', 'проходах') + ' со скоростью ' + f(v, 2) +
      ' м/ч даёт ' + f(L * n / v, 3) + ' ч.');
    W.out('o_t', 't = ', f(t0, 3) + ' / ' + f(kp, 3), f(t, 3) + ' ч = ' + f(t * 60, 1) + ' мин',
      'Вспомогательное время ' + f((t - t0) * 60, 1) + ' мин — смена электродов, удаление шлака, ' +
      'зачистка, переходы, контроль.');

    const A = U * I * t0 / (1000 * eff) + pxx * (t - t0);
    W.out('o_A', 'A = ', f(U, 1) + ' · ' + f(I, 0) + ' · ' + f(t0, 3) + ' / (1000 · ' + f(eff, 2) +
      ') + ' + f(pxx, 2) + ' · ' + f(t - t0, 3), f(A, 2) + ' кВт·ч',
      'Дуга: ' + f(U * I * t0 / (1000 * eff), 2) + ' кВт·ч; холостой ход: ' +
      f(pxx * (t - t0), 2) + ' кВт·ч. На 1 кг наплавленного металла — ' +
      f(A / Math.max(M, 1e-9), 2) + ' кВт·ч/кг.');

    /* сводка */
    W.setHtml('sum', [
      ['Сечение наплавки', f(G.F, 1) + ' мм²'],
      ['Проходов', String(n)],
      ['Масса наплавки', f(M, 3) + ' кг'],
      ['Расход материала', f(Gm, 3) + ' кг'],
      ['Скорость сварки', f(v, 1) + ' м/ч'],
      ['Скорость наплавления', f(an * I / 1000, 2) + ' кг/ч'],
      ['Основное время', f(t0 * 60, 0) + ' мин'],
      ['Полное время', f(t * 60, 0) + ' мин'],
      ['Электроэнергия', f(A, 2) + ' кВт·ч'],
    ].map(([k, vv]) => '<div class="cell"><span class="k">' + k + '</span><span class="v">' +
      vv + '</span></div>').join(''));

    const rows = [
      ['Площадь наплавленного металла F', f(G.F, 1), 'мм²'],
      ['Число проходов n', String(n), '—'],
      ['Длина шва L', f(L, 2), 'м'],
      ['Масса наплавленного металла M', f(M, 3), 'кг'],
      ['Расход электродов / проволоки G', f(Gm, 3), 'кг'],
    ];
    if (W.PROC[proc].gas) rows.push(['Расход защитного газа', f(Vg, 0), 'л']);
    if (proc === 'saw') rows.push(['Расход флюса', f(Gf, 3), 'кг']);
    rows.push(['Скорость сварки v', f(v, 2), 'м/ч']);
    rows.push(['Скорость подачи проволоки v_п', f(vp / 60, 2), 'м/мин']);
    rows.push(['Основное время t₀', f(t0 * 60, 1), 'мин']);
    rows.push(['Полное время t', f(t * 60, 1), 'мин']);
    rows.push(['Расход электроэнергии A', f(A, 2), 'кВт·ч']);
    el('tab_res').querySelector('tbody').innerHTML =
      '<tr><th>Величина</th><th class="n">Значение</th><th>Единица</th></tr>' +
      rows.map((r) => '<tr><td>' + r[0] + '</td><td class="n">' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('');

    document.querySelectorAll('#tab_pass tbody tr').forEach((tr) => {
      tr.classList.toggle('on', fillet && G.K > parseFloat(tr.dataset.lo) &&
        G.K <= parseFloat(tr.dataset.hi));
    });

    draw(G, n);
  }

  /* ---------- чертёж сечения ---------- */
  function draw(G, n) {
    const cx = 320, yTop = 150, VB_H = 320;
    const fillet = G.joint === 'fillet';
    const size = fillet ? Math.max(G.K * 2, 12) : Math.max(G.s, 4);
    let sc = 110 / size;
    sc = Math.max(2, Math.min(26, sc));
    const g = [];
    const cap = (x, y, t, cls, an) => '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y +
      '"' + (an ? ' text-anchor="' + an + '"' : '') + '>' + t + '</text>';
    const dim = (x1, y1, x2, y2) => '<line class="ln-dim" x1="' + x1 + '" y1="' + y1 +
      '" x2="' + x2 + '" y2="' + y2 + '"/>';

    if (fillet) {
      const Kp = G.K * sc, th = Math.max(6, Kp * 0.6);
      const yb = yTop + th;
      g.push('<rect x="80" y="' + yTop + '" width="480" height="' + th +
        '" fill="url(#hatch)" opacity="0.5"/>');
      g.push('<rect x="80" y="' + yTop + '" width="480" height="' + th +
        '" fill="none" stroke="#16161a" stroke-width="1.8"/>');
      const wh = Math.max(6, th);
      const top = Math.max(28, yTop - Kp - 60);
      g.push('<rect x="' + (cx - wh / 2) + '" y="' + top + '" width="' + wh + '" height="' +
        (yTop - top) + '" fill="url(#hatch)" opacity="0.5"/>');
      g.push('<rect x="' + (cx - wh / 2) + '" y="' + top + '" width="' + wh + '" height="' +
        (yTop - top) + '" fill="none" stroke="#16161a" stroke-width="1.8"/>');
      [-1, 1].forEach((sg) => {
        const x0 = cx + sg * wh / 2;
        g.push('<path class="fill-weld" d="M ' + x0 + ' ' + yTop + ' L ' + (x0 + sg * Kp) + ' ' + yTop +
          ' Q ' + (x0 + sg * Kp * 0.42) + ' ' + (yTop - Kp * 0.42) + ' ' + x0 + ' ' + (yTop - Kp) +
          ' Z" stroke="#b3382e" stroke-width="1.8"/>');
        // проходы
        for (let i = 0; i < n; i++) {
          const r = Math.max(3, Kp / (2 * Math.max(n, 1)) * 0.8);
          const tt = n === 1 ? 0.35 : i / (n - 1);
          const px = x0 + sg * (Kp * 0.25 + Kp * 0.45 * tt);
          const py = yTop - Kp * 0.55 * (1 - tt) - Kp * 0.12;
          g.push('<circle cx="' + px + '" cy="' + py + '" r="' + r +
            '" fill="none" stroke="#155e75" stroke-width="1.2" stroke-dasharray="3 3"/>');
        }
      });
      g.push(dim(cx + wh / 2, yb + 26, cx + wh / 2 + Kp, yb + 26));
      g.push(cap(cx + wh / 2 + Kp / 2, yb + 42, 'K = ' + f(G.K, 1) + ' мм', 'red', 'middle'));
      g.push(dim(cx + wh / 2 + Kp + 30, yTop, cx + wh / 2 + Kp + 30, yTop - Kp));
      g.push(cap(cx + wh / 2 + Kp + 36, yTop - Kp / 2, 'K', 'red'));
      g.push(cap(120, yTop - 8, 'полотнище', 'gray'));
      g.push(cap(cx + wh / 2 + 8, top + 16, 'стенка набора', 'gray'));
      g.push(cap(20, VB_H - 12, 'F = 1,2·K²/2 = ' + f(G.F, 1) + ' мм² · проходов ' + n +
        ' (с каждой стороны)', 'gray'));
    } else {
      const S = G.s * sc, b = G.b * sc, yb = yTop + S;
      const tgv = Math.tan(G.alpha * Math.PI / 360);
      const c = G.c * sc;
      const form = G.form;
      const h = form === 'X' ? (S - c) / 2 : (form === 'V' ? S - c : 0);
      const open = form === 'none' ? 0 : h * tgv;
      const gRe = G.g * sc, eW = G.a.e * sc;
      const edge = (sg) => {
        const x = cx + sg * b / 2, xo = cx + sg * 250;
        if (form === 'none') return 'M ' + x + ' ' + yTop + ' L ' + x + ' ' + yb + ' L ' + xo + ' ' + yb + ' L ' + xo + ' ' + yTop + ' Z';
        if (form === 'V') return 'M ' + (x + sg * open) + ' ' + yTop + ' L ' + x + ' ' + (yTop + h) +
          ' L ' + x + ' ' + yb + ' L ' + xo + ' ' + yb + ' L ' + xo + ' ' + yTop + ' Z';
        return 'M ' + (x + sg * open) + ' ' + yTop + ' L ' + x + ' ' + (yTop + h) + ' L ' + x + ' ' + (yb - h) +
          ' L ' + (x + sg * open) + ' ' + yb + ' L ' + xo + ' ' + yb + ' L ' + xo + ' ' + yTop + ' Z';
      };
      [-1, 1].forEach((sg) => {
        g.push('<path d="' + edge(sg) + '" fill="url(#hatch)" opacity="0.5"/>');
        g.push('<path d="' + edge(sg) + '" fill="none" stroke="#16161a" stroke-width="1.8"/>');
      });
      // наплавленный металл
      let weld;
      if (form === 'none') weld = 'M ' + (cx - b / 2) + ' ' + yTop + ' L ' + (cx + b / 2) + ' ' + yTop +
        ' L ' + (cx + b / 2) + ' ' + yb + ' L ' + (cx - b / 2) + ' ' + yb + ' Z';
      else if (form === 'V') weld = 'M ' + (cx - b / 2 - open) + ' ' + yTop + ' L ' + (cx - b / 2) + ' ' + (yTop + h) +
        ' L ' + (cx - b / 2) + ' ' + yb + ' L ' + (cx + b / 2) + ' ' + yb + ' L ' + (cx + b / 2) + ' ' + (yTop + h) +
        ' L ' + (cx + b / 2 + open) + ' ' + yTop + ' Z';
      else weld = 'M ' + (cx - b / 2 - open) + ' ' + yTop + ' L ' + (cx - b / 2) + ' ' + (yTop + h) +
        ' L ' + (cx - b / 2) + ' ' + (yb - h) + ' L ' + (cx - b / 2 - open) + ' ' + yb +
        ' L ' + (cx + b / 2 + open) + ' ' + yb + ' L ' + (cx + b / 2) + ' ' + (yb - h) +
        ' L ' + (cx + b / 2) + ' ' + (yTop + h) + ' L ' + (cx + b / 2 + open) + ' ' + yTop + ' Z';
      g.push('<path class="fill-weld" d="' + weld + '" stroke="#b3382e" stroke-width="1.6"/>');
      g.push('<path class="fill-weld" d="M ' + (cx - eW / 2) + ' ' + yTop + ' Q ' + cx + ' ' +
        (yTop - 2 * gRe) + ' ' + (cx + eW / 2) + ' ' + yTop + ' Z" stroke="#b3382e" stroke-width="1.6"/>');
      if (form === 'X')
        g.push('<path class="fill-weld" d="M ' + (cx - eW / 2) + ' ' + yb + ' Q ' + cx + ' ' +
          (yb + 2 * gRe) + ' ' + (cx + eW / 2) + ' ' + yb + ' Z" stroke="#b3382e" stroke-width="1.6"/>');
      // проходы
      for (let i = 0; i < n; i++) {
        const r = Math.max(3, Math.min(14, (open + b) / 2 * 0.7));
        const frac = n === 1 ? 0.5 : i / (n - 1);
        const py = yb - h * 0 - S * 0.1 - (S - S * 0.2) * frac;
        const halfw = Math.max(2, (b / 2 + open * (yb - py) / Math.max(S, 1)));
        const px = cx + (i % 2 === 0 ? -1 : 1) * Math.min(halfw * 0.5, r);
        g.push('<circle cx="' + px + '" cy="' + py + '" r="' + r +
          '" fill="none" stroke="#155e75" stroke-width="1.2" stroke-dasharray="3 3"/>');
      }
      // размеры
      g.push(dim(56, yTop, 56, yb));
      g.push(cap(50, (yTop + yb) / 2 + 4, 's = ' + f(G.s, 1), 'blue', 'end'));
      g.push(dim(cx - b / 2, yb + 24, cx + b / 2, yb + 24));
      g.push(cap(cx, yb + 40, 'b = ' + f(G.b, 1) + ' мм', 'gray', 'middle'));
      if (form !== 'none') {
        g.push(cap(cx + eW / 2 + 12, yTop + h / 2, 'h = ' + f(G.a.h, 1) + ' мм, α = ' +
          f(G.alpha, 0) + '°', 'gray'));
        g.push(cap(cx - eW / 2 - 12, yb - 6, 'притупление c = ' + f(G.c, 1) + ' мм', 'gray', 'end'));
      }
      g.push(dim(cx - eW / 2, yTop - 2 * gRe - 14, cx + eW / 2, yTop - 2 * gRe - 14));
      g.push(cap(cx, yTop - 2 * gRe - 20, 'e = ' + f(G.a.e, 1) + ' мм, g = ' + f(G.g, 1) + ' мм',
        'red', 'middle'));
      g.push(cap(20, VB_H - 12, 'F = ' + f(G.a.Fgroove, 1) + ' + ' + f(G.a.Fgap, 1) + ' + ' +
        f(G.a.Freinf, 1) + ' = ' + f(G.F, 1) + ' мм² · проходов ' + n, 'gray'));
    }
    el('board').innerHTML = g.join('');
  }

  el('proc').addEventListener('change', () => {
    const p = DEF[val('proc')];
    if (!p) return;
    ['d', 'an', 'kel', 'kp', 'qg', 'I', 'U'].forEach((k) => { el(k).value = p[k]; });
    recalc();
  });
  W.bind('in', recalc);
})();
