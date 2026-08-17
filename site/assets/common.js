/* common.js — мелкие помощники, общие для расчётных страниц сайта: подписи и
 * размерные линии на схемах, значок проверки, плитки сводки и практический
 * предел сечения прохода. Подключается перед wcalc.js и скриптом страницы. */
'use strict';

/* Подпись на схеме. cls — дополнительный класс (red | blue | gray | green | b),
   anchor — выравнивание текста (middle | end). */
const svgCap = (x, y, t, cls, anchor) =>
  '<text class="cap ' + (cls || '') + '" x="' + x + '" y="' + y + '"' +
  (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + t + '</text>';

/* Размерная (выносная) линия на схеме. */
const svgDim = (x1, y1, x2, y2) =>
  '<line class="ln-dim" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';

/* Значок проверки: зелёный, если условие выполнено, иначе красный. */
const badgeHtml = (ok, t) =>
  '<span class="badge ' + (ok ? 'ok' : 'bad') + '">' + t + '</span>';

/* Плитки сводки из пар [название, значение]. */
const sumCells = (rows) => rows.map(([k, v]) =>
  '<div class="cell"><span class="k">' + k + '</span><span class="v">' + v +
  '</span></div>').join('');

/* Практический предел сечения одного прохода по способам сварки, мм²
   (нормативный потолок — 100 мм²). */
const F1MAX = { smaw: 40, gmaw: 45, saw: 100, fcaw: 60, gtaw: 25 };
