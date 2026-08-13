/* Каркас страниц «Сварка судовых конструкций». */
'use strict';
(function () {
  const me = document.currentScript;
  const root = (me && me.dataset.root) || './';
  const page = (me && me.dataset.page) || '';
  const logoSvg = `
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="28" height="28" rx="6" fill="#b45309"/>
    <path d="M6 22 L24 22" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M15 6 L15 15" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M11.6 21.2 Q15 15.4 18.4 21.2 Z" fill="#ffd166"/>
    <circle cx="15" cy="16.4" r="1.9" fill="#ffd166"/>
  </svg>`;
  const chapters = [
    { href: 't-arc', key: 't-arc', title: '1. Дуга и источники питания' },
    { href: 't-processes', key: 't-processes', title: '2. Способы сварки' },
    { href: 't-joints', key: 't-joints', title: '3. Соединения и разделки' },
    { href: 't-metallurgy', key: 't-metallurgy', title: '4. Тепло и металлургия шва' },
    { href: 't-defects', key: 't-defects', title: '5. Дефекты и контроль' },
  ];
  const nav = [
    { href: '', key: 'index', title: 'Обзор' },
    { href: 'theory', key: 'theory', title: 'Теория', drop: chapters },
    { href: 'modes', key: 'modes', title: 'Режимы сварки' },
    { href: 'weldability', key: 'weldability', title: 'Свариваемость' },
    { href: 'consumption', key: 'consumption', title: 'Расход материалов' },
    { href: 'distortion', key: 'distortion', title: 'Деформации' },
    { href: 'sources', key: 'sources', title: 'Источники' },
  ];
  const inChapter = chapters.some((c) => c.key === page);
  const link = ({ href, key, title }) =>
    `<a href="${root}${href}" class="${page === key ? 'on' : ''}">${title}</a>`;
  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="${root}">${logoSvg}<span>Сварка судовых конструкций</span></a>
    <nav class="top">${nav.map((it) => {
      if (!it.drop) return link(it);
      const on = page === it.key || inChapter ? 'on' : '';
      return `<span class="nav-drop"><a href="${root}${it.href}" class="${on}">${it.title} ▾</a>
        <span class="drop">${it.drop.map(link).join('')}</span></span>`;
    }).join('')}</nav>
  </div>`;
  document.body.prepend(header);
  const footer = document.createElement('footer');
  footer.className = 'site';
  footer.innerHTML = `<div class="wrap">
    <div>Учебный сайт по технологии сварки судовых конструкций · живые расчёты в браузере</div>
  </div>`;
  document.body.appendChild(footer);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <marker id="arrE" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="#16161a"/></marker>
    <marker id="arrS" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
      <path d="M10,0 L0,4 L10,8 z" fill="#16161a"/></marker>
    <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#6b6b74" stroke-width="1"/></pattern>
  </defs>`;
  document.body.appendChild(defs);
})();
