/* distortion.js — сварочные деформации: усадочная сила, укорочение, прогиб. */
'use strict';
(function () {
  const W = window.W, f = W.f, num = W.num, el = W.el;
  const S = W.STEEL;

  function recalc() {
    const qk = num('q'), q = qk * 1000, s = num('s'), n = Math.max(1, num('n'));
    const A = num('A'), J = num('J') * 1e4, e = num('e'), L = num('L') * 1000, ka = num('ka');

    const Fs = W.shrinkForce(q);
    const eps = W.shrinkLongRel(q, A);
    const dL = eps * L;
    const dW1 = W.shrinkTrans(q, s);
    // многопроходность: вклад каждого следующего прохода убывает (ряд 1/i)
    let mult = 0; for (let i = 1; i <= n; i++) mult += 1 / i;
    const dW = dW1 * mult;
    const fdef = W.camber(Fs, e, L, J);
    const beta = ka * 2 * dW1 / s;
    const sigma = Fs / A;
    const qA = q / A;

    W.out('o_Fs', 'F_s = ', '0,3354 · 0,12·10⁻⁴ · ' + f(q, 0) + ' · 2·10⁵ / 0,0047',
      f(Fs / 1000, 1) + ' кН',
      'Усадочная сила не зависит от размеров детали — только от погонной энергии ' +
      'и свойств металла. Средние напряжения от неё в сечении: σ = F_s/A = ' +
      f(sigma, 1) + ' МПа при σ_т ≈ ' + S.sigmaT + ' МПа.');

    W.out('o_eps', 'ε = ', '0,3354 · 0,12·10⁻⁴ · ' + f(q, 0) + ' / (0,0047 · ' + f(A, 0) + ')',
      eps.toExponential(3).replace('.', ',') + ' = ' + f(eps * 1000, 3) + ' мм/м');

    W.out('o_dL', 'ΔL = ', f(eps * 1000, 4) + ' мм/м · ' + f(L / 1000, 2) + ' м',
      f(dL, 3) + ' мм',
      'Через усадочную силу то же самое: ' + f(Fs / 1000, 1) + ' кН · ' + f(L, 0) +
      ' мм / (2·10⁵ · ' + f(A, 0) + ') = ' + f(Fs * L / (S.E * A), 3) + ' мм. ' +
      'Практический ориентир для стыкового шва — около 3 мм на 3 м, для углового — около 0,8 мм на 3 м.');

    W.out('o_dW', 'ΔW = ', '0,12·10⁻⁴ · ' + f(q, 0) + ' / (0,0047 · ' + f(s, 1) + ')',
      f(dW1, 3) + ' мм на один проход' + (n > 1 ? ', всего ' + f(dW, 3) + ' мм' : ''),
      n > 1 ? 'При ' + n + ' проходах вклад каждого следующего убывает — принято суммирование ' +
              'по ряду 1 + 1/2 + … + 1/n = ' + f(mult, 3) + ' (оценочная модель). ' +
              'Практический припуск на поперечную усадку стыкового шва — 1,5–3 мм.'
            : 'Расчёт по однопроходной модели даёт нижнюю оценку: при многопроходной сварке ' +
              'поперечное укорочение складывается по проходам.');

    W.out('o_f', 'f = ', f(Fs / 1000, 1) + ' кН · ' + f(e, 0) + ' мм · (' + f(L, 0) +
      ' мм)² / (8 · 2·10⁵ · ' + f(J / 1e4, 0) + '·10⁴ мм⁴)', f(fdef, 2) + ' мм',
      'Прогиб направлен в сторону шва. На такую же величину назначают ' +
      'предварительный обратный выгиб. Относительный прогиб f/L = 1/' +
      f(L / Math.max(fdef, 1e-9), 0) + '.');

    W.out('o_beta', 'β ≈ ', f(ka, 2) + ' · 2 · ' + f(dW1, 3) + ' / ' + f(s, 1),
      f(beta * 1000, 2) + ' мрад = ' + f(beta * 180 / Math.PI, 2) + '°',
      'Оценочная модель: угловая деформация определяется разностью поперечной усадки ' +
      'у лицевой и обратной поверхности, β = (ΔW_в − ΔW_н)/s. Коэффициент асимметрии k_а ' +
      'берут из опыта: 0 для симметричной X-образной разделки, 0,25–0,45 для односторонней ' +
      'V-образной разделки и однопроходного углового шва. Нормативный путь — номограммы ' +
      'по опытным данным, а не эта формула.');

    const okQA = qA < 0.6, okS = sigma <= S.sigmaT;
    W.out('o_chk', 'q_п/A = ', f(q, 0) + ' / ' + f(A, 0),
      f(qA, 3) + ' Дж/мм³ ' + (okQA ? '< 0,6 — модель применима' : '≥ 0,6 — модель неприменима'),
      okS ? 'Средние напряжения от усадочной силы ниже предела текучести.'
          : 'Средние напряжения от усадочной силы превысили предел текучести — ' +
            'сечение полностью пластично, линейная модель неверна.');

    W.setHtml('sum', [
      ['Усадочная сила', f(Fs / 1000, 1) + ' кН'],
      ['Продольное ΔL', f(dL, 2) + ' мм'],
      ['Поперечное ΔW', f(dW, 2) + ' мм'],
      ['Прогиб f', f(fdef, 2) + ' мм'],
      ['Угловая β', f(beta * 180 / Math.PI, 2) + '°'],
      ['σ = F_s/A', f(sigma, 0) + ' МПа'],
    ].map(([k, v]) => '<div class="cell"><span class="k">' + k + '</span><span class="v">' +
      v + '</span></div>').join(''));

    const badge = (ok, t) => '<span class="badge ' + (ok ? 'ok' : 'bad') + '">' + t + '</span>';
    W.setHtml('checks', '<div class="controls" style="gap:6px 8px">' +
      badge(okQA, 'q_п/A = ' + f(qA, 3) + ' Дж/мм³') + ' ' +
      badge(okS, 'σ = ' + f(sigma, 0) + ' МПа ≤ ' + S.sigmaT + ' МПа') + ' ' +
      badge(fdef / (L) < 1 / 500, 'f/L = 1/' + f(L / Math.max(fdef, 1e-9), 0)) +
      '</div>');

    draw(fdef, L, e, dL, Fs);
  }

  function draw(fdef, L, e, dL, Fs) {
    const x0 = 70, x1 = 590, yAx = 130;
    const g = [];
    const cap = (x, y, t, cls, an) => '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y +
      '"' + (an ? ' text-anchor="' + an + '"' : '') + '>' + t + '</text>';
    // прогиб показывается в условном увеличении (иначе на схеме он невидим)
    const sag = fdef > 0.001 ? 46 : 0;
    // исходное положение
    g.push('<line class="ln gray ln-dash" x1="' + x0 + '" y1="' + yAx + '" x2="' + x1 + '" y2="' + yAx + '"/>');
    g.push(cap(x0, yAx - 8, 'положение до сварки', 'gray'));
    // деформированная балка: стенка
    const midx = (x0 + x1) / 2;
    const yb = (x) => {
      const u = (x - x0) / (x1 - x0);
      return yAx + sag * 4 * u * (1 - u);
    };
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = x0 + (x1 - x0) * i / 40;
      pts.push(x.toFixed(1) + ',' + yb(x).toFixed(1));
    }
    g.push('<polyline class="ln" points="' + pts.join(' ') + '" stroke-width="2.6" fill="none"/>');
    const pts2 = pts.map((p) => { const [a, b] = p.split(','); return a + ',' + (parseFloat(b) + 30).toFixed(1); });
    g.push('<polyline class="ln" points="' + pts2.join(' ') + '" stroke-width="2.6" fill="none"/>');
    const pts3 = pts.map((p) => { const [a, b] = p.split(','); return a + ',' + (parseFloat(b) + 34).toFixed(1); });
    g.push('<polyline class="ln red" points="' + pts3.join(' ') + '" stroke-width="5" fill="none"/>');
    g.push(cap(x0 + 6, yb(x0 + 6) + 52, 'шов (усадочная сила F_s = ' + f(Fs / 1000, 1) + ' кН)', 'red'));
    // стрела прогиба
    g.push('<line class="ln-dim" x1="' + midx + '" y1="' + yAx + '" x2="' + midx + '" y2="' + yb(midx) + '"/>');
    g.push(cap(midx + 8, (yAx + yb(midx)) / 2 + 4, 'f = ' + f(fdef, 2) + ' мм', 'blue'));
    // эксцентриситет
    g.push('<line class="ln-dim" x1="' + (x1 - 24) + '" y1="' + yb(x1 - 24) + '" x2="' + (x1 - 24) + '" y2="' + (yb(x1 - 24) + 34) + '"/>');
    g.push(cap(x1 - 18, yb(x1 - 24) + 20, 'e = ' + f(e, 0) + ' мм', 'gray'));
    // продольное укорочение
    g.push('<line class="ln-dim" x1="' + x0 + '" y1="230" x2="' + x1 + '" y2="230"/>');
    g.push(cap(midx, 246, 'L = ' + f(L / 1000, 2) + ' м, укорочение ΔL = ' + f(dL, 2) + ' мм',
      'blue', 'middle'));
    g.push('<g stroke="#b3382e" stroke-width="2" fill="none" marker-end="url(#arrE)">' +
      '<path d="M ' + (x0 + 4) + ' 268 L ' + (x0 + 46) + ' 268"/>' +
      '<path d="M ' + (x1 - 4) + ' 268 L ' + (x1 - 46) + ' 268"/></g>');
    g.push(cap(midx, 272, 'усадка тянет концы к середине', 'red', 'middle'));
    g.push(cap(20, 24, 'прогиб показан с увеличением; масштаб длины и прогиба разный', 'gray'));
    el('board').innerHTML = g.join('');
  }

  W.bind('in', recalc);
})();
