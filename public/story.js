// صورة الستوري — 3 أشكال (لافتة / بولاريد / كرت) × فاتح وداكن
const STORY = (() => {
  const TH = {
    light: { bg: '#F4E9D4', bg2: '#EADBBE', paper: '#FFF9EE', ink: '#1E1B18', muted: '#6E6153', acc: '#E2553D', acc2: '#E8A317', acc3: '#2A7DE1', wall: '#D9B98C' },
    dark: { bg: '#1C1A22', bg2: '#26232E', paper: '#2B2833', ink: '#F3EADA', muted: '#A99C8C', acc: '#F06A4F', acc2: '#F2B632', acc3: '#5A9CF0', wall: '#3A3138' },
  };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, s, max, size, font = 'Lalezar') { let fs = size; do { c.font = `${fs}px ${font}, Plex, sans-serif`; if (c.measureText(s).width <= max) break; fs -= 4; } while (fs > 24); return fs; }
  function text(c, s, x, y, size, color, o = {}) { const fs = fit(c, s, o.max || 960, size, o.font || 'Lalezar'); c.font = `${o.w || ''} ${fs}px ${o.font || 'Lalezar'}, Plex, sans-serif`; c.textAlign = o.a || 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y); return fs; }
  function cover(c, im, x, y, w, h) { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); c.drawImage(im, x + (w - im.naturalWidth * s) / 2, y + (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); }
  function sticker(c, s, x, y, size, bg, fg, rot, T) { c.save(); c.translate(x, y); c.rotate(rot); c.font = `${size}px Lalezar, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const w = c.measureText(s).width + size * 0.9, h = size * 1.35; c.fillStyle = T.ink; rr(c, -w / 2 + 8, -h / 2 + 8, w, h, size * 0.3); c.fill(); c.fillStyle = bg; rr(c, -w / 2, -h / 2, w, h, size * 0.3); c.fill(); c.lineWidth = 6; c.strokeStyle = T.ink; c.stroke(); c.fillStyle = fg; c.fillText(s, 0, size * 0.1); c.restore(); }
  function photoBox(c, im, x, y, w, h, r, T, d, circle) {
    c.save();
    if (circle) { c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 2, 0, 7); } else rr(c, x, y, w, h, r);
    c.clip();
    if (im) cover(c, im, x, y, w, h); else { c.fillStyle = d.color || T.acc; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.font = `${Math.round(h * 0.5)}px Lalezar`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(D.initials(d.name), x + w / 2, y + h / 2 + h * 0.05); }
    c.restore();
    c.lineWidth = 10; c.strokeStyle = T.ink;
    if (circle) { c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 2, 0, 7); c.stroke(); } else { rr(c, x, y, w, h, r); c.stroke(); }
  }
  function groupBox(c, im, x, y, w, h, T, d, rot = 0) {
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot);
    c.fillStyle = T.ink; rr(c, -w / 2 + 12, -h / 2 + 12, w, h, 26); c.fill();
    c.fillStyle = T.paper; rr(c, -w / 2, -h / 2, w, h, 26); c.fill(); c.lineWidth = 7; c.strokeStyle = T.ink; c.stroke();
    const p = 18; c.save(); rr(c, -w / 2 + p, -h / 2 + p, w - 2 * p, h - 2 * p, 16); c.clip();
    if (im) cover(c, im, -w / 2 + p, -h / 2 + p, w - 2 * p, h - 2 * p);
    else { c.fillStyle = T.bg2; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = T.muted; c.font = '64px Lalezar'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.sess || 'قعدتنا', 0, 0); }
    c.restore(); c.restore();
  }
  function logo(c, x, y, sc, T) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    c.font = '96px Lalezar'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText('قعدة').width + 60;
    c.fillStyle = T.ink; rr(c, -w / 2, -70, w, 130, 26); c.fill();
    c.fillStyle = T.bg; c.fillText('قعدة', 0, 4);
    c.restore();
    sticker(c, 'آخر واحد', x + 10 * sc, y + 92 * sc, 54 * sc, T.acc2, '#1E1B18', -0.07, T);
  }
  function footer(c, T, y = 1850) {
    c.font = '700 38px Plex'; c.textAlign = 'center'; c.fillStyle = T.ink;
    c.save(); c.direction = 'ltr'; c.fillText('@eyad.hloubi', 540, y); c.restore();
    c.font = '34px Lalezar'; c.fillStyle = T.muted; c.fillText('صار بدها قعدة.', 540, y - 52);
  }
  function bgDots(c, T) { c.fillStyle = T.bg; c.fillRect(0, 0, 1080, 1920); c.fillStyle = T.bg2; for (let y = 0; y < 1920; y += 36) for (let x = (y / 36) % 2 ? 18 : 0; x < 1080; x += 36) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); } }

  function render(cv, d, layout, theme) {
    const T = TH[theme] || TH.light; const c = cv.getContext('2d');
    c.clearRect(0, 0, 1080, 1920);
    bgDots(c, T);
    const rankTxt = d.pos === 1 ? (d.f ? 'الأول' : 'الأول') : `المركز ${d.pos}`;
    if (layout === 'polaroid') {
      logo(c, 540, 150, 0.85, T);
      // بولاريد شخصية
      c.save(); c.translate(540, 760); c.rotate(-0.06);
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -350 + 16, -420 + 16, 700, 860, 14); c.fill();
      c.fillStyle = '#FFFDF6'; rr(c, -350, -420, 700, 860, 14); c.fill(); c.lineWidth = 6; c.strokeStyle = T.ink; c.stroke();
      photoBox(c, d.photo, -310, -380, 620, 620, 6, Object.assign({}, T, { ink: '#1E1B18' }), d, false);
      c.fillStyle = '#1E1B18'; text(c, d.name, 0, 350, 96, '#1E1B18', { max: 600 });
      c.restore();
      sticker(c, d.title, 790, 470, 58, d.pos === 1 ? T.acc2 : T.acc, d.pos === 1 ? '#1E1B18' : '#fff', 0.12, T);
      sticker(c, rankTxt, 300, 1150, 54, T.paper, T.ink, -0.08, T);
      // بولاريد الشلة
      groupBox(c, d.group, 190, 1240, 700, 430, T, d, 0.05);
      // شريط لاصق باسم القعدة
      c.save(); c.translate(540, 1250); c.rotate(-0.04); c.fillStyle = T.acc3; c.globalAlpha = 0.92; rr(c, -260, -40, 520, 80, 8); c.fill(); c.globalAlpha = 1; c.fillStyle = '#fff'; text(c, d.sess, 0, 16, 50, '#fff', { max: 480 }); c.restore();
      text(c, `${d.pts} نقطة  ·  ${d.f ? d.f + ' مرات آخر واحد' : d.games + ' ألعاب'}`, 540, 1752, 42, T.ink, { font: 'Plex', w: 700 });
      footer(c, T, 1880);
    } else if (layout === 'card') {
      c.fillStyle = T.ink; rr(c, 92, 92, 912, 1680, 48); c.fill();
      c.fillStyle = T.paper; rr(c, 80, 80, 912, 1680, 48); c.fill(); c.lineWidth = 9; c.strokeStyle = T.ink; c.stroke();
      c.save(); rr(c, 80, 80, 912, 300, 48); c.clip(); c.fillStyle = d.pos === 1 ? T.acc2 : T.acc; c.fillRect(80, 80, 912, 300); c.restore();
      c.strokeStyle = T.ink; c.lineWidth = 9; c.beginPath(); c.moveTo(80, 380); c.lineTo(992, 380); c.stroke();
      logo(c, 300, 200, 0.7, T);
      text(c, rankTxt, 790, 250, 92, d.pos === 1 ? '#1E1B18' : '#fff', { max: 340 });
      photoBox(c, d.photo, 290, 300, 500, 500, 0, T, d, true);
      text(c, d.name, 536, 930, 110, T.ink, { max: 820 });
      sticker(c, d.title, 536, 1010, 56, d.pos === 1 ? T.acc2 : T.acc3, d.pos === 1 ? '#1E1B18' : '#fff', -0.04, T);
      // إحصائيات
      const st = [['المركز', String(d.pos)], ['النقاط', String(d.pts)], ['آخر واحد', String(d.f || 0)]];
      st.forEach((s, i) => { const x = 150 + i * 268; c.fillStyle = T.bg; rr(c, x, 1090, 240, 170, 26); c.fill(); c.lineWidth = 6; c.strokeStyle = T.ink; c.stroke(); text(c, s[1], x + 120, 1195, 84, T.ink, { max: 220 }); text(c, s[0], x + 120, 1242, 34, T.muted, { font: 'Plex', w: 700, max: 220 }); });
      groupBox(c, d.group, 140, 1300, 792, 380, T, d, 0);
      sticker(c, d.sess, 536, 1690, 44, T.paper, T.ink, 0.02, T);
      footer(c, T, 1880);
    } else { // لافتة
      // حيط الحارة فوق
      c.fillStyle = T.wall; c.fillRect(0, 0, 1080, 420); c.strokeStyle = T.ink; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 420); c.lineTo(1080, 420); c.stroke();
      const cols = [T.acc, T.acc2, T.acc3, '#2BA36B'];
      c.lineWidth = 4; c.beginPath(); c.moveTo(0, 40); for (let x = 0; x < 1080; x += 135) c.quadraticCurveTo(x + 67, 110, x + 135, 40); c.stroke();
      for (let i = 0; i < 16; i++) { const x = 34 + i * 67.5, y = 40 + Math.sin((i % 2 + 0.5) * Math.PI / 2) * 32; c.fillStyle = cols[i % 4]; c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x + 20, y); c.lineTo(x, y + 44); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke(); }
      logo(c, 540, 230, 1, T);
      photoBox(c, d.photo, 250, 470, 580, 580, 0, T, d, true);
      c.lineWidth = 16; c.strokeStyle = d.color || T.acc; c.beginPath(); c.arc(540, 760, 304, 0, 7); c.stroke();
      sticker(c, rankTxt, 830, 520, 60, d.pos === 1 ? T.acc2 : T.paper, d.pos === 1 ? '#1E1B18' : T.ink, 0.1, T);
      text(c, d.name, 540, 1180, 120, T.ink, { max: 900 });
      sticker(c, d.title, 540, 1260, 60, d.pos === 1 ? T.acc2 : T.acc, d.pos === 1 ? '#1E1B18' : '#fff', -0.04, T);
      text(c, `${d.pts} نقطة  ·  ${d.f ? 'آخر واحد ' + d.f + ' مرات' : d.games + ' ألعاب'}`, 540, 1360, 46, T.ink, { font: 'Plex', w: 700 });
      groupBox(c, d.group, 150, 1400, 780, 330, T, d, -0.02);
      sticker(c, d.sess, 540, 1405, 42, T.acc3, '#fff', 0.03, T);
      footer(c, T, 1880);
    }
  }
  return { render };
})();
