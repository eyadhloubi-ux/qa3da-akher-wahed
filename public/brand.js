// هوية قعدة: اللوغو، كرسي عيلة «تحدّي ولعب»، وأيقونة «قعدة آخر واحد»
'use strict';
const BRAND = (() => {
  const INK = '#1C1A17', CREAM = '#F6F1E7', MUSTARD = '#C9962E', RED = '#B5483A', BLUE = '#3E5C76';
  // ألوان عيلة تحدّي ولعب (900 → 100)
  const FAM = { 900: '#612F27', 700: '#8F3C31', 500: '#B5483A', 300: '#D29488', 100: '#EAD3C8' };
  const FAM_NAME = 'تحدّي ولعب';
  const ICON_BG = '#E2553D'; // لون «آخر واحد» نفسها (أحمر أعلام الحارة)

  // ── اللوغو: القلطق الموستارد ومخدّتين، وكلمة قعدة بـLalezar
  const LOGO_INNER = (ink) => `<g transform="translate(8 8)" fill="${INK}"><rect x="379.5" y="113" width="95.5" height="129" rx="24"/><rect x="359.5" y="169" width="28" height="77" rx="12"/><rect x="467.0" y="169" width="28" height="77" rx="12"/><rect x="361.5" y="228" width="131.5" height="22" rx="9"/></g><g fill="${MUSTARD}" stroke="${INK}" stroke-width="5"><rect x="379.5" y="113" width="95.5" height="129" rx="24"/><rect x="359.5" y="169" width="28" height="77" rx="12"/><rect x="467.0" y="169" width="28" height="77" rx="12"/><rect x="361.5" y="228" width="131.5" height="22" rx="9"/></g><text x="460" y="220" direction="rtl" text-anchor="start" font-family="Lalezar" font-size="160" fill="${ink}">قـــعدة</text><rect x="395.5" y="119.5" width="31.5" height="31.5" rx="9.4" fill="${RED}" stroke="${INK}" stroke-width="3"/><circle cx="411.2" cy="135.3" r="2.4" fill="#000" opacity="0.28"/><rect x="429.0" y="119.5" width="31.5" height="31.5" rx="9.4" fill="${BLUE}" stroke="${INK}" stroke-width="3"/><circle cx="444.7" cy="135.3" r="2.4" fill="#000" opacity="0.28"/>`;
  const logoSVG = (h, ink = INK) => `<svg height="${h}" viewBox="96 101 415 161" aria-label="قعدة">${LOGO_INNER(ink)}</svg>`;

  // ── كرسي العيلة: البين باغ ومخدّة مرمية عليه
  const CHAIR_INNER = `<ellipse cx="100" cy="180" rx="66" ry="7" fill="${INK}" opacity=".18"/><path d="M36 172c-12-34 4-76 36-98c26-18 60-14 76 10c18 26 22 58 16 88c-34 14-96 14-128 0z" fill="${MUSTARD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M58 172c6-24 26-40 54-40c22 0 40 14 48 34" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".55"/><path d="M76 84q-8 18-4 36M124 82q12 16 10 36M98 70q2 10 0 18" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" opacity=".4"/><path d="M100 66q-6-8 0-14" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="50" r="5" fill="${MUSTARD}" stroke="${INK}" stroke-width="4"/><rect x="82" y="104" width="40" height="32" rx="10" fill="${RED}" stroke="${INK}" stroke-width="4" transform="rotate(-14 102 120)"/><path d="M168 70l8-8M172 92h12M30 84l-10-6" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const chairSVG = (s) => `<svg width="${s}" height="${s}" viewBox="20 40 170 150" aria-hidden="true">${CHAIR_INNER}</svg>`;

  // ── رسمة «آخر واحد»: تلات قلاطق، اتنين واقعين وواحد واقف وعليه تاج
  const DRAW = `<ellipse cx="100" cy="182" rx="80" ry="7" fill="${INK}" opacity=".2"/>
<g transform="rotate(-20 30 182)"><path d="M18 164l-4 18M42 164l4 18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="8" y="152" width="44" height="13" rx="6" fill="${CREAM}" stroke="${INK}" stroke-width="5"/><rect x="13" y="134" width="34" height="18" rx="8" fill="${BLUE}" stroke="${INK}" stroke-width="5"/></g>
<g transform="rotate(20 170 182)"><path d="M158 164l-4 18M182 164l4 18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="148" y="152" width="44" height="13" rx="6" fill="${CREAM}" stroke="${INK}" stroke-width="5"/><rect x="153" y="134" width="34" height="18" rx="8" fill="${BLUE}" stroke="${INK}" stroke-width="5"/></g>
<path d="M12 120q-6 10 0 20M188 120q6 10 0 20" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".6"/>
<path d="M80 154l-8 28M120 154l8 28" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
<rect x="62" y="140" width="76" height="18" rx="8" fill="${MUSTARD}" stroke="${INK}" stroke-width="5"/>
<rect x="70" y="116" width="60" height="26" rx="11" fill="${CREAM}" stroke="${INK}" stroke-width="5"/>
<path d="M74 112l6-34 16 18 4-24 4 24 16-18 6 34z" fill="${MUSTARD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
<circle cx="80" cy="76" r="4.5" fill="${CREAM}" stroke="${INK}" stroke-width="3.5"/><circle cx="100" cy="70" r="4.5" fill="${CREAM}" stroke="${INK}" stroke-width="3.5"/><circle cx="120" cy="76" r="4.5" fill="${CREAM}" stroke="${INK}" stroke-width="3.5"/>
<path d="M58 92l-10-7M142 92l10-7" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;

  // ── أيقونة التطبيق حسب القاعدة: لون العيلة، ستيكر اللوغو فوق، والرسمة تحته بلا تلامس
  const iconSVG = (s, round = true) => `<svg width="${s}" height="${s}" viewBox="0 0 200 200" aria-label="قعدة آخر واحد"><rect width="200" height="200" rx="${round ? 46 : 0}" fill="${ICON_BG}"/><rect x="21" y="19" width="168" height="72" rx="16" fill="${INK}"/><rect x="16" y="14" width="168" height="72" rx="16" fill="${CREAM}" stroke="${INK}" stroke-width="4"/><g transform="translate(-9.3 -15.4) scale(0.360)">${LOGO_INNER(INK)}</g><g transform="translate(100 146) scale(0.62) translate(-100 -122)">${DRAW}</g></svg>`;

  // صور للكانفس (بلا نصوص، فما في مشكلة خطوط)
  const imgs = {};
  function img(key, svg) {
    if (imgs[key]) return imgs[key];
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.startsWith('<svg') ? svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') : svg); imgs[key] = im; return im;
  }
  const chairImg = () => img('chair', chairSVG(200));
  const iconImg = () => img('icon', `<svg width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="46" fill="${ICON_BG}"/><rect x="21" y="19" width="168" height="72" rx="16" fill="${INK}"/><rect x="16" y="14" width="168" height="72" rx="16" fill="${CREAM}" stroke="${INK}" stroke-width="4"/><g transform="translate(100 146) scale(0.62) translate(-100 -122)">${DRAW}</g></svg>`);

  // اللوغو عالكانفس (الكلمة بخط Lalezar من الصفحة)
  function drawLogo(c, x, y, h, ink = INK) {
    const k = h / 161; c.save(); c.translate(x, y); c.scale(k, k); c.translate(-96, -101);
    const R = (rx, ry, w, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(rx, ry, w, hh, r) : c.rect(rx, ry, w, hh); };
    const parts = [[379.5, 113, 95.5, 129, 24], [359.5, 169, 28, 77, 12], [467, 169, 28, 77, 12], [361.5, 228, 131.5, 22, 9]];
    c.fillStyle = INK; parts.forEach((p) => { R(p[0] + 8, p[1] + 8, p[2], p[3], p[4]); c.fill(); });
    c.fillStyle = MUSTARD; c.strokeStyle = INK; c.lineWidth = 5; parts.forEach((p) => { R(...p); c.fill(); c.stroke(); });
    c.font = '160px Lalezar'; c.direction = 'rtl'; c.textAlign = 'start'; c.textBaseline = 'alphabetic'; c.fillStyle = ink; c.fillText('قـــعدة', 460, 220);
    c.lineWidth = 3; [[395.5, RED], [429, BLUE]].forEach(([px, col]) => { c.fillStyle = col; R(px, 119.5, 31.5, 31.5, 9.4); c.fill(); c.stroke(); });
    c.restore();
  }
  // الأيقونة عالكانفس مع اللوغو
  function drawIcon(c, x, y, s) {
    const im = iconImg(); if (im.complete && im.naturalWidth) c.drawImage(im, x, y, s, s);
    const k = s / 200; drawLogo(c, x + (-9.3 + 96 * 0.36) * k, y + (-15.4 + 101 * 0.36) * k, 161 * 0.36 * k);
  }
  return { INK, CREAM, MUSTARD, RED, BLUE, FAM, FAM_NAME, logoSVG, chairSVG, iconSVG, chairImg, iconImg, drawLogo, drawIcon, DRAW };
})();
