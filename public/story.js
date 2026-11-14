// صورة النتيجة (ستوري 1080×1920) — حسب دليل هوية قعدة: عيلة «تحدّي ولعب» بألوانها المخففة، وطابعها فانكي (ميلان، نجمة، شرايط)
// 3 أشكال: غلاف · بولاريد · ستيكر — وكل شكل فاتح وداكن. فيها: الاسم، الصورة، صورة الشلة، أيقونة القعدة وعيلتها، @eyad.hloubi
'use strict';
const STORY = (() => {
  const W = 1080, H = 1920;
  const THEMES = {
    light: { bg: '#EAD3C8', bg2: '#E2C4B7', ink: '#1C1A17', soft: '#6B4A42', title: '#B5483A', fam: '#B5483A', card: '#FFFDF8', band: '#B5483A', star: '#C9962E', ribbon: '#C9962E' },
    dark: { bg: '#74362D', bg2: '#68302A', ink: '#F6F1E7', soft: '#E7C9BF', title: '#F2B8AA', fam: '#F2B8AA', card: '#F6F1E7', band: '#4E2620', star: '#C9962E', ribbon: '#C9962E' },
  };
  const INK = '#1C1A17';
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fitFont(c, s, max, size, font) { let fs = size; do { c.font = `${font.replace('%', fs)}`; if (c.measureText(s).width <= max) break; fs -= 3; } while (fs > 20); return fs; }
  function txt(c, s, x, y, size, color, o = {}) {
    const f = o.font || '800 %px Changa, Plex, sans-serif';
    const fs = fitFont(c, s, o.max || 940, size, f);
    c.font = f.replace('%', fs); c.textAlign = o.a || 'right'; c.textBaseline = o.b || 'alphabetic'; c.direction = o.dir || 'rtl'; c.fillStyle = color; c.fillText(s, x, y); return fs;
  }
  function cover(c, im, x, y, w, h) { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); c.drawImage(im, x + (w - im.naturalWidth * s) / 2, y + (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); }
  function initials(n) { const p = String(n || '؟').trim().split(/\s+/); return (p[0] || '؟').slice(0, 2); }
  // صورة الشخص (أو أول حرفين من اسمه على لونه)
  function face(c, d, x, y, w, h) {
    if (d.photo && d.photo.naturalWidth) cover(c, d.photo, x, y, w, h);
    else { c.fillStyle = d.color || '#B5483A'; c.fillRect(x, y, w, h); txt(c, initials(d.name), x + w / 2, y + h / 2 + Math.min(w, h) * 0.04, Math.min(w, h) * 0.42, '#fff', { a: 'center', b: 'middle' }); }
  }
  // صورة الشلة (أو وجوه الشلة مصفوفين إذا ما في صورة)
  function group(c, d, x, y, w, h) {
    if (d.group && d.group.naturalWidth) { cover(c, d.group, x, y, w, h); return; }
    c.fillStyle = '#D29488'; c.fillRect(x, y, w, h);
    const crew = (d.crew || []).slice(0, 12); const n = Math.max(1, crew.length);
    const cols = Math.min(n, n > 6 ? 6 : n), rows = Math.ceil(n / cols);
    const r = Math.min(w / (cols * 2.3), h / (rows * 2.3));
    crew.forEach((m, i) => {
      const row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      const cx = x + w / 2 + (col - (inRow - 1) / 2) * r * 2.2, cy = y + h / 2 + (row - (rows - 1) / 2) * r * 2.2;
      c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); face(c, m, cx - r, cy - r, r * 2, r * 2); c.restore();
      c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    });
  }
  function star(c, x, y, r, label, T, rot = -0.12, fs) {
    c.save(); c.translate(x, y); c.rotate(rot);
    const pts = 12; const path = () => { c.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = (i / (pts * 2)) * Math.PI * 2, rr2 = i % 2 ? r * 0.78 : r; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); };
    c.translate(8, 8); path(); c.fillStyle = INK; c.fill(); c.translate(-8, -8);
    path(); c.fillStyle = T.star; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    txt(c, label, 0, 4, fs || r * 0.62, INK, { a: 'center', b: 'middle', dir: 'ltr' });
    c.restore();
  }
  function shadowBox(c, x, y, w, h, r, fill, off = 16) { c.fillStyle = INK; rr(c, x + off, y + off, w, h, r); c.fill(); c.fillStyle = fill; rr(c, x, y, w, h, r); c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); }
  function confetti(c, T, seed, n = 14, area) {
    let s = seed; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      const x = (area ? area[0] : 60) + rnd() * (area ? area[2] : 960), y = (area ? area[1] : 180) + rnd() * (area ? area[3] : 1500), z = 14 + rnd() * 18;
      c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.fillStyle = [T.star, INK, T.title, '#3E5C76'][i % 4]; c.globalAlpha = 0.85; c.fillRect(-z / 2, -z / 2, z, z * 0.6); c.restore();
    }
  }
  function header(c, T) {
    // يمين: كرسي العيلة واسمها بخطها — شمال: أيقونة القعدة واسمها
    const ch = BRAND.chairImg(); if (ch.complete && ch.naturalWidth) c.drawImage(ch, W - 60 - 86, 64, 86, 86);
    txt(c, BRAND.FAM_NAME, W - 60 - 96, 122, 42, T.fam);
    BRAND.drawIcon(c, 60, 60, 92);
    txt(c, 'قعدة آخر واحد', 60 + 92 + 18 + 260, 120, 32, T.soft, { font: '700 %px Plex, sans-serif', max: 260 });
  }
  function footer(c, T) { txt(c, '@eyad.hloubi', 60, H - 64, 32, T.soft, { font: '700 %px Plex, sans-serif', a: 'left', dir: 'ltr' }); }
  function ptsLine(d) { const p = Math.round(d.pts * 100) / 100; return `${p} ${p === 1 ? 'نقطة' : 'نقاط'} من ${d.games} ${d.games === 1 || d.games > 10 ? 'لعبة' : 'ألعاب'}`; }

  // ── 1) غلاف: صورة الشلة فوق، وصورتك مايلة عليها، ونجمة المركز وشريط اللقب
  function layoutCover(c, d, T) {
    c.save(); c.beginPath(); c.rect(0, 180, W, 640); c.clip(); group(c, d, 0, 180, W, 640);
    const g = c.createLinearGradient(0, 520, 0, 820); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, T.bg); c.fillStyle = g; c.fillRect(0, 500, W, 330);
    c.restore();
    c.save(); c.translate(600, 860); c.rotate(0.07);
    shadowBox(c, -230, -270, 460, 540, 26, T.card, 18);
    c.save(); rr(c, -206, -246, 412, 492, 16); c.clip(); face(c, d, -206, -246, 412, 492); c.restore();
    c.restore();
    star(c, 330, 640, 110, '#' + d.pos, T);
    // الشريط المايل
    c.save(); c.translate(W / 2, 1270); c.rotate(-0.06);
    c.fillStyle = INK; c.fillRect(-W * 0.62 + 10, -78 + 10, W * 1.24, 156);
    c.fillStyle = T.ribbon; c.fillRect(-W * 0.62, -78, W * 1.24, 156); c.lineWidth = 8; c.strokeStyle = INK; c.strokeRect(-W * 0.62, -78, W * 1.24, 156);
    txt(c, d.title, 0, 8, 88, INK, { a: 'center', b: 'middle', max: 860 });
    c.restore();
    txt(c, d.name, W - 70, 1480, 108, T.ink, { max: 900 });
    txt(c, `${ptsLine(d)} · ${d.sess}`, W - 70, 1550, 36, T.soft, { font: '600 %px Plex, sans-serif', max: 920 });
    confetti(c, T, 7, 10, [60, 1600, 960, 180]);
  }
  // ── 2) بولاريد: بولاريد الشلة ورا، وبولاريدك قدّام بشريطة لاصقة، واللقب كبير
  function polaroid(c, im, x, y, w, h, rot, cap, T, fn, capLeft) {
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot);
    c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -w / 2 + 14, -h / 2 + 18, w, h, 10); c.fill();
    c.fillStyle = T.card; rr(c, -w / 2, -h / 2, w, h, 10); c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(28,26,23,.35)'; c.stroke();
    const pad = w * 0.06, ph = h - pad - h * 0.2;
    c.save(); c.beginPath(); c.rect(-w / 2 + pad, -h / 2 + pad, w - pad * 2, ph); c.clip(); fn(-w / 2 + pad, -h / 2 + pad, w - pad * 2, ph); c.restore();
    if (capLeft) txt(c, cap, -w / 2 + pad, h / 2 - h * 0.08, Math.min(46, w * 0.075), INK, { a: 'left', b: 'middle', max: w * 0.38 });
    else txt(c, cap, 0, h / 2 - h * 0.08, Math.min(54, w * 0.09), INK, { a: 'center', b: 'middle', max: w - pad * 2 });
    c.restore();
  }
  function layoutPolaroid(c, d, T) {
    polaroid(c, null, 80, 230, 640, 560, -0.11, d.sessName || d.sess, T, (x, y, w, h) => group(c, d, x, y, w, h), true);
    polaroid(c, null, 400, 640, 560, 700, 0.06, d.name, T, (x, y, w, h) => face(c, d, x, y, w, h));
    // شريطة لاصقة
    c.save(); c.translate(690, 640); c.rotate(0.03); c.fillStyle = 'rgba(201,150,46,.82)'; c.fillRect(-90, -26, 180, 56); c.restore();
    star(c, 300, 1230, 112, '#' + d.pos, T, 0.1);
    const words = d.title.split(' ');
    const l1 = words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : d.title, l2 = words.length > 1 ? words.slice(Math.ceil(words.length / 2)).join(' ') : '';
    txt(c, l1, W - 70, l2 ? 1500 : 1560, 130, T.title, { max: 600 });
    if (l2) txt(c, l2, W - 70, 1630, 130, T.title, { max: 600 });
    txt(c, ptsLine(d), W - 70, 1720, 38, T.soft, { font: '600 %px Plex, sans-serif', max: 620 });
    confetti(c, T, 3, 8, [60, 1380, 400, 300]);
  }
  // ── 3) ستيكر: صورتك ستيكر كبير مايل، ونجمة الرقم، ولافتة الاسم واللقب
  function layoutSticker(c, d, T) {
    confetti(c, T, 11, 16, [50, 200, 980, 1100]);
    c.save(); c.translate(560, 720); c.rotate(-0.08);
    shadowBox(c, -330, -330, 660, 660, 80, T.card, 22);
    c.save(); rr(c, -312, -312, 624, 624, 66); c.clip(); face(c, d, -312, -312, 624, 624); c.restore();
    c.restore();
    star(c, 240, 1030, 118, String(d.pos), T, -0.15, 120);
    // لافتة الاسم واللقب
    c.save(); c.translate(W / 2 + 30, 1210); c.rotate(-0.045);
    const label = `${d.name} · ${d.title}`;
    c.font = '800 64px Changa, Plex, sans-serif'; let lw = Math.min(900, c.measureText(label).width + 90);
    c.fillStyle = INK; c.fillRect(-lw / 2 + 12, -62 + 12, lw, 124); c.fillStyle = '#FFFDF8'; c.fillRect(-lw / 2, -62, lw, 124); c.lineWidth = 7; c.strokeStyle = INK; c.strokeRect(-lw / 2, -62, lw, 124);
    txt(c, label, 0, 6, 64, INK, { a: 'center', b: 'middle', max: lw - 70 });
    c.restore();
    // كرت الشلة الصغير
    c.save(); c.translate(330, 1440); c.rotate(0.03);
    shadowBox(c, -190, -120, 380, 240, 28, '#D29488', 12);
    c.save(); rr(c, -180, -110, 360, 220, 20); c.clip(); group(c, d, -180, -110, 360, 220); c.restore();
    c.restore();
    txt(c, d.sessName || d.sess, W - 70, 1420, 52, T.ink, { max: 480 });
    txt(c, ptsLine(d), W - 70, 1485, 36, T.soft, { font: '600 %px Plex, sans-serif', max: 480 });
  }
  function render(cv, d, layout, theme) {
    const c = cv.getContext('2d'); const T = THEMES[theme] || THEMES.light;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    c.fillStyle = T.bg2; for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    if (layout === 'polaroid') layoutPolaroid(c, d, T); else if (layout === 'sticker') layoutSticker(c, d, T); else layoutCover(c, d, T);
    header(c, T); footer(c, T);
  }
  return { render };
})();
