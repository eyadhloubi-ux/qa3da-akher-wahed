// رسم الشخصيات (راسها صورة اللاعب) وساحة الحارة
const D = (() => {
  const photos = {};             // id -> Image
  let css = {};
  function readCss() {
    const s = getComputedStyle(document.documentElement);
    ['--bg', '--bg2', '--paper', '--ink', '--line', '--muted', '--acc', '--acc2', '--acc3', '--ok', '--bad', '--stone', '--wall', '--water'].forEach((k) => (css[k.slice(2)] = s.getPropertyValue(k).trim()));
    css.dark = document.documentElement.dataset.themeResolved === 'dark';
  }
  function setPhoto(id, data) { const im = new Image(); im.src = data; photos[id] = im; }
  function photo(id) { const im = photos[id]; return im && im.complete && im.naturalWidth ? im : null; }
  function initials(name) { const n = (name || '؟').trim(); if (/^[اأإآ]/.test(n)) return 'ا' + (n.charAt(1) || ''); return n.charAt(0) || '؟'; }

  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // وجه الموبايل اللي بيلعب ضدكن: قلطق قعدة أبو المخدّتين (من اللوغو) وعليه عيون
  function stoolFace(c, x, y, r, o = {}) {
    const k = (2 * r) / 150; c.save(); c.translate(x, y); c.scale(k, k); c.translate(-427, -182);
    const ink = '#1C1A17', R = (rx, ry, w, h, rad) => rr(c, rx, ry, w, h, rad);
    const parts = [[379.5, 113, 95.5, 129, 24], [359.5, 169, 28, 77, 12], [467, 169, 28, 77, 12], [361.5, 228, 131.5, 22, 9]];
    c.fillStyle = ink; parts.forEach((q) => { R(q[0] + 7, q[1] + 7, q[2], q[3], q[4]); c.fill(); });
    c.fillStyle = '#C9962E'; c.strokeStyle = ink; c.lineWidth = 6; parts.forEach((q) => { R(...q); c.fill(); c.stroke(); });
    c.lineWidth = 4; [[393, '#B5483A'], [428, '#3E5C76']].forEach(([px, col]) => { c.fillStyle = col; R(px, 117, 34, 34, 10); c.fill(); c.stroke(); });
    // العيون
    const blink = o.t != null && (o.t % 3.2) < 0.12;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(408, 186, 11, blink ? 2 : 13, 0, 0, 7); c.ellipse(447, 186, 11, blink ? 2 : 13, 0, 0, 7); c.fill(); c.stroke();
    if (!blink) { c.fillStyle = ink; const lx = (o.look || 0) * 4; c.beginPath(); c.arc(409 + lx, 189, 5.5, 0, 7); c.arc(448 + lx, 189, 5.5, 0, 7); c.fill(); }
    c.lineWidth = 5; c.beginPath(); if (o.sad) c.arc(427, 222, 12, Math.PI * 1.15, Math.PI * 1.85); else c.arc(427, 206, 13, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    c.restore();
  }
  function head(c, x, y, r, pl, o = {}) {
    if (pl && pl.stool) { stoolFace(c, x, y + r * 0.05, r * 1.12, { t: performance.now() / 1000, sad: pl.sad, look: pl.look }); return; }
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = pl ? pl.color : '#999'; c.fill();
    const im = pl && photo(pl.id);
    if (im) {
      c.save(); c.clip();
      const s = Math.max((2 * r) / im.naturalWidth, (2 * r) / im.naturalHeight);
      c.drawImage(im, x - (im.naturalWidth * s) / 2, y - (im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      c.restore();
    } else {
      c.fillStyle = '#fff'; c.font = `800 ${Math.round(r * 1.05)}px Changa, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(initials(pl && pl.name), x, y + r * 0.12);
    }
    c.lineWidth = Math.max(2, r * 0.16); c.strokeStyle = pl ? pl.color : '#999';
    c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
    c.lineWidth = Math.max(1.6, r * 0.09); c.strokeStyle = css.line || '#111';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    if (o.gray) { c.globalCompositeOperation = 'saturation'; c.fillStyle = '#888'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  // (x,y) = نقطة القدمين، s = نص قطر الراس
  function char(c, x, y, s, pl, o = {}) {
    const t = o.t != null ? o.t : performance.now() / 1000;
    const f = o.flip || 1;
    const pose = o.pose || 'idle';
    let lean = 0, bob = 0, sq = 1;
    let arms = [0.25, -0.25], legs = [0.12, -0.12], knee = 0;
    const ph = t * 10 + (o.seed || 0);
    switch (pose) {
      case 'idle': bob = Math.sin(t * 3 + (o.seed || 0)) * s * 0.05; arms = [0.25 + Math.sin(t * 2 + (o.seed || 0)) * 0.08, -0.25]; break;
      case 'run': legs = [Math.sin(ph) * 0.6, -Math.sin(ph) * 0.6]; arms = [-Math.sin(ph) * 0.9, Math.sin(ph) * 0.9]; lean = 0.12; bob = Math.abs(Math.sin(ph)) * -s * 0.12; break;
      case 'pull': lean = -0.38 - (o.k || 0) * 0.12; arms = [1.35, 1.5]; legs = [0.45, -0.1]; bob = Math.sin(t * 22) * s * 0.03 * (o.k || 0); break;
      case 'fall': lean = 1.25; arms = [2.6, 2.2]; legs = [0.3, -0.3]; break;
      case 'dance': { const k = o.k || 0; arms = [1.45, -1.45]; legs = [k > 0 ? 0.5 * k : 0, k < 0 ? 0.5 * k : 0]; bob = -Math.abs(k) * s * 0.18; lean = (o.lean || 0); break; }
      case 'hold': arms = [1.0, -0.2]; lean = 0.08; break;
      case 'release': arms = [2.4, -0.5]; lean = -0.15; break;
      case 'throw': { const k = o.k || 0; arms = [k < 0.5 ? -2.4 : 1.2, -0.5]; lean = k < 0.5 ? -0.1 : 0.2; break; }
      case 'duck': sq = 0.62; lean = 0.25; arms = [2.4, 2.0]; break;
      case 'block': arms = [2.1, 1.8]; lean = -0.05; break;
      case 'swing': arms = [3.0, 2.8]; lean = -0.12; break;
      case 'smash': arms = [1.4, 1.2]; lean = 0.3; break;
      case 'blow': lean = 0.18 + (o.k || 0) * 0.15; arms = [0.4, -0.4]; break;
      case 'shoot': arms = [1.57, -0.3]; lean = 0; break;
      case 'cheer': arms = [2.7 + Math.sin(t * 9) * 0.2, -2.7 - Math.sin(t * 9) * 0.2]; bob = -Math.abs(Math.sin(t * 9)) * s * 0.2; break;
      case 'sit': knee = 1; arms = [0.5, -0.3]; break;
      case 'sad': lean = 0.2; arms = [0.1, -0.1]; break;
    }
    const L = s;                         // وحدة
    const hipY = -L * 1.0 * sq, shY = -L * 2.0 * sq, hdY = shY - L * 0.88;
    const cos = Math.cos(lean * f), sin = Math.sin(lean * f);
    const P = (px, py) => [x + px * cos - py * sin, y + bob + px * sin + py * cos];
    const lw = Math.max(2, L * 0.24);
    c.save();
    if (o.alpha != null) c.globalAlpha = o.alpha;
    c.lineCap = 'round'; c.lineJoin = 'round';
    // ظل
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + L * 0.06, L * 0.75, L * 0.18, 0, 0, Math.PI * 2); c.fill();
    // رجلين
    c.strokeStyle = css.line || '#111'; c.lineWidth = lw;
    for (let i = 0; i < 2; i++) {
      const sx = (i ? -1 : 1) * L * 0.22;
      const a = legs[i];
      const h = P(sx, hipY);
      let e;
      if (knee) { const k1 = P(sx + f * L * 0.75, hipY); e = P(sx + f * L * 0.8, 0); c.beginPath(); c.moveTo(...h); c.lineTo(...k1); c.lineTo(...e); c.stroke(); }
      else { e = P(sx + Math.sin(a) * L * f, hipY + Math.cos(a) * L); c.beginPath(); c.moveTo(...h); c.lineTo(...e); c.stroke(); }
      c.fillStyle = css.line || '#111'; c.beginPath(); c.ellipse(e[0] + f * L * 0.1, e[1], L * 0.22, L * 0.12, 0, 0, Math.PI * 2); c.fill();
    }
    // جسم
    const tl = P(-L * 0.58, shY), tr = P(L * 0.58, shY), br = P(L * 0.5, hipY + L * 0.1), bl = P(-L * 0.5, hipY + L * 0.1);
    c.beginPath(); c.moveTo(...tl); c.quadraticCurveTo(...P(0, shY - L * 0.15), ...tr); c.lineTo(...br); c.lineTo(...bl); c.closePath();
    c.fillStyle = pl ? pl.color : '#888'; c.fill(); c.lineWidth = Math.max(1.6, L * 0.14); c.stroke();
    // إيدين
    const hands = [];
    for (let i = 0; i < 2; i++) {
      const sx = (i ? -1 : 1) * L * 0.5;
      const a = arms[i];
      const s0 = P(sx, shY + L * 0.18);
      const hx = sx + Math.sin(a) * L * 1.05 * f, hy = shY + L * 0.18 + Math.cos(a) * L * 1.05;
      const e = P(hx, hy);
      c.strokeStyle = pl ? pl.color : '#888'; c.lineWidth = lw * 1.05; c.beginPath(); c.moveTo(...s0); c.lineTo(...e); c.stroke();
      c.strokeStyle = css.line || '#111'; c.lineWidth = Math.max(1, L * 0.07);
      c.beginPath(); c.moveTo(...s0); c.lineTo(...e); c.stroke();
      c.fillStyle = '#F2C9A0'; c.beginPath(); c.arc(e[0], e[1], L * 0.2, 0, Math.PI * 2); c.fill(); c.lineWidth = Math.max(1.2, L * 0.08); c.stroke();
      hands.push(e);
    }
    const hp = P(0, hdY);
    head(c, hp[0], hp[1], L * 0.95, pl, { gray: o.gray });
    if (o.me) {
      const ay = hp[1] - L * 1.5 + Math.sin(t * 5) * L * 0.12;
      c.fillStyle = css.acc2 || '#E8A317'; c.strokeStyle = css.line; c.lineWidth = 2;
      c.beginPath(); c.moveTo(hp[0] - L * 0.38, ay - L * 0.4); c.lineTo(hp[0] + L * 0.38, ay - L * 0.4); c.lineTo(hp[0], ay + L * 0.1); c.closePath(); c.fill(); c.stroke();
    }
    if (o.label && pl) {
      const fs = Math.max(10, Math.min(15, L * 0.62));
      c.font = `700 ${fs}px Changa, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const nm = pl.name.length > 10 ? pl.name.slice(0, 9) + '…' : pl.name;
      const w = c.measureText(nm).width + 10;
      const ly = y + L * 0.55;
      c.fillStyle = css.paper; c.strokeStyle = pl.color; c.lineWidth = 2;
      rr(c, x - w / 2, ly - fs * 0.7, w, fs * 1.4, fs * 0.6); c.fill(); c.stroke();
      c.fillStyle = css.ink; c.fillText(nm, x, ly + 1);
    }
    if (o.x) { // إشارة إقصاء
      c.strokeStyle = css.bad; c.lineWidth = L * 0.3;
      c.beginPath(); c.moveTo(hp[0] - L * 0.7, hp[1] - L * 0.7); c.lineTo(hp[0] + L * 0.7, hp[1] + L * 0.7); c.moveTo(hp[0] + L * 0.7, hp[1] - L * 0.7); c.lineTo(hp[0] - L * 0.7, hp[1] + L * 0.7); c.stroke();
    }
    c.restore();
    return { hands, head: hp, top: [hp[0], hp[1] - L * 0.95] };
  }

  // ساحة الحارة
  function hara(c, w, h, o = {}) {
    c.fillStyle = css.stone; c.fillRect(0, 0, w, h);
    // بلاط
    const ts = Math.max(26, Math.min(w, h) / 9);
    c.strokeStyle = css.dark ? 'rgba(255,255,255,.05)' : 'rgba(80,50,20,.10)'; c.lineWidth = 1.5;
    for (let yy = (o.wall ? h * 0.2 : 0); yy < h; yy += ts) { const off = (Math.floor(yy / ts) % 2) * ts / 2; c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke(); for (let xx = -off; xx < w; xx += ts) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + ts); c.stroke(); } }
    if (o.wall) {
      const wh = h * 0.2;
      c.fillStyle = css.wall; c.fillRect(0, 0, w, wh);
      c.strokeStyle = css.line; c.lineWidth = 3; c.beginPath(); c.moveTo(0, wh); c.lineTo(w, wh); c.stroke();
      // أبواب وشبابيك
      const n = Math.max(3, Math.round(w / 140));
      for (let i = 0; i < n; i++) {
        const cx = ((i + 0.5) / n) * w;
        if (i % 2 === 0) { const dw = Math.min(46, w / n * 0.4), dh = wh * 0.7; c.fillStyle = css.dark ? '#5a3b2a' : '#8A5A3B'; rr(c, cx - dw / 2, wh - dh, dw, dh, dw / 2); c.fill(); c.lineWidth = 2.5; c.stroke(); }
        else { const ww = Math.min(34, w / n * 0.3); c.fillStyle = css.dark ? '#F2C66B' : '#7FB7C9'; rr(c, cx - ww / 2, wh * 0.22, ww, ww * 1.1, ww / 2); c.fill(); c.lineWidth = 2.5; c.stroke(); }
      }
      // زينة (حبل أعلام)
      c.lineWidth = 1.5; c.strokeStyle = css.line; c.beginPath(); c.moveTo(0, wh * 0.12);
      for (let xx = 0; xx <= w; xx += w / 8) c.quadraticCurveTo(xx + w / 16, wh * 0.32, xx + w / 8, wh * 0.12);
      c.stroke();
      const cols = [css.acc, css.acc2, css.acc3, css.ok];
      for (let i = 0; i < 16; i++) { const xx = (i + 0.5) * w / 16, yy = wh * 0.12 + Math.sin(((i % 2) + 0.5) * Math.PI / 2) * wh * 0.12 * 0.9; c.fillStyle = cols[i % 4]; c.beginPath(); c.moveTo(xx - 6, yy); c.lineTo(xx + 6, yy); c.lineTo(xx, yy + 12); c.closePath(); c.fill(); c.lineWidth = 1.2; c.stroke(); }
    }
  }

  function txt(c, s, x, y, size, o = {}) {
    c.save();
    c.font = `${o.w || 800} ${size}px ${o.f || 'Changa'}, Changa, sans-serif`; c.textAlign = o.a || 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineWidth = o.sw || size * 0.18; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = o.color || css.ink; c.fillText(s, x, y);
    c.restore();
  }

  function sticker(c, s, x, y, size, bg, fg, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.font = `800 ${size}px Changa, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(s).width + size * 0.9, h = size * 1.35;
    c.fillStyle = css.line; rr(c, -w / 2 + 3, -h / 2 + 3, w, h, size * 0.35); c.fill();
    c.fillStyle = bg; rr(c, -w / 2, -h / 2, w, h, size * 0.35); c.fill(); c.lineWidth = 2.5; c.strokeStyle = css.line; c.stroke();
    c.fillStyle = fg; c.fillText(s, 0, size * 0.1);
    c.restore();
  }

  function hearts(c, x, y, n, max, size) {
    for (let i = 0; i < max; i++) {
      const xx = x + (i - (max - 1) / 2) * size * 1.15;
      c.save(); c.translate(xx, y); c.scale(size / 20, size / 20);
      c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-12, -4, -6, -14, 0, -6); c.bezierCurveTo(6, -14, 12, -4, 0, 6); c.closePath();
      c.fillStyle = i < n ? css.bad : 'rgba(0,0,0,.15)'; c.fill(); c.lineWidth = 2; c.strokeStyle = css.line; c.stroke(); c.restore();
    }
  }

  return { readCss, css: () => css, setPhoto, photo, initials, head, stoolFace, char, hara, txt, sticker, rr, hearts };
})();
