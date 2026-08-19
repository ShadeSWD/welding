/* Данные каркаса страниц. Машинерия — assets/shell.js. */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  buildSiteShell({
    root,
    page: (me && me.dataset.page) || '',
    brand: 'Сварка судовых конструкций',
    logo: `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#b45309"/>
    <path d="M6 22 L24 22" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M15 6 L15 15" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M11.6 21.2 Q15 15.4 18.4 21.2 Z" fill="#ffd166"/>
    <circle cx="15" cy="16.4" r="1.9" fill="#ffd166"/>
  </svg>`,
    nav: [
      { h: '', k: 'index', t: 'Обзор' },
      { t: 'Теория', h: 'theory', drop: [
        { h: 'theory', k: 'theory', t: 'Оглавление курса' },
        { h: 't-arc', k: 't-arc', t: '1. Дуга и источники питания' },
        { h: 't-processes', k: 't-processes', t: '2. Способы сварки' },
        { h: 't-joints', k: 't-joints', t: '3. Соединения и разделки' },
        { h: 't-metallurgy', k: 't-metallurgy', t: '4. Тепло и металлургия шва' },
        { h: 't-defects', k: 't-defects', t: '5. Дефекты и контроль' },
      ] },
      { t: 'Задачи', h: 'modes', drop: [
        { h: 'modes', k: 'modes', t: 'Режимы сварки' },
        { h: 'weldability', k: 'weldability', t: 'Свариваемость и подогрев' },
        { h: 'consumption', k: 'consumption', t: 'Расход материалов' },
        { h: 'distortion', k: 'distortion', t: 'Сварочные деформации' },
      ] },
      { h: 'sources', k: 'sources', t: 'Источники' },
    ],
    footer: `<div>Учебный сайт по технологии сварки судовых конструкций · живые расчёты в браузере</div>`,
    markers: `<marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
    <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#6b6b74" stroke-width="1"/></pattern>`,
  });
})();
