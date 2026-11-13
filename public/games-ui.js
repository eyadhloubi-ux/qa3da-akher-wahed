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
    const setFrom = (e) => { const r = j.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } const g = Math.min(1, Math.hypot(x, y) / 0.6) / (Math.hypot(x, y) || 1); v = [x * g, y * g]; k.style.transform = `translate(calc(-50% + ${x * r.width * 0.32}px), calc(-50% + ${y * r.height * 0.32}px))`; send(); };
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
      el.innerHTML = ''; this.j = joystick(el);
      this.b = btn(el, 'اضرب 🛋️', 'لفّ عليه وانزل فيه', '', { down: () => { A.send({ a: 'atk' }); vib(12); } });
    },
    cleanup() { this.j && this.j._cleanup && this.j._cleanup(); },
    update(g) { const s = g.st && g.st[A.me]; if (!s || !this.b) return; const now = A.sNow(); setCd(this.b, s.cd > now ? Math.min(1, (s.cd - now) / 2000) : 0); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const F = field(w, h), now = A.sNow();
      const s = Math.max(7, Math.min(w, h) / 34);
      // حدود الساحة (بتضيق بعد دقيقة)
      if (g.b > 0.031) { const [x0, y0] = toS(F, [g.b, g.b + 0.02]), [x1, y1] = toS(F, [1 - g.b, 1 - g.b]); c.save(); c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.rect(0, 0, w, h); c.rect(x0, y0, x1 - x0, y1 - y0); c.fill('evenodd'); c.strokeStyle = css().bad; c.lineWidth = 4; c.setLineDash([12, 8]); c.strokeRect(x0, y0, x1 - x0, y1 - y0); c.restore(); }
      const ids = Object.keys(g.pos).filter((id) => g.alive.includes(id) || (g.flash && g.flash.ids.includes(id) && now - g.flash.at < 1500));
      ids.sort((a, b) => g.pos[a][1] - g.pos[b][1]);
      for (const id of ids) {
        const st = g.st[id]; const q = smooth('pl' + id, g.pos[id][0], g.pos[id][1]); const [x, y] = toS(F, q);
        const prev = sm['plv' + id] || [x, y]; const moving = Math.hypot(prev[0] - x, prev[1] - y) > 0.4; sm['plv' + id] = [x, y];
        const dead = !g.alive.includes(id); const flip = st.face[0] < -0.1 ? -1 : 1;
        const sw = now - st.swing < 320;
        if (st.hit > now - 400) { c.save(); c.translate(Math.sin(now / 20) * 3, 0); }
        const ch = D.char(c, x, y, s, P(id), { pose: dead ? 'fall' : sw ? 'swing' : moving ? 'run' : 'idle', flip, me: isMe(id), label: isMe(id) || ids.length <= 8, seed: id.charCodeAt(0), alpha: dead ? 0.5 : 1 });
        if (!dead) pillowAt(c, x + flip * s * 1.1, ch.hands[0][1] - (sw ? s * 0.6 : 0), s * 0.7, sw ? -0.9 * flip : 0.4 * flip);
        if (!dead) D.hearts(c, x, ch.top[1] - s * 0.55, st.hp, 3, Math.max(7, s * 0.45));
        if (st.hit > now - 400) { c.restore(); D.sticker(c, 'طاخ!', x, ch.top[1] - s * 1.5, Math.max(10, s * 0.55), css().bad, '#fff', -0.1); }
        if (isMe(id) && st.cd > now && !dead) D.txt(c, ((st.cd - now) / 1000).toFixed(1), x, y + s * 2.3, 12, { f: 'Plex', w: 700, color: css().muted });
      }
      if (!g.go) D.sticker(c, 'استعدّوا…', w / 2, h * 0.15, 26, css().acc2, '#1E1B18', -0.04);
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
      this.taps = [];
      if (!MIC.ok || MIC.bad) { box.querySelector('div').textContent = 'اكبس بسرعة! 👆'; this.fallback = btn(el, 'اكبس اكبس!', 'المايك ما زبط — كل ما كبست أسرع بتنفخ أقوى', 'y', { down: () => { this.taps.push(performance.now()); vib(5); } }); }
      this.last = 0;
    },
    tick() {
      const tn = performance.now(); this.taps = (this.taps || []).filter((x) => tn - x < 700);
      let lv = MIC.ok && !MIC.bad ? MIC.level() : Math.min(1, this.taps.length / 6);
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
    controls(el) {
      el.innerHTML = '';
      this.info = note(el, '');
      this.b = btn(el, 'اكبس لتتخبّى 🛋️', 'شيل إصبعك… بتشلّف شحاطة كل ثانية', 'alt', { down: () => { A.send({ a: 'hide', on: true }); vib(6); }, up: () => A.send({ a: 'hide', on: false }) });
    },
    update(g) {
      const s = g.st && g.st[A.me]; if (!s || !this.b) return;
      this.b.firstChild.textContent = s.hide ? 'متخبّي 🛋️' : 'عم تشلّف 🩴';
      this.info.textContent = `${s.hp === 2 ? '❤️❤️' : '❤️🤍'} · صبت ${s.dealt}`;
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const ids = g.alive.concat(g.flash && now - g.flash.at < 1500 ? g.flash.ids.filter((x) => !g.alive.includes(x)) : []);
      const n = Math.max(2, ids.length), cx = w / 2, cy = h * 0.56;
      const R = Math.min(w * 0.4, h * 0.36);
      const s = Math.max(7, Math.min(20, (2 * Math.PI * R) / (n * 4.2)));
      const where = {};
      ids.forEach((id, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; where[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.82]; });
      const order = ids.slice().sort((a, b) => where[a][1] - where[b][1]);
      for (const id of order) {
        const st = g.st[id]; const [x, y] = where[id]; const dead = !g.alive.includes(id);
        const ch = D.char(c, x, y - s * 0.6, s, P(id), { pose: dead ? 'fall' : st.hide ? 'duck' : st.next - now > 700 ? 'throw' : 'idle', k: 1, flip: x <= cx ? 1 : -1, me: isMe(id), label: false, seed: id.charCodeAt(0), alpha: dead ? 0.5 : 1 });
        sofa(c, x, y, s * 0.85, P(id).color);
        if (!dead) D.hearts(c, x, ch.top[1] - s * 0.5, st.hp, 2, Math.max(7, s * 0.45));
        D.txt(c, P(id).name.slice(0, 9), x, y + s * 0.75, Math.max(9, s * 0.55), { f: 'Plex', w: 700 });
        if (now - st.hitAt < 600) D.sticker(c, 'طاخ!', x, ch.top[1] - s * 1.4, Math.max(9, s * 0.55), css().bad, '#fff', -0.1);
      }
      for (const f of g.fly) {
        const a = where[f.from], b = where[f.to]; if (!a || !b) continue;
        const k = Math.max(0, Math.min(1, (now - f.at) / (f.land - f.at)));
        if (k >= 1 && f.res) { if (f.res === 'block' && now - f.land < 500) D.sticker(c, 'صدّها!', b[0], b[1] - s * 3, Math.max(8, s * 0.45), css().ok, '#fff', 0); continue; }
        const x = lerp(a[0], b[0], k), y = lerp(a[1] - s * 2.2, b[1] - s * 2, k) - Math.sin(k * Math.PI) * s * 2.5;
        slipperAt(c, x, y, s * 0.6, k * 12);
      }
      if (!g.go) D.sticker(c, 'استعدّوا…', w / 2, h * 0.14, 24, css().acc2, '#1E1B18', -0.04);
      else { const left = Math.max(0, g.max - g.t); if (left <= 15) D.sticker(c, `${left} ث`, w / 2, 22, 14, css().bad, '#fff', 0); }
    },
  };

  // ───── ساحات الحركة ─────
  function field(w, h) { const pad = 10, top = 6; return { x: pad, y: top, w: w - pad * 2, h: h - top - pad }; }
  const toS = (F, p) => [F.x + p[0] * F.w, F.y + p[1] * F.h];

  // 6) الجزيرة
  const island = {
    controls(el) { el.innerHTML = ''; this.j = joystick(el); note(el, 'اركض عجزيرة فيها دائرة فاضية… واللي بيضل بلا جزيرة بيطلع'); },
    cleanup() { this.j && this.j._cleanup && this.j._cleanup(); },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const F = field(w, h), now = A.sNow();
      const U = Math.min(F.w, F.h);
      const s = Math.max(7, Math.min(w, h) / 36);
      for (const o of g.isl || []) {
        const [x, y] = toS(F, [o.x, o.y]); const r = o.r * U * 1.15;
        c.fillStyle = '#4FA7C9'; c.beginPath(); c.ellipse(x, y + 4, r * 1.25, r * 1.05, 0, 0, 7); c.fill();
        c.fillStyle = '#EED49A'; c.strokeStyle = css().line; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.92, 0, 0, 7); c.fill(); c.stroke();
        for (let k = 0; k < o.cap; k++) {
          const a = -Math.PI / 2 + (k / o.cap) * Math.PI * 2; const sx = o.cap === 1 ? x : x + Math.cos(a) * r * 0.55 * 1.0, sy = o.cap === 1 ? y : y + Math.sin(a) * r * 0.55 * 0.85;
          const taken = k < o.seats.length;
          c.fillStyle = taken ? P(o.seats[k]).color : '#fff'; c.strokeStyle = css().line; c.lineWidth = 2.5; c.beginPath(); c.arc(sx, sy, Math.max(6, s * 0.7), 0, 7); c.fill(); c.stroke();
        }
        D.sticker(c, `${o.seats.length}/${o.cap}`, x, y - r * 1.15, Math.max(10, s * 0.6), o.seats.length >= o.cap ? css().bad : css().ok, '#fff', 0);
      }
      const ids = Object.keys(g.pos).filter((id) => g.alive.includes(id) || (g.flash && g.flash.ids.includes(id) && now - g.flash.at < 2000));
      ids.sort((a, b) => g.pos[a][1] - g.pos[b][1]);
      for (const id of ids) {
        const q = smooth('is' + id, g.pos[id][0], g.pos[id][1]);
        const [x, y] = toS(F, q); const pend = g.pending && g.pending.includes(id); const dead = !g.alive.includes(id);
        const seated = (g.isl || []).some((o) => o.seats.includes(id));
        const prev = sm['isv' + id] || [x, y]; const moving = Math.hypot(prev[0] - x, prev[1] - y) > 0.4; sm['isv' + id] = [x, y];
        D.char(c, x, y, s, P(id), { pose: dead ? 'fall' : seated ? 'cheer' : moving ? 'run' : 'idle', flip: prev[0] > x ? -1 : 1, me: isMe(id), label: isMe(id) || ids.length <= 8, seed: id.charCodeAt(0), x: pend, alpha: dead ? 0.5 : 1 });
      }
      if (g.phase === 'run') { const left = Math.max(0, (g.phaseEnd - now) / 1000); D.sticker(c, left.toFixed(1), w / 2, 26, 18, css().acc, '#fff', 0); }
      if (g.phase === 'roam') D.sticker(c, 'الجزر جاية…', w / 2, 26, 16, css().paper, css().ink, -0.03);
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
  function bomb(c, x, y, r, live, boom, frac) {
    if (boom) { c.save(); for (let i = 0; i < 14; i++) { const a = (i / 14) * 7, l = r * (2 + (i % 3) * 0.6); c.fillStyle = i % 2 ? css().acc2 : css().acc; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.lineTo(x + Math.cos(a + 0.25) * l * 0.6, y + Math.sin(a + 0.25) * l * 0.6); c.fill(); } c.restore(); D.txt(c, 'بووم!', x, y, r * 0.9, { color: '#fff', stroke: css().line }); return; }
    c.fillStyle = '#26232B'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = css().line; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); c.fill();
    // الفتيل: طوله بيبيّن قدّيش باقي
    const L = r * 3.4, f = frac == null ? 1 : Math.max(0, Math.min(1, frac));
    const pt = (k) => [x + r * 0.5 + k * L, y - r * 0.9 - Math.sin(k * Math.PI * 3) * r * 0.25 - k * r * 0.3];
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 4; c.beginPath(); for (let k = 0; k <= 1.001; k += 0.02) { const [px, py] = pt(k); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.strokeStyle = '#8B6B4A'; c.lineWidth = 5; c.beginPath(); for (let k = 0; k <= f + 0.001; k += 0.02) { const [px, py] = pt(Math.min(k, f)); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    if (live) { const [ex, ey] = pt(f); const t = performance.now() / 1000; for (let i = 0; i < 7; i++) { const a = t * 9 + i, d = 5 + ((t * 40 + i * 7) % 10); c.fillStyle = i % 2 ? css().acc2 : css().acc; c.beginPath(); c.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 3, 0, 7); c.fill(); } }
  }
  const bombUI = {
    controls(el) { el.innerHTML = ''; this.j = joystick(el); this.info = note(el, 'إذا القنبلة على راسك… الحق حدا والمسه'); },
    cleanup() { this.j && this.j._cleanup && this.j._cleanup(); },
    update(g) { if (!this.info) return; this.info.textContent = g.holder === A.me ? '💣 القنبلة على راسك! الحق حدا والمسه' : g.from === A.me && g.holder ? 'عطيتها… هلّق اهرب!' : 'اهرب من اللي على راسه القنبلة'; },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const F = field(w, h), now = A.sNow();
      const s = Math.max(7, Math.min(w, h) / 34);
      const ids = Object.keys(g.pos).filter((id) => g.alive.includes(id) || (g.boom && g.boom.id === id && now - g.boom.at < 2000));
      ids.sort((a, b) => g.pos[a][1] - g.pos[b][1]);
      for (const id of ids) {
        const q = smooth('bm' + id, g.pos[id][0], g.pos[id][1]); const [x, y] = toS(F, q);
        const prev = sm['bmv' + id] || [x, y]; const moving = Math.hypot(prev[0] - x, prev[1] - y) > 0.4; sm['bmv' + id] = [x, y];
        const dead = !g.alive.includes(id); const hold = g.holder === id;
        const ch = D.char(c, x, y, s, P(id), { pose: dead ? 'fall' : moving ? 'run' : 'idle', flip: prev[0] > x ? -1 : 1, me: isMe(id), label: true, seed: id.charCodeAt(0), alpha: dead ? 0.5 : 1 });
        if (hold) {
          const fr = g.boomAt ? Math.max(0, (g.boomAt - now) / (g.boomAt - g.liveAt)) : 0;
          bomb(c, ch.top[0], ch.top[1] - s * 0.9, s * 0.8, true, false, fr);
        }
        if (g.from === id && g.holder && g.alive.length > 2) D.txt(c, '🚫💣', x, ch.top[1] - s * 0.5, Math.max(9, s * 0.5), { f: 'Plex' });
        if (g.boom && g.boom.id === id && now - g.boom.at < 1500) bomb(c, x, y - s * 2, s * 1.2, false, true);
      }
      // الفتيل الكبير فوق
      if (g.phase === 'live' && g.boomAt) {
        const fr = Math.max(0, (g.boomAt - now) / (g.boomAt - g.liveAt));
        const bw = Math.min(w * 0.7, 360), bx = (w - bw) / 2, by = 14;
        c.fillStyle = 'rgba(0,0,0,.15)'; D.rr(c, bx, by, bw, 10, 5); c.fill();
        c.fillStyle = fr < 0.25 ? css().bad : '#8B6B4A'; D.rr(c, bx, by, bw * fr, 10, 5); c.fill();
        D.txt(c, '🔥', bx + bw * fr, by + 4, 16, { f: 'Plex' }); D.txt(c, '💣', bx - 12, by + 4, 18, { f: 'Plex' });
      }
      if (g.phase === 'wait') D.sticker(c, 'القنبلة جاية…', w / 2, h * 0.14, 22, css().acc2, '#1E1B18', -0.04);
    },
  };

  // 10) عالي واطي — الدرج
  const highlow = {
    controls(el) {
      el.innerHTML = '';
      const go = (d) => { A.send({ a: 'mv', v: d }); this.mine = Math.max(1, Math.min(5, (this.mine || 1) + d)); this.lastSet = performance.now(); vib(8); SFX.click(); };
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex:1;direction:ltr;max-width:520px'; el.appendChild(row);
      btn(row, '⬇ انزل', 'درجة لتحت', 'alt', { down: () => go(-1) });
      btn(row, 'اطلع ⬆', 'درجة لفوق', '', { down: () => go(1) });
      this.keys = (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') go(-1); };
      window.addEventListener('keydown', this.keys);
      this.mine = 1; this.heard = -1;
    },
    cleanup() { window.removeEventListener('keydown', this.keys); },
    update(g) { const st = g.step && g.step[A.me]; if (st && st !== this.mine && performance.now() - (this.lastSet || 0) > 500) this.mine = st; },
    tick(g) { const c = g.calls && g.calls[g.calls.length - 1]; if (c && c.i !== this.heard && A.sNow() >= c.at) { this.heard = c.i; SFX.call(c.target >= 3); } },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const cl = g.calls && g.calls[g.calls.length - 1]; const live = cl && g.pend === cl.i;
      // الدرج: 5 درجات من الشمال (1) لليمين (5)
      const x0 = w * 0.06, x1 = w * 0.94, sw = (x1 - x0) / 5, base = h * 0.94, sh = Math.min(h * 0.11, sw * 0.55);
      const top = (k) => base - k * sh;
      for (let k = 1; k <= 5; k++) {
        const x = x0 + (k - 1) * sw, y = top(k);
        const tgt = live && cl.target === k;
        c.fillStyle = tgt ? css().acc2 : css().dark ? '#4a4057' : '#D9BF92'; c.strokeStyle = css().line; c.lineWidth = 2.5;
        c.fillRect(x, y, sw, base - y); c.strokeRect(x, y, sw, base - y);
        D.txt(c, String(k), x + sw / 2, y + Math.min(18, sh * 0.5), Math.min(18, sh * 0.45), { color: css().ink });
      }
      // اللاعبين عدرجاتهن
      const ids = g.alive.concat(g.flash && now - g.flash.at < 1500 ? g.flash.ids.filter((x) => !g.alive.includes(x)) : []);
      const by = {}; ids.forEach((id) => { const k = isMe(id) ? this.mine : g.step[id] || 1; (by[k] = by[k] || []).push(id); });
      const s = Math.max(6, Math.min(18, sw / 4.2, sh * 0.6));
      for (let k = 1; k <= 5; k++) {
        const list = by[k] || []; const per = Math.max(1, Math.floor(sw / (s * 1.9)));
        list.forEach((id, n) => {
          const col = n % per, row = Math.floor(n / per);
          const x = x0 + (k - 1) * sw + (col + 0.5) * (sw / Math.min(per, list.length || 1)), y = top(k) - row * s * 3.6;
          const dead = !g.alive.includes(id);
          D.char(c, x, y, s, P(id), { pose: dead ? 'fall' : 'idle', me: isMe(id), label: isMe(id) || ids.length <= 8, seed: n, alpha: dead ? 0.5 : 1, x: dead });
        });
      }
      // الموبايل: واقف عدرجة (وأحياناً غير اللي بيقولها)
      const leader = { id: '__l', name: ' ', color: '#2D2A32' };
      const lb = cl ? cl.body : 3; const lx = x0 + (lb - 0.5) * sw, ly = Math.min(top(lb) - s * 4.2, h * 0.42);
      const s0 = Math.min(26, h / 18);
      const lch = D.char(c, lx, h * 0.34, s0, leader, { pose: 'cheer', seed: 3 });
      c.fillStyle = '#2D2A32'; c.beginPath(); c.arc(lch.head[0], lch.head[1], s0 * 0.95, 0, 7); c.fill();
      D.txt(c, '📱', lch.head[0], lch.head[1], s0 * 1.1, { f: 'Plex' });
      c.save(); c.strokeStyle = css().muted; c.setLineDash([5, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(lx, h * 0.34 + 4); c.lineTo(lx, ly); c.stroke(); c.restore();
      if (cl && now >= cl.at && (live || now - cl.at < 1200)) D.sticker(c, `الدرجة ${cl.target}!`, w / 2, h * 0.1, Math.min(30, h / 16), css().acc, '#fff', -0.05);
      if (live) { const k = Math.max(0, 1 - (now - cl.at) / cl.win); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(w * 0.2, h * 0.17, w * 0.6, 6); c.fillStyle = css().acc2; c.fillRect(w * 0.2, h * 0.17, w * 0.6 * k, 6); }
      else if (g.t0 > now) D.sticker(c, 'اسمع الرقم… مو وين واقف الموبايل!', w / 2, h * 0.1, 16, css().acc2, '#1E1B18', -0.03);
    },
  };

  // 11) الهوكي
  const HH = 1.6;
  const hockey = {
    controls(el) {
      el.innerHTML = '';
      const pad = document.createElement('div'); pad.className = 'hpad'; pad.innerHTML = '<i></i><span>حرّك إصبعك يمين ويسار</span>'; pad.classList.add('h1');
      el.appendChild(pad); this.pad = pad; const dot = pad.querySelector('i');
      let act = false, last = 0;
      const setFrom = (e) => {
        const r = pad.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = 0.5;
        dot.style.left = x * 100 + '%'; dot.style.top = '50%';
        const t = performance.now(); if (t - last < 30) return; last = t;
        A.send({ a: 'pad', x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
      };
      pad.addEventListener('pointerdown', (e) => { e.preventDefault(); act = true; try { pad.setPointerCapture(e.pointerId); } catch (x) {} SFX.unlock(); setFrom(e); });
      pad.addEventListener('pointermove', (e) => { if (act) setFrom(e); });
      pad.addEventListener('pointerup', () => (act = false)); pad.addEventListener('pointercancel', () => (act = false));
      this.lastGoal = 0;
    },
    update(g) {
      const m = g.matches && g.matches.find((x) => x.ps.includes(A.me)); if (!m || !this.pad) return;
      const waiting = m.wait && m.wait.includes(A.me);
      this.pad.classList.toggle('off', !!waiting || !m.active.includes(A.me));
      this.pad.querySelector('span').textContent = waiting ? 'إنت عم تستنى… بتلعب مع الربحان' : 'حرّك إصبعك يمين ويسار';
      if (m.goal && m.goal.at !== this.lastGoal) { this.lastGoal = m.goal.at; SFX.whistle(); }
    },
    draw(c, w, h, g) {
      D.hara(c, w, h, {}); const now = A.sNow();
      for (const r of layout(g.matches, w, h)) {
        panel(c, r); const m = r.m; if (!m.pk) continue;
        const pad = r.big ? 14 : 8, top = r.y + (r.big ? 40 : 22);
        const avH = r.h - (top - r.y) - pad, avW = r.w - pad * 2;
        const TW = Math.min(avW, avH / HH), TH = TW * HH, tx = r.x + (r.w - TW) / 2, ty = top + (avH - TH) / 2;
        const flip = m.pair[1] === A.me;                    // كل واحد بيشوف مرماه تحت
        const T = (x, y) => flip ? [tx + (1 - x) * TW, ty + (HH - y) / HH * TH] : [tx + x * TW, ty + y / HH * TH];
        // الطاولة
        c.fillStyle = css().dark ? '#24435a' : '#DDF0F7'; c.strokeStyle = css().line; c.lineWidth = r.big ? 4 : 2.5;
        D.rr(c, tx, ty, TW, TH, TW * 0.08); c.fill(); c.stroke();
        c.strokeStyle = css().acc; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, ty + TH / 2); c.lineTo(tx + TW, ty + TH / 2); c.stroke();
        c.beginPath(); c.arc(tx + TW / 2, ty + TH / 2, TW * 0.15, 0, 7); c.stroke();
        const gw = 0.42 * TW; c.fillStyle = css().ink;
        c.fillRect(tx + (TW - gw) / 2, ty - 4, gw, 7); c.fillRect(tx + (TW - gw) / 2, ty + TH - 3, gw, 7);
        // المضارب = راس كل لاعب
        const sides = flip ? [m.pair[1], m.pair[0]] : [m.pair[0], m.pair[1]];
        for (const p of m.pair) {
          const q = m.pd[p]; if (!q) continue;
          const sp = smooth('hk' + p, q[0], q[1], 0.6); const [x, y] = T(sp[0], sp[1]);
          D.head(c, x, y, 0.08 * TW, P(p), { me: isMe(p) });
        }
        const kp = smooth('hkp' + m.id + m.pair.join(''), m.pk[0], m.pk[1], 0.75); const [px, py] = T(kp[0], kp[1]);
        c.fillStyle = '#1E1B18'; c.beginPath(); c.arc(px, py, 0.042 * TW, 0, 7); c.fill(); c.strokeStyle = css().acc2; c.lineWidth = 2; c.stroke();
        // النتيجة
        const fs = r.big ? 15 : 10;
        // الأسماء والنتيجة عالجنب، بعيد عن المرمى
        sides.forEach((p, k) => { if (!p) return; const yy = k ? ty + TH * 0.3 : ty + TH * 0.7; c.save(); c.translate(tx + TW - 4, yy); c.rotate(-Math.PI / 2); D.sticker(c, `${P(p).name.slice(0, 8)} ${m.sc[p] || 0}`, 0, -fs * 0.6, fs, P(p).color, '#fff', 0); c.restore(); });
        if (m.wait && m.wait.length) D.txt(c, '⏳ ' + P(m.wait[0]).name.slice(0, 8) + ' بيستنى', r.x + r.w / 2, r.y + (r.big ? 22 : 12), r.big ? 13 : 9, { f: 'Plex', w: 700 });
        if (m.goal && now - m.goal.at < 1300) D.sticker(c, 'جووول!', tx + TW / 2, ty + TH / 2, r.big ? 30 : 16, css().acc, '#fff', -0.08);
        else if (m.sudden && !m.done) D.sticker(c, 'الجول الجاي بيربح', tx + TW / 2, ty + TH / 2, r.big ? 15 : 9, css().bad, '#fff', 0);
        matchTimer(c, r, m, g); doneMark(c, r, m);
      }
      bracketHeader(c, w, g);
    },
  };

  // 12) الدبكة — إشارة وحدة بالنص
  const MV = { R: { t: 'يمين', ar: '➡', i: 2 }, D: { t: 'فوق', ar: '⬆', i: 1 }, L: { t: 'شمال', ar: '⬅', i: 0 } };
  const dabke = {
    controls(el) {
      el.innerHTML = '';
      const press = (mv) => { const at = A.sNow(); A.send({ a: 'step', v: mv, at }); vib(8); this.judgeLocal(mv, at); };
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex:1;direction:ltr;max-width:520px';
      el.appendChild(row);
      btn(row, '⬅ شمال', '', 'alt', { down: () => press('L') });
      btn(row, '⬆ فوق', '', 'y', { down: () => press('D') });
      btn(row, 'يمين ➡', '', '', { down: () => press('R') });
      this.keys = (e) => { if (e.key === 'ArrowLeft') press('L'); else if (e.key === 'ArrowRight') press('R'); else if (e.key === 'ArrowUp' || e.key === ' ') press('D'); };
      window.addEventListener('keydown', this.keys);
      this.fb = null; this.seen = -1;
    },
    cleanup() { window.removeEventListener('keydown', this.keys); },
    judgeLocal(mv, at) { const g = this.g; if (!g) return; const b = g.beats.find((x) => at >= x.at - 60 && at <= x.at + x.win); if (!b || this.fbBeat === b.i) return; this.fbBeat = b.i; this.fb = { ok: b.mv === mv, at: performance.now() }; },
    tick(g) { this.g = g; const now = A.sNow(); const b = g.beats && g.beats.find((x) => now >= x.at && now <= x.at + x.win); if (b && b.i !== this.seen) { this.seen = b.i; SFX.drumAt && SFX.ac && SFX.drumAt(SFX.ac.currentTime, b.mv === 'D' ? 'dum' : 'tak', 0.5); } },
    draw(c, w, h, g) {
      D.hara(c, w, h, { wall: true }); const now = A.sNow();
      const b = g.beats.find((x) => now >= x.at && now <= x.at + x.win);
      const S0 = Math.min(w * 0.42, h * 0.32), cx = w / 2, cy = h * 0.36;
      c.save(); c.fillStyle = css().dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.55)'; D.rr(c, cx - S0 / 2, cy - S0 / 2, S0, S0, 18); c.fill(); c.strokeStyle = css().line; c.lineWidth = 3; c.stroke(); c.restore();
      if (b) {
        const col = b.mv === 'D' ? css().acc2 : b.mv === 'R' ? css().acc : css().acc3;
        const k = Math.max(0, 1 - (now - b.at) / b.win);
        c.fillStyle = col; D.rr(c, cx - S0 / 2 + 6, cy - S0 / 2 + 6, S0 - 12, S0 - 12, 14); c.fill();
        D.txt(c, MV[b.mv].ar, cx, cy, S0 * 0.55, { f: 'Plex', color: b.mv === 'D' ? '#1E1B18' : '#fff' });
        D.txt(c, MV[b.mv].t, cx, cy + S0 * 0.36, Math.min(22, S0 * 0.13), { f: 'Lalezar', color: b.mv === 'D' ? '#1E1B18' : '#fff' });
        c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(cx - S0 / 2, cy + S0 / 2 + 8, S0, 6); c.fillStyle = css().ink; c.fillRect(cx - S0 / 2, cy + S0 / 2 + 8, S0 * k, 6);
      } else if (g.t0 > now) D.txt(c, String(Math.ceil((g.t0 - now) / 1000)), cx, cy, S0 * 0.5, { color: css().ink });
      else D.txt(c, '…', cx, cy, S0 * 0.4, { color: css().muted });
      if (this.fb && performance.now() - this.fb.at < 500) D.sticker(c, this.fb.ok ? 'تمام!' : 'غلط!', cx, cy - S0 / 2 - 6, 18, this.fb.ok ? css().ok : css().bad, '#fff', 0);
      // صف الدبكة
      const ids = g.alive.concat(g.flash && now - g.flash.at < 1500 ? g.flash.ids.filter((x) => !g.alive.includes(x)) : []);
      const n = ids.length; const s = Math.max(7, Math.min(22, (w * 0.9) / (n * 2.6)));
      const ph = b ? Math.max(0, 1 - (now - b.at) / 300) : 0; const kk = b && b.mv === 'R' ? ph : b && b.mv === 'L' ? -ph : 0;
      const y = h * 0.92;
      ids.forEach((id, i) => {
        const x = w / 2 + (i - (n - 1) / 2) * s * 2.5; const dead = !g.alive.includes(id);
        const ch = D.char(c, x, dead ? y + s : y, s, P(id), { pose: dead ? 'fall' : 'dance', k: b && b.mv === 'D' ? (i % 2 ? ph : -ph) : kk, lean: kk * 0.15, me: isMe(id), label: n <= 8 || isMe(id), seed: i, alpha: dead ? 0.5 : 1 });
        if (!dead && g.errs) { D.hearts(c, x, ch.top[1] - s * 0.5, 3 - (g.errs[id] || 0), 3, Math.max(6, s * 0.42)); if (g.lastErr && now - (g.lastErr[id] || 0) < 700) D.sticker(c, 'غلط!', x, ch.top[1] - s * 1.4, Math.max(9, s * 0.5), css().bad, '#fff', 0); }
      });
    },
  };

  const UI = { tug, rps, pillow, blow, slipper, island, push, tag, bomb: bombUI, highlow, hockey, dabke };
  const BRACKET = ['tug', 'rps', 'blow', 'hockey'];
  return { UI, BRACKET, init(api) { A = api; }, reset() { for (const k in sm) delete sm[k]; } };
})();

