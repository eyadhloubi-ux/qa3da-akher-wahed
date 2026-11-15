// صورة النتيجة (ستوري 1080×1920) بروح «قعدة آخر واحد»: ساحة الحارة، حبال الزينة، الشخصيات المرسومة براس اللاعب
// 3 أشكال: المنصّة · الأفيش · لوح الطباشير — وكل شكل نهار (فاتح) وليل (داكن)
// الثوابت بس: أيقونة القعدة باللوغو، كرسي العيلة واسمها، الاسم والصورة وصورة الشلة، @eyad.hloubi
'use strict';
const STORY = (() => {
  const W = 1080, H = 1920;
  const INK = '#1E1B18', PAPER = '#FFF6E6';
  const FLAGS = ['#E2553D', '#E8A317', '#2A7DE1', '#2BA36B', '#FFF6E6'];
  const THEMES = {
    light: { night: false, sky1: '#8FCBE0', sky2: '#E9F2E4', wall: '#DDBE90', wall2: '#D2AF7E', joint: 'rgba(110,70,30,.22)', ground: '#E9D6B2', tile: 'rgba(110,70,30,.14)', txt: INK, soft: '#5E5145', door: '#8A5A3B', win: '#7FB7C9', board: '#1F3A30', chalk: '#F4F1E6' },
    dark: { night: true, sky1: '#121733', sky2: '#2C2B52', wall: '#6A5545', wall2: '#5E4B3D', joint: 'rgba(0,0,0,.28)', ground: '#3D3640', tile: 'rgba(0,0,0,.25)', txt: '#F6EBD8', soft: '#D9C9B2', door: '#3E2A20', win: '#F2C66B', board: '#16261F', chalk: '#F4F1E6' },
  };
  let seed = 1; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

  // ───── أدوات
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, s, max, size, font) { let fs = size; do { c.font = font.replace('%', fs); if (c.measureText(s).width <= max) break; fs -= 2; } while (fs > 18); return fs; }
  function txt(c, s, x, y, size, color, o = {}) {
    const f = o.font || '800 %px Changa, Changa, sans-serif';
    const fs = fit(c, s, o.max || 940, size, f);
    c.font = f.replace('%', fs); c.textAlign = o.a || 'center'; c.textBaseline = o.b || 'middle'; c.direction = o.dir || 'rtl';
    if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || fs * 0.16; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
    c.fillStyle = color; c.fillText(s, x, y); return fs;
  }
  function cover(c, im, x, y, w, h) { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); c.drawImage(im, x + (w - im.naturalWidth * s) / 2, y + (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); }
  function initials(n) { const p = String(n || '؟').trim().split(/\s+/); return (p[0] || '؟').slice(0, 2); }
  function face(c, p, x, y, w, h) {
    if (p.photo && p.photo.naturalWidth) cover(c, p.photo, x, y, w, h);
    else { c.fillStyle = p.color || '#E2553D'; c.fillRect(x, y, w, h); txt(c, initials(p.name), x + w / 2, y + h / 2 + Math.min(w, h) * 0.05, Math.min(w, h) * 0.42, '#fff'); }
  }
  function headCircle(c, p, x, y, r, ring) {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip(); face(c, p, x - r, y - r, r * 2, r * 2); c.restore();
    c.lineWidth = r * 0.14; c.strokeStyle = ring || p.color || INK; c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, 7); c.stroke();
    c.lineWidth = Math.max(3, r * 0.07); c.strokeStyle = INK; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
  }
  // صورة الشلة، وإذا ما في: وجوه الشلة مصفوفين
  // صورة الشلة، وإذا ما في: اسم القعدة محلها (قواعد قعدة)
  function group(c, d, x, y, w, h, bg) {
    if (d.group && d.group.naturalWidth) { cover(c, d.group, x, y, w, h); return; }
    c.fillStyle = bg || '#E8A317'; c.fillRect(x, y, w, h);
    c.save(); c.globalAlpha = 0.12; c.fillStyle = INK; for (let i = -h; i < w; i += 46) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.lineTo(x + i + h + 18, y); c.lineTo(x + i + 18, y + h); c.fill(); } c.restore();
    const nm = d.sessName || d.sess || 'قعدتنا';
    txt(c, nm, x + w / 2, y + h / 2 - h * 0.06, Math.min(h * 0.3, 110), INK, { max: w * 0.86 });
    if (d.sessType) txt(c, d.sessType, x + w / 2, y + h / 2 + h * 0.22, Math.min(h * 0.12, 40), INK, { font: '600 %px Changa, sans-serif', max: w * 0.8 });
  }
  function ptsLine(d) { const p = Math.round(d.pts * 100) / 100; return `${p} ${p === 1 ? 'نقطة' : 'نقاط'} من ${d.games} ${d.games === 1 || d.games > 10 ? 'لعبة' : 'ألعاب'}`; }
  function burst(c, x, y, r, fill, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); const n = 14;
    const path = () => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, q = i % 2 ? r * 0.8 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); };
    c.translate(9, 9); path(); c.fillStyle = INK; c.fill(); c.translate(-9, -9); path(); c.fillStyle = fill; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.restore();
  }
  function tape(c, x, y, w, rot, col = 'rgba(232,210,150,.85)') { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.fillRect(-w / 2, -24, w, 48); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-w / 2, -24, w, 10); c.restore(); }

  // ───── الحارة
  function sky(c, T, h) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, T.sky1); g.addColorStop(1, T.sky2); c.fillStyle = g; c.fillRect(0, 0, W, h);
    seed = 5;
    if (T.night) {
      for (let i = 0; i < 25; i++) { c.fillStyle = `rgba(255,248,220,${0.35 + rnd() * 0.6})`; c.beginPath(); c.arc(rnd() * W, rnd() * h * 0.9, 1.5 + rnd() * 2.5, 0, 7); c.fill(); }
      c.fillStyle = '#F7E7B4'; c.beginPath(); c.arc(170, 300, 58, 0, 7); c.fill(); c.fillStyle = T.sky1; c.beginPath(); c.arc(196, 284, 52, 0, 7); c.fill();
    } else {
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (const [x, y, s] of [[200, 300, 0.9]]) { c.beginPath(); c.ellipse(x, y, 90 * s, 34 * s, 0, 0, 7); c.ellipse(x + 60 * s, y - 20 * s, 60 * s, 34 * s, 0, 0, 7); c.ellipse(x - 60 * s, y - 6 * s, 50 * s, 26 * s, 0, 0, 7); c.fill(); }
    }
  }
  function wall(c, T, y0, y1, o = {}) {
    c.fillStyle = T.wall; c.fillRect(0, y0, W, y1 - y0);
    c.strokeStyle = T.joint; c.globalAlpha = 0.5; c.lineWidth = 4;
    for (let y = y0 + 110, row = 0; y < y1; y += 110, row++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (row % 2) * 120 + 60; x < W; x += 240) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 110); c.stroke(); } }
    c.globalAlpha = 1;
    if (o.top !== false) { c.fillStyle = INK; c.fillRect(0, y0 - 6, W, 12); }
  }
  function ground(c, T, y0) {
    c.fillStyle = T.ground; c.fillRect(0, y0, W, H - y0);
    c.strokeStyle = T.tile; c.lineWidth = 3; c.globalAlpha = 0.5; const ts = 220;
    for (let y = y0, i = 0; y < H; y += ts * 0.55, i++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (i % 2) * ts / 2; x < W; x += ts) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + ts * 0.55); c.stroke(); } }
    c.globalAlpha = 1; c.fillStyle = INK; c.fillRect(0, y0 - 5, W, 10);
  }
  // حبل زينة (أعلام) وبالليل لمبات
  function bunting(c, T, y, sag = 70, n = 14, x0 = -20, x1 = W + 20) {
    const pt = (t) => [x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI) * sag];
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 40; i++) { const [x, yy] = pt(i / 40); i ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, [x, yy] = pt(t);
      if (T.night && i % 2) {
        const g = c.createRadialGradient(x, yy + 18, 2, x, yy + 18, 46); g.addColorStop(0, 'rgba(255,214,120,.75)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, yy + 18, 46, 0, 7); c.fill();
        c.fillStyle = '#FFD878'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(x, yy + 20, 11, 15, 0, 0, 7); c.fill(); c.stroke();
      } else {
        c.fillStyle = FLAGS[i % FLAGS.length]; c.strokeStyle = INK; c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(x - 24, yy - 2); c.lineTo(x + 24, yy - 2); c.lineTo(x, yy + 48); c.closePath(); c.fill(); c.stroke();
      }
    }
  }
  function door(c, T, x, y, w, h) { c.fillStyle = T.door; rr(c, x, y, w, h + 20, w / 2); c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + w / 2, y + w / 2); c.lineTo(x + w / 2, y + h); c.stroke(); c.fillStyle = '#E8A317'; c.beginPath(); c.arc(x + w * 0.62, y + h * 0.6, 7, 0, 7); c.fill(); }
  function windowA(c, T, x, y, w, h) {
    if (T.night) { const g = c.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 1.3); g.addColorStop(0, 'rgba(255,210,110,.45)'); g.addColorStop(1, 'rgba(255,210,110,0)'); c.fillStyle = g; c.fillRect(x - w, y - h, w * 3, h * 3); }
    c.fillStyle = T.win; rr(c, x, y, w, h, w / 2); c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(x + w / 2, y + 6); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.55); c.lineTo(x + w, y + h * 0.55); c.stroke();
  }
  // الشريط فوق: كرسي العيلة واسمها يمين، وأيقونة القعدة شمال
  // الزاوية فوق: أيقونة القعدة بس (فيها اللوغو)
  function header(c) { BRAND.drawIcon(c, W - 64 - 116, 84, 116); }
  function footer(c, col) { txt(c, '@eyad.hloubi', W / 2, H - 150, 30, col, { font: '600 %px Changa, sans-serif', a: 'center', dir: 'ltr' }); }

  // شخصية مرسومة وراسها صورة اللاعب (من draw.js)
  function dude(c, p, x, y, s, pose, me) {
    if (typeof D === 'undefined') return; const pl = { id: p.id, name: p.name, color: p.color };
    D.char(c, x, y, s, pl, { pose, t: 0.35 + (p.seed || 0), seed: p.seed || 0 });
    if (me) { // تاج فوق راس صاحب الستوري
      const top = y - s * 3.95; c.save(); c.translate(x, top); c.fillStyle = '#E8A317'; c.strokeStyle = INK; c.lineWidth = 5;
      c.beginPath(); c.moveTo(-s * 0.7, 0); c.lineTo(-s * 0.8, -s * 0.75); c.lineTo(-s * 0.35, -s * 0.35); c.lineTo(0, -s * 0.95); c.lineTo(s * 0.35, -s * 0.35); c.lineTo(s * 0.8, -s * 0.75); c.lineTo(s * 0.7, 0); c.closePath(); c.fill(); c.stroke(); c.restore();
    }
  }
  function bottomName(c, d, T, y, col) {
    txt(c, d.name, W / 2, y, 96, col, { max: 940 });
    txt(c, `${d.title} · ${ptsLine(d)}`, W / 2, y + 86, 38, col === INK ? T.soft : '#E9DCC6', { font: '600 %px Changa, sans-serif', max: 940 });
  }

  // ── 1) المنصّة: حيط الحارة وصورة الشلة معلّقة عليه، يافطة اللقب، والمنصّة عليها شخصيات الأوائل
  function layoutPodium(c, d, T) {
    sky(c, T, 420); wall(c, T, 360, 1150);
    bunting(c, T, 372, 40, 9);
    // صورة الشلة بإطار خشب معلّقة بمسمار
    c.save(); c.translate(W / 2, 600); c.rotate(-0.035);
    c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(-160, -186); c.lineTo(0, -236); c.lineTo(160, -186); c.stroke();
    c.fillStyle = '#E8A317'; c.beginPath(); c.arc(0, -238, 11, 0, 7); c.fill(); c.lineWidth = 4; c.stroke();
    c.fillStyle = 'rgba(0,0,0,.28)'; rr(c, -280 + 14, -190 + 16, 560, 380, 12); c.fill();
    c.fillStyle = '#8A5A3B'; rr(c, -280, -190, 560, 380, 12); c.fill(); c.lineWidth = 6; c.stroke();
    c.save(); c.beginPath(); c.rect(-252, -162, 504, 324); c.clip(); group(c, d, -252, -162, 504, 324); c.restore();
    c.lineWidth = 5; c.strokeRect(-252, -162, 504, 324);
    c.restore();
    // يافطة اللقب (يافطة محل)
    c.save(); c.translate(W / 2, 858);
    c.fillStyle = INK; rr(c, -360 + 10, -66 + 10, 720, 132, 16); c.fill();
    c.fillStyle = '#1F6B4A'; rr(c, -360, -66, 720, 132, 16); c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = '#FFF6E6'; c.lineWidth = 3; rr(c, -342, -50, 684, 100, 10); c.stroke();
    txt(c, d.title, 0, 4, 78, '#FFF6E6', { max: 620 });
    c.restore();
    ground(c, T, 1150);
    // المنصّة
    const rk = d.rank || []; const by = (pos) => rk.filter((r) => r.pos === pos);
    const top = []; for (const r of rk) { if (top.length >= 3) break; top.push(r); }
    const slots = [{ x: W / 2, h: 230, n: 1, col: '#E8A317' }, { x: W / 2 + 270, h: 160, n: 2, col: '#2A7DE1' }, { x: W / 2 - 270, h: 105, n: 3, col: '#E2553D' }];
    const baseY = 1440;
    slots.forEach((s, i) => {
      c.fillStyle = INK; c.fillRect(s.x - 120 + 10, baseY - s.h + 10, 240, s.h); c.fillStyle = s.col; c.fillRect(s.x - 120, baseY - s.h, 240, s.h); c.lineWidth = 7; c.strokeStyle = INK; c.strokeRect(s.x - 120, baseY - s.h, 240, s.h);
      txt(c, String(top[i] ? top[i].pos : s.n), s.x, baseY - s.h / 2 + 6, Math.min(110, s.h * 0.7), '#FFF6E6', { stroke: INK, sw: 10 });
      if (top[i]) dude(c, Object.assign({ seed: i }, top[i]), s.x, baseY - s.h - 8, 56, i === 0 ? 'cheer' : 'idle', top[i].me);
    });
    // إذا مو بالتلاتة الأوائل: بيوقف قدّام بلافتة مركزه
    const mine = rk.find((r) => r.me);
    if (mine && !top.includes(mine)) {
      dude(c, Object.assign({ seed: 7 }, mine), W - 72, 1450, 44, 'idle', false);
      burst(c, W - 80, 1180, 52, '#E8A317', 0.2); txt(c, String(mine.pos), W - 80, 1184, 50, INK);
    }
    // اللوحة تحت
    c.fillStyle = 'rgba(30,27,24,.0)';
    bottomName(c, d, T, 1555, T.night ? '#F6EBD8' : INK);
    header(c); footer(c, T.night ? '#D9C9B2' : '#5E5145');
  }

  // ── 2) الأفيش: أفيش ملزوق عحيط الحارة متل أفيشات المباريات، صورتك كبيرة واسمك عريض
  function roughRect(c, x, y, w, h, amp) {
    seed = 21; c.beginPath(); const st = 26;
    for (let i = 0; i <= w; i += st) c.lineTo(x + i, y + (rnd() - 0.5) * amp);
    for (let i = 0; i <= h; i += st) c.lineTo(x + w + (rnd() - 0.5) * amp, y + i);
    for (let i = w; i >= 0; i -= st) c.lineTo(x + i, y + h + (rnd() - 0.5) * amp);
    for (let i = h; i >= 0; i -= st) c.lineTo(x + (rnd() - 0.5) * amp, y + i);
    c.closePath();
  }
  function layoutPoster(c, d, T) {
    wall(c, T, 0, H, { top: false, seed: 4 });
    if (T.night) { // ضو لمبة الشارع
      c.fillStyle = 'rgba(10,10,25,.35)'; c.fillRect(0, 0, W, H);
      const g = c.createRadialGradient(W / 2, 120, 20, W / 2, 700, 1100); g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // بقايا أفيشات قديمة
    // الأفيش
    c.save(); c.translate(W / 2, 870); c.rotate(-0.025);
    const pw = 860, ph = 1180, px = -pw / 2, py = -ph / 2;
    c.fillStyle = 'rgba(0,0,0,.3)'; roughRect(c, px + 16, py + 20, pw, ph, 14); c.fill();
    c.fillStyle = PAPER; roughRect(c, px, py, pw, ph, 14); c.fill();
    // راس الأفيش
    c.fillStyle = '#E2553D'; c.fillRect(px + 34, py + 36, pw - 68, 150);
    txt(c, d.pos === 1 ? 'بطل الحارة' : 'من أبطال الحارة', 20, py + 112, 86, PAPER, { max: pw - 220 });
    // الصورة
    c.save(); c.beginPath(); c.rect(px + 34, py + 210, pw - 68, 580); c.clip(); face(c, d, px + 34, py + 210, pw - 68, 580);
    c.fillStyle = 'rgba(226,85,61,.12)'; c.fillRect(px + 34, py + 210, pw - 68, 580); c.restore();
    c.lineWidth = 6; c.strokeStyle = INK; c.strokeRect(px + 34, py + 210, pw - 68, 580);
    // الاسم
    txt(c, d.name, 0, py + 870, 112, INK, { max: pw - 90 });
    c.fillStyle = INK; c.fillRect(px + 60, py + 942, pw - 120, 8);
    txt(c, d.title, 0, py + 1008, 70, '#E2553D', { max: pw - 120 });
    txt(c, ptsLine(d), 0, py + 1090, 36, '#5E5145', { font: '600 %px Changa, sans-serif', max: pw - 120 });
    tape(c, px + 60, py + 10, 170, -0.5); tape(c, -px - 60, py + 10, 170, 0.5);
    c.restore();
    // نجمة المركز
    burst(c, 150, 330, 96, '#E8A317', -0.15); txt(c, '#' + d.pos, 150, 336, 80, INK, { dir: 'ltr' });
    // صورة الشلة: أفيش صغير ملزوق فوق الزاوية
    c.save(); c.translate(290, 1560); c.rotate(0.06);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-190 + 12, -140 + 14, 380, 290); c.fillStyle = PAPER; c.fillRect(-190, -140, 380, 290);
    c.save(); c.beginPath(); c.rect(-172, -122, 344, 210); c.clip(); group(c, d, -172, -122, 344, 210); c.restore();
    if (d.group && d.group.naturalWidth) txt(c, d.sessName || d.sess, 0, 122, 34, INK, { max: 330 }); else txt(c, d.sessType || '', 0, 122, 30, INK, { font: '600 %px Changa, sans-serif', max: 330 });
    tape(c, 0, -142, 140, -0.04);
    c.restore();
    header(c); footer(c, T.night ? '#F6EBD8' : INK);
  }

  // ── 3) لوح الطباشير: صورة الشلة عحبل الغسيل، ولوح النتيجة بخط الطبشورة، وشخصيتك قدّامه
  function layoutBoard(c, d, T) {
    sky(c, T, 560); wall(c, T, 520, 1500, { seed: 17 });
    ground(c, T, 1500);
    // حبل غسيل ومشابك
    c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(-10, 240); c.quadraticCurveTo(W / 2, 330, W + 10, 240); c.stroke();
    c.save(); c.translate(W / 2 - 20, 500); c.rotate(0.04);
    // صورة قديمة بحواف مسنّنة
    const pw = 600, ph = 470;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(-pw / 2 + 14, -ph / 2 + 16, pw, ph);
    c.fillStyle = PAPER; c.beginPath(); const z = 14;
    for (let x = -pw / 2; x <= pw / 2; x += z) c.lineTo(x, -ph / 2 + ((x / z) % 2 ? 6 : 0));
    for (let y = -ph / 2; y <= ph / 2; y += z) c.lineTo(pw / 2 - ((y / z) % 2 ? 6 : 0), y);
    for (let x = pw / 2; x >= -pw / 2; x -= z) c.lineTo(x, ph / 2 - ((x / z) % 2 ? 6 : 0));
    for (let y = ph / 2; y >= -ph / 2; y -= z) c.lineTo(-pw / 2 + ((y / z) % 2 ? 6 : 0), y);
    c.closePath(); c.fill();
    c.save(); c.beginPath(); c.rect(-pw / 2 + 30, -ph / 2 + 30, pw - 60, ph - 110); c.clip(); group(c, d, -pw / 2 + 30, -ph / 2 + 30, pw - 60, ph - 110); c.restore();
    if (d.group && d.group.naturalWidth) txt(c, d.sessName || d.sess, 0, ph / 2 - 42, 40, INK, { font: '600 %px Changa, sans-serif', max: pw - 80 }); else txt(c, '📸 ' + (d.sessType || ''), 0, ph / 2 - 42, 34, INK, { font: '600 %px Changa, sans-serif', max: pw - 80 });
    for (const xx of [-pw / 2 + 110, pw / 2 - 110]) { c.fillStyle = '#C98B4F'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, xx - 14, -ph / 2 - 50, 28, 90, 8); c.fill(); c.stroke(); }
    c.restore();
    // اللوح
    const bx = 90, by = 790, bw = 900, bh = 700;
    c.fillStyle = INK; rr(c, bx + 12, by + 14, bw, bh, 18); c.fill();
    c.fillStyle = '#9A6A42'; rr(c, bx, by, bw, bh, 18); c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.fillStyle = T.board; c.fillRect(bx + 30, by + 30, bw - 60, bh - 60);
    txt(c, 'نتيجة القعدة', W / 2, by + 95, 60, T.chalk, { max: 700 });
    c.strokeStyle = T.chalk; c.lineWidth = 4; c.beginPath(); c.moveTo(W / 2 - 200, by + 140); c.quadraticCurveTo(W / 2, by + 152, W / 2 + 200, by + 138); c.stroke();
    const rk = d.rank || []; let rows = rk.slice(0, 5); const mine = rk.find((r) => r.me); if (mine && !rows.includes(mine)) rows = rk.slice(0, 4).concat(mine);
    const rh = 92;
    rows.forEach((r, i) => {
      const y = by + 210 + i * rh;
      if (r.me) { c.strokeStyle = '#E8A317'; c.lineWidth = 6; c.beginPath(); c.ellipse(W / 2, y, 395, 46, -0.01, 0, 7); c.stroke(); }
      txt(c, String(r.pos), bx + bw - 90, y + 4, 54, r.me ? '#E8A317' : T.chalk, { dir: 'ltr' });
      headCircle(c, r, bx + bw - 180, y, 36);
      txt(c, r.name, bx + bw - 236, y + 4, 46, T.chalk, { a: 'right', max: 400 });
      txt(c, String(Math.round(r.pts * 100) / 100), bx + 110, y + 4, 50, r.me ? '#E8A317' : T.chalk, { dir: 'ltr' });
    });
    // شخصية صاحب الستوري قدّام اللوح
    if (mine) dude(c, Object.assign({ seed: 3 }, mine), 165, 1650, 46, mine.pos === 1 ? 'cheer' : 'idle', false);
    txt(c, d.name, W / 2 + 90, 1560, 72, T.night ? '#F6EBD8' : INK, { max: 640 });
    txt(c, `${d.title} · ${ptsLine(d)}`, W / 2 + 90, 1630, 34, T.night ? '#E9DCC6' : '#5E5145', { font: '600 %px Changa, sans-serif', max: 640 });
    header(c); footer(c, T.night ? '#D9C9B2' : '#5E5145');
  }

  function render(cv, d, layout, theme) {
    const c = cv.getContext('2d'); const T = THEMES[theme] || THEMES.light;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    if (layout === 'poster') layoutPoster(c, d, T); else if (layout === 'board') layoutBoard(c, d, T); else layoutPodium(c, d, T);
  }
  return { render };
})();
