// رسم كل لعبة وأزرار التحكم فيها
const GUI = (() => {
  let A = null;        // api: {me, send, P, sNow, haptic}
  const sm = {};       // تنعيم المواقع
  const lerp = (a, b, k) => a + (b - a) * k;
  function smooth(key, x, y, k = 0.35) { const s = sm[key]; if (!s || Math.hypot(s[0] - x, s[1] - y) > 0.25) { sm[key] = [x, y]; return sm[key]; } s[0] = lerp(s[0], x, k); s[1] = lerp(s[1], y, k); return s; }
  const css = () => D.css();
  const P = (id) => (A && A.P(id)) || { id, name: '؟', color: '#999' };
  const isMe = (id) => A && id === A.me;
  const vib = (n) => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };

  // ───── أدوات التحكم ─────
  function btn(el, label, sub, cls, on) {
    const b = document.createElement('button'); b.className = 'cbtn ' + (cls || ''); b.innerHTML = label + (sub ? `<small>${sub}</small>` : '') + '<span class="cd" style="transform:scaleX(0)"></span>';
    const down = (e) => { e.preventDefault(); b.classList.add('down'); SFX.unlock(); on && on.down && on.down(e); };
    const up = (e) => { b.classList.remove('down'); on && on.up && on.up(e); };
    b.addEventListener('pointerdown', (e) => { try { b.setPointerCapture(e.pointerId); } catch (x) {} down(e); });
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', (e) => { if (b.classList.contains('down')) up(e); });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    el.appendChild(b); return b;
  }
  // زرّين حالة مستمرة: واحد منهن دايماً شغّال
  function modeBtns(el, a, b) {
    el.innerHTML = '';
    const mk = (o, cls) => btn(el, o.label, o.sub, cls + ' mode', { down: () => { A.send({ a: 'mode', v: o.v }); vib(8); } });
    return { [a.v]: mk(a, ''), [b.v]: mk(b, 'alt') };
  }
  function setMode(bs, mode, stamKey, st) {
    for (const k in bs) bs[k].classList.toggle('on', k === mode);
    const hb = bs[stamKey]; if (!hb || !st) return;
    setCd(hb, 1 - st.stam / 3); hb.classList.toggle('tired', !!st.tired);
  }
  function setCd(b, frac) { const s = b.querySelector('.cd'); if (s) s.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`; }

  function joystick(el) {
    const j = document.createElement('div'); j.className = 'joy'; j.innerHTML = '<i></i>';
    const k = j.querySelector('i');
    let act = false, last = 0, v = [0, 0], sentV = [9, 9];
    const send = (force) => { const t = performance.now(); if (!force && t - last < 70) return; if (Math.abs(v[0] - sentV[0]) < 0.05 && Math.abs(v[1] - sentV[1]) < 0.05 && !force) return; last = t; sentV = v.slice(); A.send({ a: 'mv', v: v.map((x) => Math.round(x * 100) / 100) }); };
    const setFrom = (e) => { const r = j.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } v = [x, y]; k.style.transform = `translate(calc(-50% + ${x * r.width * 0.32}px), calc(-50% + ${y * r.height * 0.32}px))`; send(); };
    j.addEventListener('pointerdown', (e) => { e.preventDefault(); act = true; try { j.setPointerCapture(e.pointerId); } catch (x) {} setFrom(e); });
    j.addEventListener('pointermove', (e) => { if (act) setFrom(e); });
    const end = () => { act = false; v = [0, 0]; k.style.transform = 'translate(-50%,-50%)'; send(true); };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
    el.appendChild(j);
    // كيبورد للابتوب
    const keys = {};
    const kv = () => { const x = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), y = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0); const l = Math.hypot(x, y) || 1; v = [x / l, y / l]; send(true); };
    const kd = (e) => { if (/Arrow|^[wasd]$/.test(e.key)) { keys[e.key] = 1; kv(); e.preventDefault(); } }, ku = (e) => { if (keys[e.key]) { delete keys[e.key]; kv(); } };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    j._cleanup = () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    return j;
  }
  function note(el, t) { const n = document.createElement('div'); n.className = 'ctl-note'; n.textContent = t; el.appendChild(n); return n; }

  // ───── تقسيم المباريات ─────
  function layout(ms, w, h) {
    if (!ms.length) return [];
    const mine = ms.find((m) => m.ps.includes(A.me));
    const main = mine || ms[0];
    if (ms.length === 1) return [{ m: main, x: 0, y: 0, w, h, big: true }];
    const rest = ms.filter((m) => m !== main);
    const mh = Math.round(h * (rest.length > 4 ? 0.52 : 0.58));
    const out = [{ m: main, x: 0, y: 0, w, h: mh, big: true }];
    const cols = rest.length <= 2 ? rest.length : rest.length <= 4 ? 2 : rest.length <= 6 ? 3 : 4;
    const rows = Math.ceil(rest.length / cols), cw = w / cols, ch = (h - mh) / rows;
    rest.forEach((m, i) => out.push({ m, x: (i % cols) * cw, y: mh + Math.floor(i / cols) * ch, w: cw, h: ch, big: false }));
    return out;
  }
  function panel(c, r) {
    if (r.big) return;
    c.save(); c.fillStyle = css().dark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.35)'; c.strokeStyle = css().line; c.lineWidth = 2;
    D.rr(c, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 10); c.fill(); c.stroke(); c.restore();
  }
  function bracketHeader(c, w, g) {
    if (g.phase === 'pairs') {
      c.save(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 0, w, 9999); c.restore();
      D.sticker(c, g.msg || 'الجولة', w / 2, 40, 26, css().acc2, '#1E1B18', -0.04);
    }
  }
  function matchTimer(c, r, m, g) {
    if (!m.max || m.done || g.phase !== 'fight') return;
    const frac = Math.max(0, 1 - m.t / m.max);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(r.x + 10, r.y + 8, r.w - 20, 5);
    c.fillStyle = frac < 0.25 ? css().bad : css().acc2; c.fillRect(r.x + 10, r.y + 8, (r.w - 20) * frac, 5);
  }
  function vsMark(c, x, y, s) { D.sticker(c, 'ضد', x, y, s, css().ink, css().bg, 0.05); }
  function doneMark(c, r, m) {
    if (!m.done || !m.winner) return;
    const s = r.big ? 20 : 13;
    D.sticker(c, isMe(m.winner) ? 'ربحت!' : 'ربح ' + P(m.winner).name.slice(0, 8), r.x + r.w / 2, r.y + (r.big ? 34 : 20), s, css().ok, '#fff', -0.05);
  }
  function triAnchors(n, cx, cy, R) { return Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; }); }

  // ───── 1) شدّ الحبل ─────
  const tug = {
    controls(el) { el.innerHTML = ''; btn(el, 'شدّ! 💪', 'كبس بسرعة', '', { down: () => { A.send({ a: 'tap' }); vib(8); } }); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {});
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m, t = performance.now() / 1000;
        const s = Math.min(r.w / 14, r.h / 7.5, r.big ? 30 : 15);
        const cx = r.x + r.w / 2, gy = r.y + r.h * 0.74;
        if (m.ps.length === 2 || m.active.length === 2 && m.ps.length === 2) {
          const [a, b] = m.ps;
          const sp = smooth('tug' + m.id, m.pos, 0, 0.3);
          const off = sp[0] * r.w * 0.17;
          // خط النص
          c.strokeStyle = css().acc; c.lineWidth = 4; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(cx, gy - s * 3.5); c.lineTo(cx, gy + s * 0.6); c.stroke(); c.setLineDash([]);
          const ax = cx + off - r.w * 0.28, bx = cx + off + r.w * 0.28;
          const la = m.done && m.winner !== a, lb = m.done && m.winner !== b;
          const ha = D.char(c, ax, gy, s, P(a), { pose: la ? 'fall' : m.done ? 'cheer' : 'pull', flip: 1, k: 1, t: t + 0.2, me: isMe(a), label: true, seed: 1 });
          const hb = D.char(c, bx, gy, s, P(b), { pose: lb ? 'fall' : m.done ? 'cheer' : 'pull', flip: -1, k: 1, t, me: isMe(b), label: true, seed: 2 });
          c.strokeStyle = '#B07B3F'; c.lineWidth = Math.max(3, s * 0.28); c.lineCap = 'round';
          const y1 = gy - s * 1.6;
          c.beginPath(); c.moveTo(ax + s * 0.6, y1); c.quadraticCurveTo(cx + off, y1 + s * 0.25 + Math.sin(t * 14) * 2, bx - s * 0.6, y1); c.stroke();
          c.fillStyle = css().acc; c.beginPath(); c.moveTo(cx + off, y1); c.lineTo(cx + off, y1 + s * 1.3); c.lineTo(cx + off + s * 0.7, y1 + s * 0.9); c.lineTo(cx + off, y1 + s * 0.5); c.fill(); c.strokeStyle = css().line; c.lineWidth = 1.5; c.stroke();
        } else {
          const R = Math.min(r.w, r.h) * 0.32, cy = r.y + r.h * 0.5;
          const act = m.active.length === 3 ? m.ps : m.ps;
          const an = triAnchors(act.length, cx, cy, R);
          const k = smooth('tug' + m.id, m.xy[0], m.xy[1], 0.3);
          const kx = cx + k[0] * R * 0.9, ky = cy + k[1] * R * 0.9;
          act.forEach((p, i) => {
            const out = m.done && m.winner !== p;
            const [px, py] = an[i];
            c.strokeStyle = '#B07B3F'; c.lineWidth = Math.max(3, s * 0.26); c.beginPath(); c.moveTo(px, py - s * 1.6); c.lineTo(kx, ky); c.stroke();
            D.char(c, px, py, s, P(p), { pose: out ? 'fall' : m.done ? 'cheer' : 'pull', flip: px < kx ? 1 : -1, k: 1, me: isMe(p), label: true, seed: i });
          });
          c.fillStyle = css().acc; c.beginPath(); c.arc(kx, ky, s * 0.45, 0, 7); c.fill(); c.strokeStyle = css().line; c.lineWidth = 2; c.stroke();
        }
        matchTimer(c, r, m, g); doneMark(c, r, m);
      }
      bracketHeader(c, w, g);
    },
  };

  // ───── 2) حجرة ورقة مقص ─────
  const HAND = { r: '✊', p: '✋', s: '✌️' }, HNAME = { r: 'حجرة', p: 'ورقة', s: 'مقص' };
  const rps = {
    controls(el) {
      el.innerHTML = ''; this.btns = {};
      for (const k of ['r', 'p', 's']) this.btns[k] = btn(el, HAND[k], HNAME[k], k === 'r' ? '' : k === 'p' ? 'alt' : 'y', { down: () => { A.send({ a: 'pick', v: k }); this.sel = k; this.selN = this.curN; vib(10); } });
    },
    update(g) {
      const m = g.matches && g.matches.find((x) => x.active.includes(A.me));
      const key = m ? m.throwEnd : 0; this.curN = key;
      if (this.selN !== key) this.sel = null;
      for (const k in this.btns) { const b = this.btns[k]; const can = m && !m.done && !m.reveal && g.phase === 'fight'; b.disabled = !can; b.style.outline = this.sel === k ? '4px solid var(--ink)' : ''; }
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, {});
      const now = A.sNow();
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m;
        const s = Math.min(r.w / 12, r.h / 8, r.big ? 30 : 15);
        const cx = r.x + r.w / 2, gy = r.y + r.h * 0.8;
        const pos = m.ps.length === 2 ? [[cx - r.w * 0.26, gy], [cx + r.w * 0.26, gy]] : [[cx - r.w * 0.32, gy], [cx, gy - s * 0.4], [cx + r.w * 0.32, gy]];
        m.ps.forEach((p, i) => {
          const [x, y] = pos[i];
          const out = !m.active.includes(p) && (m.done ? m.winner !== p : true);
          const hd = D.char(c, x, y, s, P(p), { pose: out ? 'sad' : m.done ? 'cheer' : 'idle', flip: x < cx ? 1 : -1, me: isMe(p), label: true, seed: i, alpha: out ? 0.55 : 1 });
          const bub = m.reveal && m.reveal[p] ? HAND[m.reveal[p]] : m.picked.includes(p) ? '✔' : '…';
          const by = hd.top[1] - s * 1.1;
          c.fillStyle = css().paper; c.strokeStyle = css().line; c.lineWidth = 2; c.beginPath(); c.arc(x, by, s * 0.95, 0, 7); c.fill(); c.stroke();
          D.txt(c, bub, x, by + 2, s * (m.reveal ? 1.2 : 0.9), { f: 'Plex', w: 700 });
          if (m.ps.length === 2 || m.active.length === 2) for (let k = 0; k < 2; k++) { c.fillStyle = (m.score[p] || 0) > k ? css().acc2 : 'rgba(0,0,0,.15)'; c.beginPath(); c.arc(x - s * 0.4 + k * s * 0.8, y + s * 1.5, s * 0.24, 0, 7); c.fill(); c.strokeStyle = css().line; c.lineWidth = 1.5; c.stroke(); }
        });
        if (m.ps.length === 2) vsMark(c, cx, gy - s * 2, r.big ? 18 : 11);
        if (!m.done && !m.reveal && g.phase === 'fight' && m.throwEnd) { const left = Math.max(0, (m.throwEnd - now) / 6000); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(r.x + 10, r.y + 8, r.w - 20, 5); c.fillStyle = css().acc; c.fillRect(r.x + 10, r.y + 8, (r.w - 20) * left, 5); }
        doneMark(c, r, m);
      }
      bracketHeader(c, w, g);
    },
  };

  // ───── 3) معركة المخدّات ─────
  function stool(c, x, y, s) { c.fillStyle = '#9A6A3E'; c.strokeStyle = css().line; c.lineWidth = 2; D.rr(c, x - s * 0.9, y - s * 0.2, s * 1.8, s * 1.2, s * 0.25); c.fill(); c.stroke(); c.fillStyle = css().acc2; D.rr(c, x - s, y - s * 0.55, s * 2, s * 0.5, s * 0.25); c.fill(); c.stroke(); }
  function pillowAt(c, x, y, s, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = '#F4F1E8'; c.strokeStyle = css().line; c.lineWidth = 2; D.rr(c, -s * 0.9, -s * 0.55, s * 1.8, s * 1.1, s * 0.45); c.fill(); c.stroke(); c.strokeStyle = css().acc; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-s * 0.5, 0); c.lineTo(s * 0.5, 0); c.stroke(); c.restore(); }
  const pillow = {
    controls(el) {
      this.bs = modeBtns(el, { v: 'atk', label: 'اضرب 🛋️', sub: 'ضربة كل ثانية لحالها' }, { v: 'blk', label: 'صدّ 🛡️', sub: 'نَفَسك 3 ثواني' });
    },
    update(g) {
      const m = g.matches && g.matches.find((x) => x.active.includes(A.me));
      if (!m || !m.st) return; const s = m.st[A.me]; if (!s) return;
      setMode(this.bs, s.mode, 'blk', s);
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const now = A.sNow();
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m;
        const s = Math.min(r.w / 13, r.h / 8.5, r.big ? 28 : 14);
        const cx = r.x + r.w / 2, gy = r.y + r.h * 0.72;
        const pos = m.ps.length === 2 ? [[cx - r.w * 0.22, gy], [cx + r.w * 0.22, gy]] : [[cx - r.w * 0.3, gy], [cx, gy - r.h * 0.18], [cx + r.w * 0.3, gy]];
        m.ps.forEach((p, i) => {
          const st = m.st[p]; let [x, y] = pos[i];
          const out = !m.active.includes(p) && !(m.done && m.winner === p);
          const flip = x <= cx ? 1 : -1;
          if (st.hit > now) x += Math.sin(now / 25) * s * 0.25;
          stool(c, x, y, s);
          let pose = 'idle'; if (out) pose = 'fall'; else if (m.done) pose = 'cheer'; else if (st.mode === 'blk') pose = 'block'; else if (st.wind) pose = 'swing'; else pose = 'smash';
          const ch = D.char(c, x, y - s * 0.55, s, P(p), { pose, flip, me: isMe(p), label: false, seed: i, alpha: out ? 0.5 : 1 });
          if (!out) pillowAt(c, ch.hands[0][0], ch.hands[0][1] - (pose === 'swing' ? s * 0.2 : 0), s * 0.7, pose === 'block' ? 1.5 : pose === 'swing' ? -0.6 : 0.4 * flip);
          D.hearts(c, x, ch.top[1] - s * 0.6, st.hp, 3, Math.max(8, s * 0.5));
          if (st.blocked > now) D.sticker(c, 'صدّها!', x, ch.top[1] - s * 1.5, Math.max(10, s * 0.5), css().ok, '#fff', 0.1);
          if (st.hit > now) D.sticker(c, 'طاخ!', x, ch.top[1] - s * 1.5, Math.max(10, s * 0.5), css().bad, '#fff', -0.1);
          if (r.big) D.txt(c, P(p).name.slice(0, 10), x, y + s * 1.55, 13, { f: 'Plex', w: 700 });
        });
        matchTimer(c, r, m, g); doneMark(c, r, m);
        if (m.sudden && !m.done) D.sticker(c, 'الضربة القاضية', cx, r.y + r.h * 0.12, r.big ? 16 : 10, css().acc, '#fff', 0);
      }
      bracketHeader(c, w, g);
    },
  };

  // ───── 4) النفخ ─────
  function feather(c, x, y, s, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = '#fff'; c.strokeStyle = css().line; c.lineWidth = 2; c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * 0.7, s, 0); c.quadraticCurveTo(0, s * 0.7, -s, 0); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-s * 1.2, 0); c.lineTo(s * 0.9, 0); c.stroke(); c.restore(); }
  const blow = {
    controls(el) {
      el.innerHTML = '';
      const box = document.createElement('div'); box.style.cssText = 'flex:1;max-width:420px;display:flex;flex-direction:column;gap:6px;justify-content:center';
      box.innerHTML = '<div style="font-family:Lalezar;font-size:24px;text-align:center">انفخ عالمايك! 🌬️</div><div class="meter"><i id="blowM"></i></div>';
      el.appendChild(box);
      this.meter = box.querySelector('#blowM');
      this.fallback = null;
      if (!MIC.ok) { this.fallback = btn(el, 'اضغط مطوّل', 'ما في مايك — أضعف شوي من النفخ', 'y', { down: () => (this.hold = true), up: () => (this.hold = false) }); }
      this.last = 0;
    },
    tick() {
      let lv = MIC.ok ? MIC.level() : this.hold ? 0.55 : 0;
      if (this.meter) this.meter.style.width = Math.round(lv * 100) + '%';
      const t = performance.now(); if (t - this.last > 90) { this.last = t; A.send({ a: 'lv', v: Math.round(lv * 100) / 100 }); }
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const t = performance.now() / 1000;
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m;
        const s = Math.min(r.w / 13, r.h / 7.5, r.big ? 28 : 14);
        const cx = r.x + r.w / 2, gy = r.y + r.h * 0.78;
        if (m.active.length <= 2 && m.ps.length >= 2) {
          const pr = m.active.length === 2 ? m.active : m.ps.slice(0, 2);
          const [a, b] = pr; const sp = smooth('bl' + m.id, m.pos, 0, 0.35);
          const ax = cx - r.w * 0.33, bx = cx + r.w * 0.33, fy = gy - s * 2.2;
          c.fillStyle = css().line; c.globalAlpha = 0.25; c.fillRect(ax + s, fy + s * 0.9, bx - ax - 2 * s, 3); c.globalAlpha = 1;
          [a, b].forEach((p, i) => {
            const x = i ? bx : ax, lv = m.lv[p] || 0;
            const out = m.done && m.winner !== p;
            const ch = D.char(c, x, gy, s, P(p), { pose: out ? 'fall' : m.done ? 'cheer' : 'blow', k: lv, flip: i ? -1 : 1, me: isMe(p), label: true, seed: i });
            if (lv > 0.12 && !m.done) { c.strokeStyle = css().acc3; c.lineWidth = 2; c.globalAlpha = 0.6; for (let k = 0; k < 4; k++) { const d = ((t * 3 + k / 4) % 1) * (r.w * 0.22) * lv; const xx = ch.head[0] + (i ? -1 : 1) * (s + d), yy = ch.head[1] + (k - 1.5) * s * 0.25; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + (i ? -1 : 1) * s * 0.6, yy); c.stroke(); } c.globalAlpha = 1; }
          });
          const fx = cx + sp[0] * (bx - ax) * 0.5 * 0.88;
          feather(c, fx, fy + Math.sin(t * 6) * s * 0.15, s * 0.8, Math.sin(t * 4) * 0.3);
        } else {
          const R = Math.min(r.w, r.h) * 0.3, cy = r.y + r.h * 0.48;
          const an = triAnchors(3, cx, cy, R);
          const k = smooth('bl' + m.id, m.xy[0], m.xy[1], 0.35);
          m.ps.forEach((p, i) => { const [x, y] = an[i]; D.char(c, x, y + s * 2, s, P(p), { pose: m.active.includes(p) ? 'blow' : 'fall', k: m.lv[p] || 0, flip: x < cx ? 1 : -1, me: isMe(p), label: true, seed: i }); });
          feather(c, cx + k[0] * R, cy + k[1] * R, s * 0.8, t);
        }
        matchTimer(c, r, m, g); doneMark(c, r, m);
      }
      bracketHeader(c, w, g);
    },
  };

  // ───── 5) حرب الشحاطات ─────
  function sofa(c, x, y, s, col) { c.fillStyle = col; c.strokeStyle = css().line; c.lineWidth = 2.5; D.rr(c, x - s * 1.6, y - s * 1.5, s * 3.2, s * 1.5, s * 0.4); c.fill(); c.stroke(); D.rr(c, x - s * 1.9, y - s * 1.8, s * 0.6, s * 1.8, s * 0.3); c.fill(); c.stroke(); D.rr(c, x + s * 1.3, y - s * 1.8, s * 0.6, s * 1.8, s * 0.3); c.fill(); c.stroke(); }
  function slipperAt(c, x, y, s, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = css().acc3; c.strokeStyle = css().line; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, s * 0.8, s * 0.38, 0, 0, 7); c.fill(); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(-s * 0.1, 0, s * 0.25, -1.2, 1.2); c.stroke(); c.restore(); }
  const slipper = {
    controls(el) { this.bs = modeBtns(el, { v: 'throw', label: 'شلّف 🩴', sub: 'شحاطة كل ثانية لحالها' }, { v: 'hide', label: 'تخبّى', sub: 'نَفَسك 3 ثواني' }); },
    update(g) { const m = g.matches && g.matches.find((x) => x.active.includes(A.me)); if (!m || !m.st || !m.st[A.me]) return; setMode(this.bs, m.st[A.me].mode, 'hide', m.st[A.me]); },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m;
        const s = Math.min(r.w / 14, r.h / 8, r.big ? 26 : 13);
        const cx = r.x + r.w / 2, gy = r.y + r.h * 0.8;
        const n = m.ps.length;
        const pos = n === 2 ? [[cx - r.w * 0.3, gy], [cx + r.w * 0.3, gy]] : [[cx - r.w * 0.32, gy], [cx, gy - r.h * 0.3], [cx + r.w * 0.32, gy]];
        const where = {}; m.ps.forEach((p, i) => (where[p] = pos[i]));
        m.ps.forEach((p, i) => {
          const st = m.st[p]; const [x, y] = pos[i];
          const out = !m.active.includes(p) && !(m.done && m.winner === p);
          const hide = st.mode === 'hide';
          const ch = D.char(c, x, y - s * 0.6, s, P(p), { pose: out ? 'fall' : m.done ? 'cheer' : hide ? 'duck' : st.next - now > 700 ? 'throw' : 'idle', k: 1, flip: x <= cx ? 1 : -1, me: isMe(p), seed: i, alpha: out ? 0.5 : 1 });
          sofa(c, x, y, s, P(p).color);
          D.hearts(c, x, y + s * 0.6, 3 - st.hits, 3, Math.max(8, s * 0.48));
          if (st.hitAt && now - st.hitAt < 600) D.sticker(c, 'طاخ!', x, ch.top[1] - s, Math.max(10, s * 0.6), css().bad, '#fff', -0.1);
        });
        for (const f of m.fly) {
          const a = where[f.from]; if (!a) continue;
          const b = f.to && where[f.to] ? where[f.to] : [cx, a[1] - r.h * 0.1];
          const k = Math.max(0, Math.min(1, (now - f.at) / (f.land - f.at)));
          if (k >= 1 && f.res) { if (f.res === 'block') D.sticker(c, 'صدّها!', b[0], b[1] - s * 3, Math.max(9, s * 0.45), css().ok, '#fff', 0); continue; }
          const x = lerp(a[0], b[0], k), y = lerp(a[1] - s * 2.4, b[1] - s * 2.2, k) - Math.sin(k * Math.PI) * s * 3;
          slipperAt(c, x, y, s * 0.7, k * 12);
        }
        matchTimer(c, r, m, g); doneMark(c, r, m);
      }
      bracketHeader(c, w, g);
    },
  };

  // ───── ساحات الحركة ─────
  function field(w, h) { const pad = 10, top = 6; return { x: pad, y: top, w: w - pad * 2, h: h - top - pad }; }
  const toS = (F, p) => [F.x + p[0] * F.w, F.y + p[1] * F.h];

  // 6) الجزيرة
  const island = {
    controls(el) { el.innerHTML = ''; this.j = joystick(el); note(el, 'حرّك شخصيتك وتجمّع مع غيرك بنفس عدد الرقم'); },
    cleanup() { this.j && this.j._cleanup && this.j._cleanup(); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const F = field(w, h), t = performance.now() / 1000, now = A.sNow();
      const s = Math.max(7, Math.min(w, h) / 36);
      if (g.phase === 'final' && g.final) { const [x, y] = toS(F, g.final); c.fillStyle = '#E9CF8F'; c.beginPath(); c.ellipse(x, y, s * 3.4, s * 2.3, 0, 0, 7); c.fill(); c.strokeStyle = css().line; c.lineWidth = 3; c.stroke(); c.fillStyle = css().ok; c.beginPath(); c.arc(x, y - s * 2.2, s * 1.2, 0, 7); c.fill(); c.stroke(); D.txt(c, '🏝️', x, y, s * 2, { f: 'Plex' }); }
      if (g.phase === 'judge') for (const gr of g.groups) { const [x, y] = toS(F, gr.c); c.strokeStyle = '#fff'; c.lineWidth = 4; c.setLineDash([10, 6]); c.beginPath(); c.arc(x, y - s, s * (2.4 + gr.ids.length * 0.5), 0, 7); c.stroke(); c.setLineDash([]); }
      const ids = Object.keys(g.pos).filter((id) => g.alive.includes(id) || (g.flash && g.flash.ids.includes(id) && now - g.flash.at < 2500));
      ids.sort((a, b) => g.pos[a][1] - g.pos[b][1]);
      for (const id of ids) {
        const q = smooth('is' + id, g.pos[id][0], g.pos[id][1]);
        const [x, y] = toS(F, q); const pend = g.pending && g.pending.includes(id); const dead = !g.alive.includes(id);
        const prev = sm['isv' + id] || [x, y]; const moving = Math.hypot(prev[0] - x, prev[1] - y) > 0.4; sm['isv' + id] = [x, y];
        D.char(c, x, y, s, P(id), { pose: dead ? 'fall' : moving ? 'run' : 'idle', flip: prev[0] > x ? -1 : 1, me: isMe(id), label: isMe(id) || ids.length <= 8, seed: id.charCodeAt(0), x: pend, alpha: dead ? 0.5 : 1 });
      }
      if (g.phase === 'gather' || g.phase === 'judge') {
        D.sticker(c, String(g.k), w / 2, Math.min(70, h * 0.14), Math.min(64, h * 0.12), css().acc, '#fff', -0.05);
        if (g.phase === 'gather') { const left = Math.max(0, (g.phaseEnd - now) / 1000); D.txt(c, left.toFixed(1), w / 2, Math.min(70, h * 0.14) + Math.min(56, h * 0.1), 18, { f: 'Plex', w: 700 }); }
      }
    },
  };

  // 7) الدفش
  const push = {
    controls(el) {
      el.innerHTML = '';
      this.b = btn(el, 'دفّش! 💥', 'اضغط مطوّل لقوة أكبر… وفلّت', '', { down: () => { A.send({ a: 'down' }); this.t0 = performance.now(); }, up: () => { A.send({ a: 'up' }); this.t0 = 0; vib(15); } });
    },
    update() { if (this.b) setCd(this.b, this.t0 ? Math.min(1, (performance.now() - this.t0) / 900) : 0); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const now = A.sNow();
      const S = Math.min(w, h), ox = (w - S) / 2, oy = (h - S) / 2;
      const X = (v) => ox + v * S, Y = (v) => oy + v * S;
      // الحلبة
      c.fillStyle = css().dark ? '#3c3346' : '#C9A574'; c.beginPath(); c.arc(X(0.5), Y(0.5), g.R * S + 8, 0, 7); c.fill();
      c.fillStyle = css().dark ? '#4a4057' : '#E7C99A'; c.beginPath(); c.arc(X(0.5), Y(0.5), g.R * S, 0, 7); c.fill();
      c.strokeStyle = css().line; c.lineWidth = 3; c.stroke();
      c.strokeStyle = css().acc; c.setLineDash([12, 8]); c.lineWidth = 4; c.beginPath(); c.arc(X(0.5), Y(0.5), g.R * S + 4, 0, 7); c.stroke(); c.setLineDash([]);
      const s = Math.max(6, g.pr * S * 0.62);
      const ids = Object.keys(g.p).filter((id) => g.alive.includes(id) || now - (g.p[id].fall || 0) < 1500).sort((a, b) => g.p[a].y - g.p[b].y);
      for (const id of ids) {
        const p = g.p[id]; const q = smooth('pu' + id, p.x, p.y, 0.5);
        const x = X(q[0]), y = Y(q[1]) + s * 1.4;
        const fall = !g.alive.includes(id);
        const k = fall ? Math.min(1, (now - p.fall) / 1200) : 0;
        if (g.alive.includes(id)) {
          const mine = isMe(id); const len = (mine ? 2.6 : 1.6) * s + (p.charge ? Math.min(1, (now - p.charge) / 900) * s * 2.2 : 0);
          const cx0 = X(q[0]), cy0 = Y(q[1]);
          c.save(); c.globalAlpha = mine ? 1 : 0.35; c.strokeStyle = mine ? css().acc : P(id).color; c.lineWidth = mine ? 5 : 3; c.lineCap = 'round';
          c.beginPath(); c.moveTo(cx0, cy0); c.lineTo(cx0 + Math.cos(p.ang) * len, cy0 + Math.sin(p.ang) * len); c.stroke();
          const ex = cx0 + Math.cos(p.ang) * len, ey = cy0 + Math.sin(p.ang) * len; c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(ex + Math.cos(p.ang) * 9, ey + Math.sin(p.ang) * 9); c.lineTo(ex + Math.cos(p.ang + 2.3) * 10, ey + Math.sin(p.ang + 2.3) * 10); c.lineTo(ex + Math.cos(p.ang - 2.3) * 10, ey + Math.sin(p.ang - 2.3) * 10); c.fill(); c.restore();
        }
        D.char(c, x, y + k * s * 3, s * (1 - k * 0.5), P(id), { pose: fall ? 'fall' : now - (p.dash || 0) < 400 ? 'run' : p.charge ? 'hold' : 'idle', flip: Math.cos(p.ang) >= 0 ? 1 : -1, me: isMe(id), label: isMe(id), seed: id.charCodeAt(1), alpha: 1 - k * 0.8 });
        if (now - (p.bump || 0) < 250) D.txt(c, '💥', x, y - s * 2, s * 1.4, { f: 'Plex' });
      }
      if (!g.go) D.sticker(c, 'استعدّوا…', w / 2, h / 2, 30, css().acc2, '#1E1B18', -0.04);
      else if (g.nextShrink) { const left = Math.max(0, (g.nextShrink - now) / 1000); D.sticker(c, left <= 3 ? 'الحلبة عم تصغر!' : `الحلبة بتصغر بعد ${Math.ceil(left)}`, w / 2, 22, 14, left <= 3 ? css().bad : css().paper, left <= 3 ? '#fff' : css().ink, 0); }
    },
  };

  // 8) تخليص
  function catcher(c, x, y, s, stun) {
    const fake = { id: '__c', name: 'المسّاك', color: '#2D2A32' };
    const ch = D.char(c, x, y, s, fake, { pose: stun ? 'sad' : 'run', flip: 1, seed: 7 });
    const [hx, hy] = ch.head; const r = s * 0.95;
    c.save(); c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fillStyle = '#2D2A32'; c.fill(); c.strokeStyle = css().line; c.lineWidth = 2; c.stroke();
    c.fillStyle = css().bad; c.fillRect(hx - r, hy - r * 0.35, r * 2, r * 0.5);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx - r * 0.35, hy - r * 0.1, r * 0.2, 0, 7); c.arc(hx + r * 0.35, hy - r * 0.1, r * 0.2, 0, 7); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(hx - r * 0.3, hy - r * 0.08, r * 0.09, 0, 7); c.arc(hx + r * 0.4, hy - r * 0.08, r * 0.09, 0, 7); c.fill();
    if (stun) D.txt(c, '💫', hx, hy - r * 1.4, s, { f: 'Plex' });
    c.restore();
  }
  const tag = {
    controls(el) { el.innerHTML = ''; this.j = joystick(el); note(el, 'اهرب من المسّاك… هو الموبايل، مو حدا منكن'); },
    cleanup() { this.j && this.j._cleanup && this.j._cleanup(); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const F = field(w, h), now = A.sNow();
      const s = Math.max(7, Math.min(w, h) / 38);
      for (const o of g.obst) { const [x, y] = toS(F, o); const r = o[2] * Math.min(F.w, F.h); c.fillStyle = '#8B5A2B'; c.strokeStyle = css().line; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = css().ok; c.beginPath(); c.arc(x, y - r * 0.4, r * 0.75, 0, 7); c.fill(); c.stroke(); }
      const ents = [];
      for (const id of Object.keys(g.pos)) if (g.alive.includes(id) || (g.flash && g.flash.ids.includes(id) && now - g.flash.at < 1500)) ents.push({ id, y: g.pos[id][1] });
      g.cat.forEach((ct, i) => ents.push({ cat: i, y: ct.y }));
      ents.sort((a, b) => a.y - b.y);
      for (const e of ents) {
        if (e.cat != null) { const ct = g.cat[e.cat]; const q = smooth('ct' + e.cat, ct.x, ct.y, 0.45); const [x, y] = toS(F, q); catcher(c, x, y, s * 1.35, ct.stun > now); continue; }
        const q = smooth('tg' + e.id, g.pos[e.id][0], g.pos[e.id][1]); const [x, y] = toS(F, q);
        const prev = sm['tgv' + e.id] || [x, y]; const moving = Math.hypot(prev[0] - x, prev[1] - y) > 0.4; sm['tgv' + e.id] = [x, y];
        const dead = !g.alive.includes(e.id);
        D.char(c, x, y, s, P(e.id), { pose: dead ? 'fall' : moving ? 'run' : 'idle', flip: prev[0] > x ? -1 : 1, me: isMe(e.id), label: isMe(e.id), seed: e.id.charCodeAt(0), alpha: dead ? 0.5 : 1 });
      }
      if (!g.go) D.sticker(c, 'المسّاك جاي…', w / 2, h * 0.15, 26, css().bad, '#fff', -0.04);
    },
  };

  // 9) القنبلة
  function bomb(c, x, y, r, live, boom) {
    if (boom) { c.save(); for (let i = 0; i < 14; i++) { const a = (i / 14) * 7, l = r * (2 + (i % 3) * 0.6); c.fillStyle = i % 2 ? css().acc2 : css().acc; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.lineTo(x + Math.cos(a + 0.25) * l * 0.6, y + Math.sin(a + 0.25) * l * 0.6); c.fill(); } c.restore(); D.txt(c, 'بووم!', x, y, r * 0.9, { color: '#fff', stroke: css().line }); return; }
    c.fillStyle = '#26232B'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = css().line; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); c.fill();
    c.strokeStyle = '#8B6B4A'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + r * 0.5, y - r * 0.8); c.quadraticCurveTo(x + r, y - r * 1.4, x + r * 1.2, y - r * 1.2); c.stroke();
    if (live) { const t = performance.now() / 1000; for (let i = 0; i < 6; i++) { const a = t * 9 + i, d = 6 + ((t * 40 + i * 7) % 10); c.fillStyle = i % 2 ? css().acc2 : css().acc; c.beginPath(); c.arc(x + r * 1.2 + Math.cos(a) * d, y - r * 1.2 + Math.sin(a) * d, 3, 0, 7); c.fill(); } }
  }
  const bombUI = {
    controls(el) {
      el.innerHTML = '';
      this.b = btn(el, 'حطّ إصبعك هون', 'وما تشيله… بس انتبه', 'y', { down: () => { A.send({ a: 'down' }); vib(10); }, up: () => { A.send({ a: 'up' }); } });
    },
    update(g) { if (!this.b) return; const holding = g.hold && g.hold[A.me]; this.b.firstChild.textContent = g.phase === 'arm' ? (holding ? 'تمام… خليك حاطط' : 'حطّ إصبعك هون') : g.phase === 'live' ? (holding ? 'شيله؟ 🤔' : 'شلت إصبعك') : 'استنى…'; },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const cx = w / 2, cy = h * 0.58, R = Math.min(w * 0.4, h * 0.3);
      const ids = g.alive.concat(g.result ? g.result.out.filter((x) => !g.alive.includes(x)) : []);
      const all = [...new Set(g.phase === 'show' && g.result ? ids : g.alive)];
      const s = Math.max(8, Math.min(26, R / Math.max(4, all.length * 0.55)));
      const boom = g.phase === 'show' && g.exploded && now - g.phaseEnd + 3200 < 1200;
      bomb(c, cx, cy, Math.min(48, R * 0.3), g.phase === 'live', boom);
      all.forEach((id, i) => {
        const a = -Math.PI / 2 + (i / all.length) * Math.PI * 2;
        const rel = g.rel.includes(id), hold = g.hold[id];
        const back = rel ? 1.25 : 1;
        const x = cx + Math.cos(a) * Math.min(w * 0.42, R * 1.25) * back, y = cy + Math.sin(a) * R * 0.85 * back + s * 2;
        const out = g.phase === 'show' && g.result && g.result.out.includes(id);
        D.char(c, x, y, s, P(id), { pose: out ? 'fall' : hold ? 'hold' : rel ? 'release' : 'idle', flip: x < cx ? 1 : -1, me: isMe(id), label: all.length <= 10 || isMe(id), seed: i, x: out });
        if (g.phase === 'arm') D.txt(c, hold ? '☝️' : '✋', x, y - s * 4.4, s, { f: 'Plex' });
      });
      if (g.phase === 'arm') D.sticker(c, 'حطّوا إصبعكن!', w / 2, h * 0.08 + 20, 22, css().acc2, '#1E1B18', -0.03);
    },
  };

  // 10) المزاد الأخير
  const auction = {
    controls(el) {
      el.innerHTML = '';
      const box = document.createElement('div'); box.className = 'bid';
      box.innerHTML = '<div class="row between"><b id="bBal"></b><span class="pill" id="bStat"></span></div><div class="bv" id="bVal">0</div><input type="range" dir="ltr" id="bR" min="0" max="100" value="0"><div class="row center wrap"><button class="btn sm" data-d="-5">−5</button><button class="btn sm" data-d="-1">−1</button><button class="btn sm" data-d="1">+1</button><button class="btn sm" data-d="5">+5</button><button class="btn sm" data-d="10">+10</button></div><button class="btn pri wide" id="bGo">زايد 🔨</button>';
      el.appendChild(box);
      this.r = box.querySelector('#bR'); this.v = box.querySelector('#bVal'); this.bal = box.querySelector('#bBal'); this.st = box.querySelector('#bStat');
      this.r.oninput = () => (this.v.textContent = this.r.value);
      box.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { this.r.value = Math.max(0, Math.min(+this.r.max, +this.r.value + +b.dataset.d)); this.r.oninput(); }));
      box.querySelector('#bGo').onclick = () => { A.send({ a: 'bid', v: +this.r.value }); this.sent = +this.r.value; this.sentR = this.round; SFX.click(); };
    },
    update(g) {
      if (!this.r) return; const b = g.bal[A.me] || 0;
      if (+this.r.max !== b) { this.r.max = b; if (+this.r.value > b) { this.r.value = b; this.r.oninput(); } }
      this.bal.textContent = `رصيدك: ${b}`; this.round = g.round;
      this.st.textContent = g.phase === 'bid' ? (this.sentR === g.round ? `زايدت بـ${this.sent}` : 'ما زايدت لسّا') : 'انكشفت';
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const ids = g.reveal ? Object.keys(g.reveal.bids) : g.alive;
      const n = ids.length, cols = Math.min(n, w > 520 ? 6 : 4), rows = Math.ceil(n / cols);
      const cw = w / cols, chh = (h * 0.82) / rows;
      const s = Math.max(8, Math.min(cw / 5, chh / 6.2, 24));
      ids.forEach((id, i) => {
        const x = cw * (i % cols) + cw / 2, y = h * 0.18 + chh * Math.floor(i / cols) + chh * 0.8;
        const out = g.reveal && g.reveal.outs.includes(id);
        const ch = D.char(c, x, y, s, P(id), { pose: out ? 'sad' : g.reveal && g.reveal.top === id ? 'cheer' : 'idle', me: isMe(id), label: true, seed: i, x: out && g.phase === 'reveal' });
        const tagY = ch.top[1] - s * 0.9;
        if (g.reveal) D.sticker(c, String(g.reveal.bids[id]), x, tagY, Math.max(11, s * 0.8), out ? css().bad : g.reveal.top === id ? css().ok : css().paper, out || g.reveal.top === id ? '#fff' : css().ink, 0);
        else D.txt(c, g.bidded.includes(id) ? '🔨✔' : '…', x, tagY, s * 0.8, { f: 'Plex' });
        D.txt(c, '🪙' + (g.bal[id] || 0), x, y + s * 1.9, Math.max(10, s * 0.55), { f: 'Plex', w: 700 });
      });
      if (g.phase === 'bid') { const left = Math.max(0, (g.phaseEnd - now) / 15000); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(20, 10, w - 40, 7); c.fillStyle = css().acc; c.fillRect(20, 10, (w - 40) * left, 7); }
      if (g.reveal && g.reveal.refund) D.txt(c, `الأعلى رجعلو ${g.reveal.refund} 🪙`, w / 2, h * 0.08 + 16, 14, { f: 'Plex', w: 700 });
    },
  };

  // 11) الكاوبوي
  const cowboy = {
    controls(el, g) {
      el.innerHTML = '';
      this.b = btn(el, 'اسحب! 🤠', 'بس بعد الإشارة', '', { down: () => { A.send({ a: 'draw' }); SFX.bang(); vib(20); } });
      this.picks = document.createElement('div'); this.picks.className = 'picks hide'; el.appendChild(this.picks);
      this.pickKey = '';
    },
    update(g) {
      if (!this.b) return;
      const picking = g.phase === 'pick' && g.picker === A.me;
      this.b.classList.toggle('hide', picking); this.picks.classList.toggle('hide', !picking);
      const key = picking ? g.round + ':' + g.alive.join(',') : '';
      if (picking && key !== this.pickKey) {
        this.pickKey = key; this.picks.innerHTML = '<div style="width:100%;text-align:center;font-weight:700">إنت الأسرع! مين بدك تطلّع؟</div>';
        g.alive.filter((id) => id !== A.me).forEach((id) => { const pl = P(id); const b = document.createElement('button'); const im = D.photo(id); b.innerHTML = `<i style="background-color:${pl.color};${im ? `background-image:url(${im.src})` : ''}">${im ? '' : D.initials(pl.name)}</i>${pl.name}`; b.onclick = () => { A.send({ a: 'pick', v: id }); SFX.bang(); }; this.picks.appendChild(b); });
      }
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const ids = g.alive.concat(g.shot && !g.alive.includes(g.shot) ? [g.shot] : []);
      const n = ids.length, cols = Math.min(n, w > 520 ? 8 : 5), rows = Math.ceil(n / cols);
      const cw = w / cols, chh = (h * 0.72) / rows;
      const s = Math.max(8, Math.min(cw / 4.5, chh / 5.5, 26));
      ids.forEach((id, i) => {
        const x = cw * (i % cols) + cw / 2, y = h * 0.28 + chh * Math.floor(i / cols) + chh * 0.8;
        const shot = g.phase === 'shot' && g.shot === id;
        const pk = g.picker === id;
        D.char(c, x, y, s, P(id), { pose: shot ? 'fall' : pk ? 'shoot' : g.phase === 'draw' ? 'hold' : 'idle', me: isMe(id), label: true, seed: i, flip: 1 });
        if (pk) D.txt(c, '⭐', x, y - s * 4.6, s, { f: 'Plex' });
      });
      if (g.phase === 'draw') { D.sticker(c, 'اسحب!', w / 2, h * 0.14, Math.min(64, h * 0.12), css().bad, '#fff', -0.06); }
      else if (g.phase === 'wait') D.sticker(c, 'استعدّوا…', w / 2, h * 0.14, 28, css().acc2, '#1E1B18', 0.03);
      else if (g.phase === 'pick') D.sticker(c, (P(g.picker).name || '') + ' عم يختار…', w / 2, h * 0.14, 22, css().acc3, '#fff', 0);
      else if (g.phase === 'shot') D.sticker(c, 'بانغ! 💥', w / 2, h * 0.14, 36, css().bad, '#fff', -0.04);
      else if (g.phase === 'early') D.sticker(c, 'استعجل… وطلع!', w / 2, h * 0.14, 24, css().bad, '#fff', 0.04);
    },
  };

  // 12) الدبكة
  const MV = { R: { t: 'يمين', ar: '→', i: 2 }, D: { t: 'دبكة', ar: '⬇', i: 1 }, L: { t: 'شمال', ar: '←', i: 0 } };
  const dabke = {
    controls(el) {
      el.innerHTML = '';
      const press = (mv) => { const at = A.sNow(); A.send({ a: 'step', v: mv, at }); this.last = { mv, at }; vib(8); this.judgeLocal(mv, at); };
      // RTL: الشمال عاليسار واليمين عاليمين بصرياً
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex:1;direction:ltr;max-width:520px';
      el.appendChild(row);
      btn(row, '← شمال', '', 'alt', { down: () => press('L') });
      btn(row, '⬇ دبكة', '', 'y', { down: () => press('D') });
      btn(row, 'يمين →', '', '', { down: () => press('R') });
      this.keys = (e) => { if (e.key === 'ArrowLeft') press('L'); else if (e.key === 'ArrowRight') press('R'); else if (e.key === 'ArrowDown' || e.key === ' ') press('D'); };
      window.addEventListener('keydown', this.keys);
      this.sched = new Set(); this.fb = null;
    },
    cleanup() { window.removeEventListener('keydown', this.keys); },
    judgeLocal(mv, at) {
      const g = this.g; if (!g) return;
      const b = g.beats.find((x) => Math.abs(x.at - at) <= x.win);
      this.fb = { ok: !!b && b.mv === mv, at: performance.now() };
    },
    tick(g) {
      this.g = g; const ac = SFX.ac; if (!ac || !g.beats) return;
      const now = A.sNow();
      for (const b of g.beats) {
        if (this.sched.has(b.i)) continue;
        const dt = (b.at - now) / 1000;
        if (dt < 0.9 && dt > -0.05) { this.sched.add(b.i); const at = ac.currentTime + Math.max(0, dt); SFX.drumAt(at, b.mv === 'D' ? 'dum' : 'tak', 0.55); if (b.i % 2) SFX.drumAt(at + (b.at - now > 0 ? 0 : 0) + 0.18, 'tak', 0.25); }
      }
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow(); const t = performance.now() / 1000;
      // ممرّ الخطوات
      const laneW = Math.min(90, w / 4.5), lx = w / 2 - laneW * 1.5, top = h * 0.22, hitY = h * 0.48;
      c.fillStyle = css().dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.45)'; D.rr(c, lx - 6, top - 10, laneW * 3 + 12, hitY - top + 40, 12); c.fill(); c.strokeStyle = css().line; c.lineWidth = 2; c.stroke();
      ['L', 'D', 'R'].forEach((k, i) => D.txt(c, MV[k].t, lx + laneW * i + laneW / 2, hitY + 22, 13, { f: 'Plex', w: 700, color: css().muted }));
      c.strokeStyle = css().acc; c.lineWidth = 4; c.beginPath(); c.moveTo(lx, hitY); c.lineTo(lx + laneW * 3, hitY); c.stroke();
      for (const b of g.beats) {
        const dt = (b.at - now) / 1000; if (dt < -0.35 || dt > 1.8) continue;
        const y = hitY - dt * (hitY - top) / 1.6; const i = MV[b.mv].i; const x = lx + laneW * i + laneW / 2;
        c.globalAlpha = dt < 0 ? Math.max(0, 1 + dt * 3) : 1;
        D.sticker(c, MV[b.mv].ar, x, y, Math.min(26, laneW * 0.32), b.mv === 'D' ? css().acc2 : b.mv === 'R' ? css().acc : css().acc3, b.mv === 'D' ? '#1E1B18' : '#fff', 0);
        c.globalAlpha = 1;
      }
      if (this.fb && performance.now() - this.fb.at < 500) D.sticker(c, this.fb.ok ? 'تمام!' : 'غلط!', w / 2, top - 26, 18, this.fb.ok ? css().ok : css().bad, '#fff', 0);
      // صف الدبكة
      const ids = g.alive.concat(g.flash && performance.now() && A.sNow() - g.flash.at < 1500 ? g.flash.ids.filter((x) => !g.alive.includes(x)) : []);
      const n = ids.length; const s = Math.max(7, Math.min(22, (w * 0.9) / (n * 2.6)));
      const cur = g.beats.find((b) => b.at > now - 120) || {}; const ph = cur.at ? Math.max(0, 1 - Math.abs(cur.at - now) / 300) : 0;
      const k = cur.mv === 'R' ? ph : cur.mv === 'L' ? -ph : 0;
      const y = h * 0.9;
      ids.forEach((id, i) => {
        const x = w / 2 + (i - (n - 1) / 2) * s * 2.5;
        const dead = !g.alive.includes(id);
        const ch = D.char(c, x, dead ? y + s : y, s, P(id), { pose: dead ? 'fall' : 'dance', k: cur.mv === 'D' ? (i % 2 ? ph : -ph) : k, lean: k * 0.15, me: isMe(id), label: n <= 8 || isMe(id), seed: i, alpha: dead ? 0.5 : 1 });
        if (!dead && g.errs) { D.hearts(c, x, ch.top[1] - s * 0.5, 3 - (g.errs[id] || 0), 3, Math.max(6, s * 0.42)); if (g.lastErr && now - (g.lastErr[id] || 0) < 700) D.sticker(c, 'غلط!', x, ch.top[1] - s * 1.4, Math.max(9, s * 0.5), css().bad, '#fff', 0); }
      });
      if (g.t0 > now) D.sticker(c, String(Math.ceil((g.t0 - now) / 1000)), w / 2, h * 0.12, 30, css().acc2, '#1E1B18', 0);
      else D.sticker(c, 'اللويّح: الموبايل 🥁', w / 2, h * 0.08 + 12, 15, css().paper, css().ink, -0.02);
    },
  };

  const UI = { tug, rps, pillow, blow, slipper, island, push, tag, bomb: bombUI, auction, cowboy, dabke };
  const BRACKET = ['tug', 'rps', 'pillow', 'blow', 'slipper'];
  return { UI, BRACKET, init(api) { A = api; }, reset() { for (const k in sm) delete sm[k]; } };
})();

// ───── المايك والمعايرة (للنفخ) ─────
const MIC = (() => {
  let stream = null, an = null, buf = null, floor = 0.01, peak = 0.25, ok = false;
  try { const c = JSON.parse(localStorage.getItem('akw-mic') || 'null'); if (c) { floor = c.floor; peak = c.peak; } } catch (e) {}
  async function start() {
    if (ok) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = SFX.ac; const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 512; buf = new Float32Array(an.fftSize); src.connect(an); ok = true; return true;
    } catch (e) { ok = false; return false; }
  }
  function rms() { if (!an) return 0; an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }
  function level() { const r = rms(); return Math.max(0, Math.min(1, (r - floor * 1.3) / Math.max(0.02, peak - floor * 1.3))); }
  async function measure(ms) { const vals = []; const t0 = performance.now(); while (performance.now() - t0 < ms) { vals.push(rms()); await new Promise((r) => setTimeout(r, 40)); } vals.sort((a, b) => a - b); return vals; }
  async function calibQuiet() { const v = await measure(1800); floor = v[Math.floor(v.length * 0.9)] || 0.01; save(); }
  async function calibBlow() { const v = await measure(2000); peak = Math.max(floor * 3, v[Math.floor(v.length * 0.85)] || 0.2); save(); }
  function save() { try { localStorage.setItem('akw-mic', JSON.stringify({ floor, peak })); } catch (e) {} }
  return { start, level, rms, calibQuiet, calibBlow, get ok() { return ok; } };
})();