// ───── المايك والمعايرة (للنفخ) ─────
const MIC = (() => {
  let stream = null, an = null, buf = null, fbuf = null, floor = 0.01, peak = 0.25, ok = false, bad = false;
  try { const c = JSON.parse(localStorage.getItem('akw-mic') || 'null'); if (c) { floor = c.floor; peak = c.peak; } } catch (e) {}
  async function start() {
    if (ok) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = SFX.ac; if (ac.state === 'suspended') { try { await ac.resume(); } catch (e) {} } const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.3; buf = new Float32Array(an.fftSize); fbuf = new Uint8Array(an.frequencyBinCount); src.connect(an); ok = true; return true;
    } catch (e) { ok = false; return false; }
  }
  // النفخ = ضجة عالترددات الواطية. منقيس الطاقة الكاملة وطاقة الترددات تحت ~700Hz وبناخد الأعلى
  function rms() {
    if (!an) return 0; an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const t = Math.sqrt(s / buf.length);
    an.getByteFrequencyData(fbuf); const lim = Math.max(4, Math.floor(fbuf.length * 700 / (SFX.ac.sampleRate / 2))); let f = 0; for (let i = 1; i < lim; i++) f += fbuf[i]; f = f / lim / 255;
    return Math.max(t, f * 0.5);
  }
  function level() { const r = rms(); return Math.max(0, Math.min(1, (r - floor * 1.3) / Math.max(0.02, peak - floor * 1.3))); }
  async function measure(ms) { const vals = []; const t0 = performance.now(); while (performance.now() - t0 < ms) { vals.push(rms()); await new Promise((r) => setTimeout(r, 40)); } vals.sort((a, b) => a - b); return vals; }
  async function calibQuiet() { const v = await measure(1800); floor = v[Math.floor(v.length * 0.9)] || 0.01; save(); }
  async function calibBlow() { const v = await measure(2200); const p = v[Math.floor(v.length * 0.8)] || 0; bad = p < floor * 2 || p < 0.012; peak = Math.max(floor * 2.5, p); save(); return !bad; }
  function save() { try { localStorage.setItem('akw-mic', JSON.stringify({ floor, peak })); } catch (e) {} }
  return { start, level, rms, calibQuiet, calibBlow, get ok() { return ok; }, get bad() { return bad; } };
})();
