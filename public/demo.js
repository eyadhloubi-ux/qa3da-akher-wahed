// فيديو «كيف منلعب» بشاشة جاهز: نفس منطق اللعبة الحقيقي بيشتغل محلياً بـ4 لاعبين وهميين بيلعبوا لحالهن، وبيعيد حاله
const DEMO = (() => {
  const CREW = [['سارة', '#E5689A'], ['عمر', '#2A7DE1'], ['لين', '#2BA36B'], ['رامي', '#E8A317']].map(([name, color], i) => ({ id: '__d' + i, name, color, gender: i % 2 ? 'm' : 'f' }));
  const byId = Object.fromEntries(CREW.map((p) => [p.id, p]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  let run = null;
  function P(id) { return byId[id] || null; }
  function newGame(gid) {
    const L = window.LOGIC; if (!L || !L.GAMES[gid]) return null;
    const st = { gid, ended: 0, timers: [], st: {}, t0: performance.now() };
    st.game = new L.GAMES[gid].cls({ ids: CREW.map((p) => p.id), onOut() {}, onFinish() { st.ended = performance.now(); } });
    st.game.start && st.game.start();
    return st;
  }
  // سلوك اللاعبين الوهميين (نفس بوتات الفحص)
  function bots(R, gm) {
    const gid = R.gid, inp = (id, m) => { try { R.game.input(id, m); } catch (e) {} };
    for (const b of CREW) {
      if (!gm.alive.includes(b.id)) continue; const st = R.st[b.id] || (R.st[b.id] = {});
      if (gid === 'tug') { if (Math.random() < 0.8) inp(b.id, { a: 'tap' }); }
      if (gid === 'rps' && Math.random() < 0.3) inp(b.id, { a: 'pick', v: 'rps'[Math.floor(Math.random() * 3)] });
      if (gid === 'blow') inp(b.id, { a: 'lv', v: Math.random() < 0.6 ? rnd(0.3, 1) : 0 });
      if (gid === 'slipper') { if (Math.random() < 0.12) inp(b.id, { a: 'hide', on: Math.random() < 0.4 }); if (Math.random() < 0.03) { const o = gm.alive.filter((x) => x !== b.id); inp(b.id, { a: 'tgt', v: o[Math.floor(Math.random() * o.length)] }); } }
      if (gid === 'chairs') { if (gm.phase === 'sit' && st.ch !== gm.round) { st.ch = gm.round; const rt = rnd(200, 1000); R.timers.push(setTimeout(() => inp(b.id, { a: 'sit', rt }), rt)); } }
      if (gid === 'push') { if (!st.dn) { st.dn = 1; inp(b.id, { a: 'down' }); } else if (Math.random() < 0.3) { st.dn = 0; inp(b.id, { a: 'up' }); } }
      if (gid === 'highlow' && gm.calls && gm.calls.length && gm.step) { const c = gm.calls[gm.calls.length - 1]; if (st.hl !== c.i) { st.hl = c.i; st.tg = Math.random() < 0.85 ? c.target : c.body; } const cur = gm.step[b.id]; if (st.tg && cur !== st.tg && Math.random() < 0.5) inp(b.id, { a: 'mv', v: st.tg > cur ? 1 : -1 }); }
      if (gid === 'dabke' && gm.beats) { for (const bt of gm.beats) { if (bt.i < gm.judged || st['d' + bt.i]) continue; st['d' + bt.i] = 1; const ok = Math.random() < 0.88; const off = rnd(250, bt.win * 0.8); R.timers.push(setTimeout(() => inp(b.id, { a: 'step', v: ok ? bt.mv : 'L', at: bt.at + off }), Math.max(0, bt.at + off - Date.now()))); } }
      if (gid === 'pillow') { const pos = gm.pos, me = pos && pos[b.id]; if (me) { let best = null, bd = 9; for (const id of gm.alive) if (id !== b.id) { const q = pos[id]; const d = Math.hypot(q[0] - me[0], q[1] - me[1]); if (d < bd) { bd = d; best = q; } } if (best) { const v = [best[0] - me[0] + rnd(-0.03, 0.03), best[1] - me[1]]; const l = Math.hypot(v[0], v[1]) || 1; inp(b.id, { a: 'mv', v: [v[0] / l, v[1] / l] }); if (bd < 0.1) inp(b.id, { a: 'atk' }); } } }
      if (gid === 'island' || gid === 'tag' || gid === 'bomb') {
        const pos = gm.pos; const me = pos && pos[b.id]; if (!me) continue;
        let v = [rnd(-1, 1), rnd(-1, 1)];
        if (gid === 'island' && gm.phase === 'run' && gm.isl) { let best = null, bd = 9; for (const o of gm.isl) if (o.seats.length < o.cap || o.seats.includes(b.id)) { const d = Math.hypot(o.x - me[0], o.y - me[1]); if (d < bd) { bd = d; best = o; } } if (best) v = [best.x - me[0] + rnd(-0.2, 0.2), best.y - me[1] + rnd(-0.2, 0.2)]; }
        if (gid === 'island' && gm.phase === 'final' && gm.final) v = [gm.final[0] - me[0], gm.final[1] - me[1]];
        if (gid === 'bomb') { if (gm.holder === b.id) { let best = null, bd = 9; for (const id of gm.alive) if (id !== b.id && (id !== gm.from || gm.alive.length <= 2)) { const q = pos[id]; const d = Math.hypot(q[0] - me[0], q[1] - me[1]); if (d < bd) { bd = d; best = q; } } if (best) v = [best[0] - me[0], best[1] - me[1]]; } else if (gm.holder && pos[gm.holder]) { const q = pos[gm.holder]; v = [me[0] - q[0] + rnd(-0.4, 0.4), me[1] - q[1] + rnd(-0.4, 0.4)]; } }
        if (gid === 'tag' && gm.cat) { const c = gm.cat[0]; v = [me[0] - c.x + rnd(-0.3, 0.3), me[1] - c.y + rnd(-0.3, 0.3)]; }
        const l = Math.hypot(v[0], v[1]) || 1; inp(b.id, { a: 'mv', v: [v[0] / l, v[1] / l] });
      }
    }
  }
  function clear(R) { if (R) R.timers.forEach(clearTimeout); }
  function start(gid, cv) {
    stop(); if (!cv || !window.LOGIC || !GUI.UI[gid]) return;
    const R = newGame(gid); if (!R) return;
    run = { gid, cv, R, last: performance.now(), lastBot: 0, raf: 0 };
    const frame = () => {
      if (!run || run.cv !== cv) return;
      const t = performance.now(), dt = Math.min(0.05, (t - run.last) / 1000); run.last = t;
      const R = run.R;
      try { R.game.tick(dt); } catch (e) {}
      let g; try { g = R.game.view(); } catch (e) { g = null; }
      if (g) {
        g._rx = t;
        if (t - run.lastBot > 110) { run.lastBot = t; bots(R, g); }
        const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
        if (w && h) {
          if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
          // منرسم بمقاس منطقي أصغر ومنكبّره، لتبين الشخصيات منيح بالمربع الصغير
          const k = ['island', 'pillow', 'bomb', 'tag', 'push'].includes(gid) ? 1.6 : 1.25;
          const c = cv.getContext('2d'); c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
          api.drawing = true; try { GUI.UI[gid].draw(c, w / k, h / k, g); } catch (e) {} api.drawing = false;
        }
      }
      // بيعيد حاله: لما تخلص اللعبة أو بعد 30 ثانية
      if ((R.ended && t - R.ended > 2200) || t - R.t0 > 30000) { clear(R); run.R = newGame(gid); }
      run.raf = requestAnimationFrame(frame);
    };
    run.raf = requestAnimationFrame(frame);
  }
  function stop() { if (!run) return; cancelAnimationFrame(run.raf); clear(run.R); run = null; api.drawing = false; }
  const api = { start, stop, P, drawing: false, get on() { return !!run; } };
  return api;
})();
