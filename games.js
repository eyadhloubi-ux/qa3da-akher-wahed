// قعدة آخر واحد — منطق الألعاب الـ12 على السيرفر
// كل لعبة إقصاء: بتسجّل مجموعات الطالعين بالترتيب، وآخر مجموعة هي الفايزين.
'use strict';

const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const now = () => Date.now();

// ───────────────────────── الأساس ─────────────────────────
class ElimGame {
  constructor(ctx) {
    this.ctx = ctx;                 // {ids, onOut(ids, why), onFinish(groups), push(), say(text)}
    this.ids = ctx.ids.slice();
    this.alive = new Set(this.ids);
    this.out = [];                  // مجموعات الطالعين بالترتيب
    this.removed = new Set();
    this.done = false;
    this.msg = '';                  // رسالة الحالة الظاهرة للكل
    this.flash = null;              // {ids, text, at} آخر إقصاء
    this.startAt = now();
  }
  get realtime() { return false; }
  eliminate(ids, why) {
    if (this.done) return;
    ids = [...new Set(ids)].filter((i) => this.alive.has(i));
    if (!ids.length) return;
    ids.forEach((i) => this.alive.delete(i));
    this.out.push(ids);
    this.flash = { ids, text: why || 'برّا!', at: now() };
    this.ctx.onOut(ids, why);
    if (this.alive.size <= 1) this.finish();
  }
  finish() {
    if (this.done) return;
    this.done = true;
    if (this.alive.size) this.out.push([...this.alive]);
    this.alive.clear();
    this.cleanup();
    this.ctx.onFinish(this.out.filter((g) => g.length));
  }
  forceEnd() { this.finish(); }        // الريس سكّر اللعبة: الباقيين بيتقاسموا الصدارة
  remove(id) {                          // طرد لاعب: بينشال من الترتيب كلياً
    this.removed.add(id);
    this.alive.delete(id);
    this.out = this.out.map((g) => g.filter((x) => x !== id));
    this.onRemove(id);
    if (!this.done && this.alive.size <= 1) this.finish();
  }
  onRemove() {}
  cleanup() {}
  input() {}
  tick() {}
  baseView() {
    return { alive: [...this.alive], out: this.out, msg: this.msg, flash: this.flash, done: this.done };
  }
}

// ───────────────────────── الأدوار الثنائية (مباريات) ─────────────────────────
// كل جولة: اتنين ضد اتنين، وإذا العدد فردي في تلاتية وحدة. الخسرانين بيطلعوا سوا آخر الجولة.
class Bracket extends ElimGame {
  constructor(ctx) { super(ctx); this.round = 0; this.matches = []; this.phase = 'pairs'; this.phaseEnd = 0; this.roundLosers = []; }
  get realtime() { return true; }
  start() { this.newRound(); }
  newRound() {
    if (this.done) return;
    if (this.alive.size <= 1) return this.finish();
    this.round++;
    const ids = shuffle([...this.alive]);
    const groups = [];
    let i = 0;
    if (ids.length % 2 === 1) { groups.push(ids.slice(0, 3)); i = 3; }
    for (; i < ids.length; i += 2) groups.push(ids.slice(i, i + 2));
    this.matches = groups.map((ps, k) => {
      const m = { id: k, ps: ps.slice(), active: ps.slice(), losers: [], winner: null, done: false, t: 0 };
      this.initMatch(m);
      return m;
    });
    this.roundLosers = [];
    this.phase = 'pairs';
    this.phaseEnd = now() + 2600;
    this.msg = this.matches.length === 1 ? 'المواجهة الأخيرة!' : `الجولة ${this.round}`;
  }
  matchOf(pid) { return this.matches.find((m) => m.ps.includes(pid)); }
  knock(m, pid) {                      // لاعب طلع من المباراة (بالتلاتية بتكمل)
    if (!m.active.includes(pid)) return;
    m.active = m.active.filter((x) => x !== pid);
    m.losers.push(pid);
    if (m.active.length <= 1) this.endMatch(m, m.active[0]);
    else this.onShrink(m);
  }
  endMatch(m, winner) {
    if (m.done) return;
    m.done = true;
    m.winner = winner || null;
    m.active.forEach((p) => { if (p !== winner) m.losers.push(p); });
    m.active = winner ? [winner] : [];
    m.losers.forEach((p) => { if (!this.roundLosers.includes(p)) this.roundLosers.push(p); });
  }
  onShrink() {}
  tick(dt) {
    if (this.done) return;
    const t = now();
    if (this.phase === 'pairs') {
      if (t >= this.phaseEnd) { this.phase = 'fight'; this.matches.forEach((m) => this.onFightStart(m)); }
      return;
    }
    if (this.phase === 'fight') {
      this.matches.forEach((m) => { if (!m.done) { m.t += dt; this.tickMatch(m, dt); } });
      if (this.matches.every((m) => m.done)) { this.phase = 'roundEnd'; this.phaseEnd = t + 2200; }
      return;
    }
    if (this.phase === 'roundEnd' && t >= this.phaseEnd) {
      const losers = this.roundLosers.filter((p) => this.alive.has(p));
      // ضمان: ما بيطلعوا الكل
      if (losers.length && losers.length < this.alive.size) this.eliminate(losers, 'خسر/ت المواجهة');
      else if (losers.length >= this.alive.size) { /* حالة نادرة: منعيد الجولة */ }
      if (!this.done) this.newRound();
    }
  }
  input(pid, msg) {
    if (this.phase !== 'fight') return;
    const m = this.matchOf(pid);
    if (!m || m.done || !m.active.includes(pid)) return;
    this.matchInput(m, pid, msg);
  }
  onRemove(id) {
    const m = this.matchOf(id);
    if (!m) return;
    m.ps = m.ps.filter((x) => x !== id);
    m.losers = m.losers.filter((x) => x !== id);
    this.roundLosers = this.roundLosers.filter((x) => x !== id);
    if (!m.done) {
      m.active = m.active.filter((x) => x !== id);
      if (m.active.length <= 1) { m.done = true; m.winner = m.active[0] || null; }
      else this.onShrink(m);
    }
  }
  view() {
    return Object.assign(this.baseView(), {
      kind: 'bracket', round: this.round, phase: this.phase, phaseEnd: this.phaseEnd,
      matches: this.matches.map((m) => Object.assign({ id: m.id, ps: m.ps, active: m.active, losers: m.losers, winner: m.winner, done: m.done, t: Math.round(m.t * 10) / 10 }, this.matchView(m))),
    });
  }
  initMatch() {} onFightStart() {} tickMatch() {} matchInput() {} matchView() { return {}; }
}

// 1) شدّ الحبل
class Tug extends Bracket {
  initMatch(m) { m.k = {}; m.ps.forEach((p) => (m.k[p] = 0)); m.pos = 0; m.xy = [0, 0]; m.max = 25; }
  matchInput(m, pid, msg) { if (msg.a === 'tap') m.k[pid] = Math.min((m.k[pid] || 0) + 1, 3); }
  anchors(m) { return m.active.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / m.active.length; return [Math.cos(a), Math.sin(a)]; }); }
  onShrink(m) { m.xy = [0, 0]; }
  tickMatch(m, dt) {
    const K = 0.034;
    if (m.active.length === 2) {
      const [a, b] = m.active;
      m.pos += ((m.k[b] || 0) - (m.k[a] || 0)) * K;   // موجب = لعند b
      m.k[a] = 0; m.k[b] = 0;
      if (m.pos >= 1) this.endMatch(m, b);
      else if (m.pos <= -1) this.endMatch(m, a);
      else if (m.t >= m.max) this.endMatch(m, m.pos === 0 ? m.active[rint(0, 1)] : m.pos > 0 ? b : a);
    } else {
      const an = this.anchors(m);
      m.active.forEach((p, i) => { const n = m.k[p] || 0; m.xy[0] += an[i][0] * n * K; m.xy[1] += an[i][1] * n * K; m.k[p] = 0; });
      let best = -1, bd = 9;
      an.forEach((v, i) => { const d = Math.hypot(v[0] - m.xy[0], v[1] - m.xy[1]); if (d < bd) { bd = d; best = i; } });
      if (bd <= 0.4 || m.t >= m.max) this.endMatch(m, m.active[best]);
    }
  }
  matchView(m) { return { pos: Math.round(m.pos * 1000) / 1000, xy: m.xy.map((v) => Math.round(v * 1000) / 1000), max: m.max }; }
}

// 2) حجرة ورقة مقص
const BEATS = { r: 's', s: 'p', p: 'r' };
class RPS extends Bracket {
  initMatch(m) { m.score = {}; m.ps.forEach((p) => (m.score[p] = 0)); m.picks = {}; m.throwEnd = 0; m.reveal = null; m.revealEnd = 0; m.n = 0; }
  onFightStart(m) { this.nextThrow(m); }
  nextThrow(m) { m.picks = {}; m.reveal = null; m.throwEnd = now() + 6000; m.n++; }
  onShrink(m) { m.active.forEach((p) => (m.score[p] = 0)); }
  matchInput(m, pid, msg) { if (msg.a === 'pick' && !m.reveal && ['r', 'p', 's'].includes(msg.v)) { m.picks[pid] = msg.v; if (m.active.every((p) => m.picks[p])) m.throwEnd = 0; } }
  tickMatch(m) {
    const t = now();
    if (m.reveal) { if (t >= m.revealEnd) this.afterReveal(m); return; }
    if (t < m.throwEnd) return;
    const picked = m.active.filter((p) => m.picks[p]);
    if (!picked.length) m.active.forEach((p) => (m.picks[p] = 'rps'[rint(0, 2)]));
    m.reveal = Object.assign({}, m.picks);
    m.revealEnd = t + 1700;
    // اللي ما اختار بيخسر الرمية
    const none = m.active.filter((p) => !m.picks[p]);
    m.res = this.judge(m, none);
  }
  judge(m, none) {
    const act = m.active;
    if (none.length) return { losers: none, winners: act.filter((p) => !none.includes(p)) };
    const kinds = [...new Set(act.map((p) => m.picks[p]))];
    if (kinds.length !== 2) return { draw: true };
    const [x, y] = kinds;
    const win = BEATS[x] === y ? x : y;
    return { winners: act.filter((p) => m.picks[p] === win), losers: act.filter((p) => m.picks[p] !== win) };
  }
  afterReveal(m) {
    const r = m.res; m.res = null;
    if (m.n > 14) { this.endMatch(m, m.active[rint(0, m.active.length - 1)]); return; }
    if (!r || r.draw) return this.nextThrow(m);
    if (m.active.length === 2) {
      r.winners.forEach((p) => m.score[p]++);
      const w = m.active.find((p) => m.score[p] >= 2);
      if (w) return this.endMatch(m, w);
      return this.nextThrow(m);
    }
    // تلاتية: واحد غلب التنين = ربح. تنين غلبوا واحد = الواحد بيطلع وبيكملوا تنين
    if (r.winners.length === 1) return this.endMatch(m, r.winners[0]);
    r.losers.forEach((p) => this.knock(m, p));
    if (!m.done) this.nextThrow(m);
  }
  matchView(m) { return { score: m.score, picked: Object.keys(m.picks), reveal: m.reveal, throwEnd: m.throwEnd }; }
}

// 3) معركة المخدّات
// (معركة المخدّات انتقلت لساحة الحركة تحت)

// 4) النفخ
class Blow extends Bracket {
  initMatch(m) { m.lv = {}; m.ps.forEach((p) => (m.lv[p] = 0)); m.pos = 0; m.xy = [0, 0]; m.max = 25; }
  matchInput(m, pid, msg) { if (msg.a === 'lv') m.lv[pid] = clamp(+msg.v || 0, 0, 1); }
  anchors(m) { return m.active.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / m.active.length; return [Math.cos(a), Math.sin(a)]; }); }
  onShrink(m) { m.pos = 0; m.xy = [0, 0]; }
  tickMatch(m, dt) {
    const f = (p) => { const v = m.lv[p] || 0; return v < 0.12 ? 0 : v; };
    const S = 0.5;
    if (m.active.length === 2) {
      const [a, b] = m.active;
      m.pos += (f(a) - f(b)) * S * dt;     // a بينفخ = الريشة بتروح لعند b
      if (m.pos >= 1) this.endMatch(m, a);
      else if (m.pos <= -1) this.endMatch(m, b);
      else if (m.t >= m.max) this.endMatch(m, m.pos === 0 ? m.active[rint(0, 1)] : m.pos > 0 ? a : b);
    } else {
      const an = this.anchors(m);
      m.active.forEach((p, i) => { m.xy[0] -= an[i][0] * f(p) * S * dt; m.xy[1] -= an[i][1] * f(p) * S * dt; });
      const r = Math.hypot(m.xy[0], m.xy[1]); if (r > 1.2) { m.xy[0] *= 1.2 / r; m.xy[1] *= 1.2 / r; }
      let near = -1, nd = 9;
      an.forEach((v, i) => { const d = Math.hypot(v[0] - m.xy[0], v[1] - m.xy[1]); if (d < nd) { nd = d; near = i; } });
      if (nd <= 0.35) this.knock(m, m.active[near]);
      else if (m.t >= m.max) this.knock(m, m.active[near]);
    }
  }
  matchView(m) { const lv = {}; m.ps.forEach((p) => (lv[p] = Math.round((m.lv[p] || 0) * 100) / 100)); return { pos: Math.round(m.pos * 1000) / 1000, xy: m.xy.map((v) => Math.round(v * 1000) / 1000), lv, max: m.max }; }
}

// 5) حرب الشحاطات
class Slipper extends Bracket {
  // زر التخبّي: طول ما إصبعك عليه إنت متخبّي. بس تشيل إصبعك بتشلّف شحاطة كل ثانية.
  // كل واحد معه 10 شحاطات. لما يخلصوا، اللي صاب أكتر بيربح.
  initMatch(m) { m.st = {}; m.ps.forEach((p) => (m.st[p] = { hide: false, left: 10, dealt: 0, taken: 0, next: 0, tg: 0, hitAt: 0 })); m.fly = []; m.max = 45; m.sudden = false; }
  onFightStart(m) { const t = now(); m.ps.forEach((p, i) => (m.st[p].next = t + 600 + i * 250)); }
  matchInput(m, pid, msg) {
    const s = m.st[pid];
    if (msg.a === 'hide') { const on = !!msg.on; if (!on && s.hide) s.next = Math.max(s.next, now() + 150); s.hide = on; }
  }
  tickMatch(m) {
    const t = now();
    for (const p of m.active) {
      const s = m.st[p];
      if (s.hide || s.left <= 0 || t < s.next) continue;
      const opp = m.active.filter((q) => q !== p); if (!opp.length) continue;
      const open = opp.filter((q) => !m.st[q].hide);
      const to = open.length ? open[s.tg++ % open.length] : opp[s.tg++ % opp.length];
      s.left--; s.next = t + 1000;
      m.fly.push({ from: p, to, at: t, land: t + 750 });
    }
    for (const f of m.fly) {
      if (f.res || t < f.land) continue;
      const o = m.st[f.to];
      if (!o || !m.active.includes(f.to)) { f.res = 'miss'; continue; }
      if (o.hide) f.res = 'block';
      else { f.res = 'hit'; o.taken++; o.hitAt = t; m.st[f.from].dealt++; }
    }
    m.fly = m.fly.filter((f) => !f.res || t - f.land < 900);
    const allOut = m.active.every((p) => m.st[p].left <= 0) && m.fly.every((f) => f.res);
    if (allOut || m.t >= m.max) this.decide(m);
  }
  decide(m) {
    const sc = (p) => m.st[p].dealt;
    const top = Math.max(...m.active.map(sc));
    const best = m.active.filter((p) => sc(p) === top);
    if (best.length === 1) return this.endMatch(m, best[0]);
    // تعادل: الباقيين بياخدوا 3 شحاطات كمان (مرة وحدة)، وبعدها قرعة
    if (!m.sudden) { m.sudden = true; m.max = m.t + 15; m.active.slice().forEach((p) => { if (sc(p) < top) this.knock(m, p); }); m.active.forEach((p) => { m.st[p].left = 3; m.st[p].next = now() + 800; }); return; }
    this.endMatch(m, best[rint(0, best.length - 1)]);
  }
  matchView(m) { const o = {}; for (const p of m.ps) { const s = m.st[p]; o[p] = { hide: s.hide, left: s.left, dealt: s.dealt, taken: s.taken, next: s.next, hitAt: s.hitAt }; } return { st: o, fly: m.fly.map((f) => ({ from: f.from, to: f.to, at: f.at, land: f.land, res: f.res || null })), max: m.max, sudden: m.sudden }; }
}

// ───────────────────────── ساحة حركة (جويستيك) ─────────────────────────
class Arena extends ElimGame {
  constructor(ctx) {
    super(ctx);
    this.pos = {}; this.mv = {};
    const n = this.ids.length;
    shuffle(this.ids).forEach((p, i) => { const a = (i / n) * Math.PI * 2; this.pos[p] = [0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3]; this.mv[p] = [0, 0]; });
    this.speed = 0.3;
    this.obst = [];
  }
  get realtime() { return true; }
  input(pid, msg) { if (msg.a === 'mv' && this.alive.has(pid)) { let [x, y] = msg.v || [0, 0]; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } this.mv[pid] = [+x || 0, +y || 0]; } }
  moveAll(dt, canMove = true) {
    if (!canMove) return;
    for (const p of this.alive) {
      const v = this.mv[p], q = this.pos[p];
      q[0] = clamp(q[0] + v[0] * this.speed * dt, 0.03, 0.97);
      q[1] = clamp(q[1] + v[1] * this.speed * dt, 0.05, 0.97);
      this.pushOut(q, 0.025);
    }
  }
  pushOut(q, r) {
    for (const o of this.obst) { const dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy), m = o[2] + r; if (d < m && d > 1e-6) { q[0] = o[0] + (dx / d) * m; q[1] = o[1] + (dy / d) * m; } }
  }
  posView() { const o = {}; for (const p of this.ids) if (this.pos[p]) o[p] = this.pos[p].map((v) => Math.round(v * 1000) / 1000); return o; }
}

// 6) الجزيرة — بتطلع جزر عليها دواير (مقاعد)، وكل واحد بيركض ياخد مقعد. اللي بيضل بلا جزيرة بيطلع.
class Island extends Arena {
  constructor(ctx) { super(ctx); this.speed = 0.36; this.phase = 'roam'; this.phaseEnd = 0; this.isl = []; this.seat = {}; this.fails = 0; this.roundN = 0; }
  start() { this.toRoam(); }
  toRoam() { this.phase = 'roam'; this.phaseEnd = now() + rint(2200, 3600); this.isl = []; this.seat = {}; this.msg = 'لفّوا بالساحة… الجزر جاية'; }
  sizes(C) { const out = []; while (C > 0) { let s; if (C <= 4) s = C; else if (C === 5) s = 3; else s = Math.random() < 0.5 ? 3 : 4; if (C - s === 1 && s === 4) s = 3; out.push(s); C -= s; } return out; }
  spawn() {
    const n = this.alive.size;
    const k = Math.max(1, Math.round(n / 4));            // كم واحد بيطلع هالجولة
    const caps = this.sizes(n - k);
    const isl = [];
    for (const cap of caps) {
      const r = 0.055 + cap * 0.014;
      let best = null, bd = -1;
      for (let tries = 0; tries < 60; tries++) {
        const c = [rnd(0.14, 0.86), rnd(0.18, 0.86)];
        const d = Math.min(1, ...isl.map((o) => Math.hypot(o.x - c[0], o.y - c[1]) - o.r - r));
        if (d > bd) { bd = d; best = c; }
        if (d > 0.1) break;
      }
      isl.push({ x: best[0], y: best[1], r, cap, seats: [] });
    }
    this.isl = isl; this.seat = {};
    this.roundN++; this.phase = 'run'; this.phaseEnd = now() + (n > 8 ? 7000 : 6000);
    this.msg = n === 2 ? 'جزيرة وحدة… أول واصل بيربح!' : `اركضوا عالجزر! ${k === 1 ? 'واحد رح يضل برّا' : k + ' رح يضلّوا برّا'}`;
  }
  slotPos(o, i) { if (o.cap === 1) return [o.x, o.y]; const a = -Math.PI / 2 + (i / o.cap) * Math.PI * 2; return [o.x + Math.cos(a) * o.r * 0.55, o.y + Math.sin(a) * o.r * 0.55]; }
  moveAll(dt) {
    for (const p of this.alive) {
      if (this.seat[p]) { const [ii, si] = this.seat[p]; const q = this.slotPos(this.isl[ii], si); this.pos[p] = q.slice(); continue; }
      const v = this.mv[p], q = this.pos[p];
      q[0] = clamp(q[0] + v[0] * this.speed * dt, 0.03, 0.97);
      q[1] = clamp(q[1] + v[1] * this.speed * dt, 0.05, 0.97);
    }
  }
  tick(dt) {
    if (this.done) return;
    const t = now();
    this.moveAll(dt);
    if (this.phase === 'roam') { if (t >= this.phaseEnd) this.spawn(); return; }
    if (this.phase === 'run') {
      // الحجز: أول ما توصل لجزيرة فيها مقعد فاضي، بتقعد
      for (const p of shuffle([...this.alive])) {
        if (this.seat[p]) continue;
        const q = this.pos[p];
        for (let ii = 0; ii < this.isl.length; ii++) {
          const o = this.isl[ii];
          if (o.seats.length < o.cap && Math.hypot(q[0] - o.x, q[1] - o.y) <= o.r + 0.02) { this.seat[p] = [ii, o.seats.length]; o.seats.push(p); break; }
        }
      }
      const full = this.isl.every((o) => o.seats.length >= o.cap);
      if (full && !this.fullAt) this.fullAt = t;
      if (t >= this.phaseEnd || (this.fullAt && t - this.fullAt > 700)) this.judge();
      return;
    }
    if (this.phase === 'judge' && t >= this.phaseEnd) {
      const outs = this.pendingOut || []; this.pendingOut = null;
      if (outs.length) this.eliminate(outs, 'ضلّ بلا جزيرة');
      if (!this.done) this.toRoam();
    }
  }
  judge() {
    this.fullAt = 0;
    const al = [...this.alive];
    let outs = al.filter((p) => !this.seat[p]);
    if (outs.length >= al.length) {               // ولا حدا وصل
      if (++this.fails >= 3) { outs = [al[rint(0, al.length - 1)]]; this.fails = 0; } else outs = [];
    } else this.fails = 0;
    // اللي بيطلعوا سوا: الأقرب لجزيرة أحسن مركز
    this.pendingOut = outs;
    this.phase = 'judge'; this.phaseEnd = now() + 2400;
    this.msg = !outs.length ? 'ولا حدا وصل! منعيد' : al.length === 2 ? 'وصل الأول!' : outs.length === 1 ? 'واحد ضلّ بلا جزيرة!' : `${outs.length} ضلّوا بلا جزيرة!`;
  }
  view() { return Object.assign(this.baseView(), { kind: 'island', phase: this.phase, phaseEnd: this.phaseEnd, pos: this.posView(), isl: this.isl.map((o) => ({ x: +o.x.toFixed(3), y: +o.y.toFixed(3), r: +o.r.toFixed(3), cap: o.cap, seats: o.seats })), pending: this.phase === 'judge' ? this.pendingOut : [] }); }
}

// 3) معركة المخدّات — ساحة حرة: جويستيك وزر ضرب. بعد كل ضربة صايبة بتستنى ثانيتين.
class Pillow extends Arena {
  constructor(ctx) {
    super(ctx);
    this.speed = 0.3; this.st = {};
    this.ids.forEach((p) => { const q = this.pos[p]; this.st[p] = { hp: 3, face: [0.5 - q[0], 0.5 - q[1]], cd: 0, swing: 0, hit: 0, kb: [0, 0] }; const f = this.st[p].face, l = Math.hypot(f[0], f[1]) || 1; f[0] /= l; f[1] /= l; });
    this.go = false; this.goAt = now() + 2000; this.t = 0; this.b = 0.03;
  }
  start() { this.msg = 'لفّ عليهن… واضرب بالمخدة!'; }
  input(pid, msg) {
    if (!this.alive.has(pid)) return;
    if (msg.a === 'mv') { super.input(pid, msg); const v = this.mv[pid]; if (Math.hypot(v[0], v[1]) > 0.2) { const l = Math.hypot(v[0], v[1]); this.st[pid].face = [v[0] / l, v[1] / l]; } return; }
    if (msg.a === 'atk' && this.go) {
      const s = this.st[pid], t = now();
      if (t < s.cd) return;
      s.swing = t;
      const q = this.pos[pid];
      let best = null, bd = 9;
      for (const o of this.alive) {
        if (o === pid) continue;
        const r = this.pos[o], dx = r[0] - q[0], dy = r[1] - q[1], d = Math.hypot(dx, dy);
        if (d > 0.11) continue;
        const dot = d < 0.03 ? 1 : (dx * s.face[0] + dy * s.face[1]) / d;
        if (dot < 0.25) continue;
        if (d < bd) { bd = d; best = o; }
      }
      if (!best) { s.cd = t + 450; return; }
      s.cd = t + 2000;                                            // ثانيتين قبل الضربة الجاية
      const o = this.st[best]; o.hp--; o.hit = t;
      const r = this.pos[best], dx = r[0] - q[0], dy = r[1] - q[1], d = Math.hypot(dx, dy) || 1;
      o.kb = [(dx / d) * 0.5, (dy / d) * 0.5];
      if (o.hp <= 0) this.eliminate([best], 'طار بالمخدة');
    }
  }
  tick(dt) {
    if (this.done) return;
    if (!this.go) { if (now() >= this.goAt) this.go = true; else return; }
    this.t += dt;
    // بعد دقيقة الساحة بتضيق شوي شوي لتجمعكن
    this.b = this.t < 60 ? 0.03 : Math.min(0.36, 0.03 + (this.t - 60) * 0.006);
    for (const p of this.alive) {
      const v = this.mv[p], q = this.pos[p], s = this.st[p];
      q[0] += (v[0] * this.speed + s.kb[0]) * dt; q[1] += (v[1] * this.speed + s.kb[1]) * dt;
      s.kb = s.kb.map((x) => x * Math.exp(-6 * dt));
      q[0] = clamp(q[0], this.b, 1 - this.b); q[1] = clamp(q[1], this.b + 0.02, 1 - this.b);
    }
    // ما حدا بيفوت بحدا
    const al = [...this.alive];
    for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
      const a = this.pos[al[i]], c = this.pos[al[j]], dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy), md = 0.05;
      if (d < md && d > 1e-6) { const ov = (md - d) / 2, nx = dx / d, ny = dy / d; a[0] -= nx * ov; a[1] -= ny * ov; c[0] += nx * ov; c[1] += ny * ov; }
    }
  }
  view() {
    const st = {}; for (const p of this.ids) { const s = this.st[p]; st[p] = { hp: s.hp, face: s.face.map((v) => +v.toFixed(2)), cd: s.cd, swing: s.swing, hit: s.hit }; }
    return Object.assign(this.baseView(), { kind: 'pillow', pos: this.posView(), st, b: +this.b.toFixed(3), go: this.go, goAt: this.goAt });
  }
}

// 7) الدفش
class Push extends ElimGame {
  constructor(ctx) {
    super(ctx);
    this.R0 = 0.42; this.R = this.R0; this.pr = 0.036;
    this.p = {};
    const n = this.ids.length;
    shuffle(this.ids).forEach((id, i) => { const a = (i / n) * Math.PI * 2; this.p[id] = { x: 0.5 + Math.cos(a) * this.R0 * 0.62, y: 0.5 + Math.sin(a) * this.R0 * 0.62, vx: 0, vy: 0, ang: rnd(0, 6.28), dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(2.0, 2.6), charge: 0, cd: 0, fall: 0 }; });
    this.t = 0; this.go = false; this.goAt = now() + 1500;
  }
  get realtime() { return true; }
  start() { this.msg = 'وجّه السهم ودفّش!'; }
  input(pid, msg) {
    const s = this.p[pid]; if (!s || !this.alive.has(pid) || !this.go) return;
    const t = now();
    if (msg.a === 'down' && !s.charge && t >= s.cd) s.charge = t;
    if (msg.a === 'up' && s.charge) {
      const held = (t - s.charge) / 1000; s.charge = 0; s.cd = t + 550;
      const pw = clamp(held / 0.9, 0.12, 1);
      const imp = 0.32 + 0.95 * pw;
      s.vx += Math.cos(s.ang) * imp; s.vy += Math.sin(s.ang) * imp; s.dash = t; s.pw = pw;
    }
  }
  tick(dt) {
    if (this.done) return;
    if (!this.go) { if (now() >= this.goAt) { this.go = true; this.goTime = now(); } else return; }
    this.t += dt;
    // كل 20 ثانية الدائرة بتصغر درجة، لحد ما يضل آخر واحد
    const steps = Math.floor(this.t / 20);
    const target = Math.max(0.015, this.R0 - steps * 0.06);
    this.R += (target - this.R) * Math.min(1, dt * 2.5);
    this.nextShrink = this.goTime + (steps + 1) * 20000;
    const al = [...this.alive];
    for (const id of al) {
      const s = this.p[id];
      if (!s.charge) s.ang += s.dir * s.sp * dt;
      const fr = Math.exp(-2.4 * dt);
      s.vx *= fr; s.vy *= fr;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    // تصادمات
    for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
      const a = this.p[al[i]], b = this.p[al[j]];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = this.pr * 2;
      if (d < md && d > 1e-6) {
        const nx = dx / d, ny = dy / d, ov = (md - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { const jm = -(1 + 0.95) * rv / 2; a.vx -= jm * nx; a.vy -= jm * ny; b.vx += jm * nx; b.vy += jm * ny; a.bump = b.bump = now(); }
      }
    }
    const outs = al.filter((id) => { const s = this.p[id]; return Math.hypot(s.x - 0.5, s.y - 0.5) > this.R + this.pr * 0.4; });
    if (outs.length) { outs.forEach((id) => (this.p[id].fall = now())); this.eliminate(outs, 'طار برّا الحلبة'); }
  }
  view() {
    const o = {}; for (const id of this.ids) { const s = this.p[id]; if (!s) continue; o[id] = { x: +s.x.toFixed(4), y: +s.y.toFixed(4), ang: +s.ang.toFixed(3), charge: s.charge, cd: s.cd, fall: s.fall, dash: s.dash || 0, bump: s.bump || 0 }; }
    return Object.assign(this.baseView(), { kind: 'push', R: +this.R.toFixed(4), pr: this.pr, p: o, go: this.go, goAt: this.goAt, nextShrink: this.nextShrink || 0 });
  }
}

// 8) تخليص — المسّاك هو الموبايل
class Tag extends Arena {
  constructor(ctx) {
    super(ctx);
    this.speed = 0.29;
    this.obst = [[0.25, 0.3, 0.05], [0.72, 0.28, 0.045], [0.5, 0.55, 0.06], [0.24, 0.76, 0.045], [0.78, 0.74, 0.05]];
    const n = this.ids.length;
    shuffle(this.ids).forEach((p, i) => { const a = (i / n) * Math.PI * 2; this.pos[p] = [0.5 + Math.cos(a) * 0.4, 0.5 + Math.sin(a) * 0.4]; this.pushOut(this.pos[p], 0.03); });
    const nc = n > 9 ? 2 : 1;
    this.cat = []; for (let i = 0; i < nc; i++) this.cat.push({ x: 0.5, y: i ? 0.12 : 0.5, tgt: null, re: 0, stun: 0, sp: 0.2 });
    if (nc === 1) this.cat[0].y = 0.5;
    this.go = false; this.goAt = now() + 2500; this.t = 0;
  }
  start() { this.msg = 'اهرب من المسّاك!'; }
  tick(dt) {
    if (this.done) return;
    this.moveAll(dt);
    if (!this.go) { if (now() >= this.goAt) this.go = true; else return; }
    this.t += dt;
    const t = now();
    const n0 = this.ids.length, n = this.alive.size;
    for (const c of this.cat) {
      if (t < c.stun) continue;
      c.sp = Math.min(0.335, 0.2 + this.t * 0.0025 + (1 - n / n0) * 0.07);
      if (!c.tgt || !this.alive.has(c.tgt) || t >= c.re) {
        const al = [...this.alive];
        al.sort((a, b) => Math.hypot(this.pos[a][0] - c.x, this.pos[a][1] - c.y) - Math.hypot(this.pos[b][0] - c.x, this.pos[b][1] - c.y));
        c.tgt = Math.random() < 0.75 ? al[0] : al[rint(0, Math.min(2, al.length - 1))];
        c.re = t + rint(2200, 3600);
      }
      // إذا طوّل وهو لاحق نفس الواحد (أو علق بشي) بيوقف لحظة وبيغيّر اتجاهه
      if (!c.since || c.lastTgt !== c.tgt) { c.since = t; c.lastTgt = c.tgt; }
      if (c.wander && t < c.wander.until) {
        const qq = [c.x + c.wander.v[0] * c.sp * 0.8 * dt, c.y + c.wander.v[1] * c.sp * 0.8 * dt];
        this.pushOut(qq, 0.03); c.x = clamp(qq[0], 0.03, 0.97); c.y = clamp(qq[1], 0.05, 0.97);
        continue;
      }
      const q = this.pos[c.tgt]; if (!q) continue;
      let dx = q[0] - c.x, dy = q[1] - c.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      // تفادي العوائق: يلفّ من جنبها بدل ما يعلق فيها
      for (const o of this.obst) {
        const ox = o[0] - c.x, oy = o[1] - c.y, od = Math.hypot(ox, oy);
        if (od < o[2] + 0.09 && (ox * dx + oy * dy) > 0) { const side = (ox * dy - oy * dx) > 0 ? 1 : -1; const w = 1 - (od - o[2]) / 0.09; const ndx = dx - dy * side * 1.6 * w, ndy = dy + dx * side * 1.6 * w; dx = ndx; dy = ndy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
      }
      const px = c.x, py = c.y;
      const qq = [c.x + dx * c.sp * dt, c.y + dy * c.sp * dt];
      this.pushOut(qq, 0.03); c.x = clamp(qq[0], 0.03, 0.97); c.y = clamp(qq[1], 0.05, 0.97);
      const moved = Math.hypot(c.x - px, c.y - py);
      c.slow = moved < c.sp * dt * 0.35 ? (c.slow || 0) + dt : 0;
      if (t - c.since > 6000 || c.slow > 0.6) {
        const a = rnd(0, Math.PI * 2); c.wander = { v: [Math.cos(a), Math.sin(a)], until: t + 900 };
        const others = [...this.alive].filter((p) => p !== c.tgt);
        c.tgt = others.length ? others[rint(0, others.length - 1)] : c.tgt; c.re = t + rint(3000, 4500); c.since = t + 900; c.lastTgt = c.tgt; c.slow = 0;
      }
      const caught = [...this.alive].filter((p) => Math.hypot(this.pos[p][0] - c.x, this.pos[p][1] - c.y) <= 0.045);
      if (caught.length) { c.stun = t + 1200; c.tgt = null; this.eliminate(caught, 'مسكه المسّاك'); if (this.done) return; }
    }
  }
  view() { return Object.assign(this.baseView(), { kind: 'tag', pos: this.posView(), cat: this.cat.map((c) => ({ x: +c.x.toFixed(4), y: +c.y.toFixed(4), stun: c.stun })), obst: this.obst, go: this.go, goAt: this.goAt }); }
}

// ───────────────────────── ألعاب الجولات ─────────────────────────
// 9) القنبلة
class Bomb extends ElimGame {
  constructor(ctx) { super(ctx); this.phase = 'arm'; this.phaseEnd = 0; this.hold = {}; this.rel = []; this.boomAt = 0; this.round = 0; this.result = null; }
  get realtime() { return true; }
  start() { this.toArm(); }
  toArm() { this.round++; this.phase = 'arm'; this.phaseEnd = now() + 6000; this.rel = []; this.result = null; this.msg = 'حطّوا إصبعكن عالشاشة… وما تشيلوه!'; }
  input(pid, msg) {
    if (!this.alive.has(pid)) return;
    if (msg.a === 'down') { if (this.phase === 'arm') this.hold[pid] = true; }
    if (msg.a === 'up') {
      if (this.phase === 'arm') this.hold[pid] = false;
      else if (this.phase === 'live' && this.hold[pid]) { this.hold[pid] = false; this.rel.push({ id: pid, at: now() - this.liveAt }); }
    }
  }
  tick() {
    if (this.done) return;
    const t = now();
    if (this.phase === 'arm') {
      const al = [...this.alive];
      if (t >= this.phaseEnd || (al.every((p) => this.hold[p]) && t >= this.phaseEnd - 4500)) {
        this.phase = 'live'; this.liveAt = t;
        const n = this.alive.size; this.boomAt = t + rint(6000, 12000 + Math.min(n, 12) * 600);
        al.forEach((p) => { if (!this.hold[p]) this.rel.push({ id: p, at: 0 }); });
        this.msg = 'القنبلة اشتغلت…';
      }
    } else if (this.phase === 'live') {
      if (t >= this.boomAt || this.rel.length >= this.alive.size) this.boom();
    } else if (this.phase === 'show' && t >= this.phaseEnd) {
      const outs = this.result.out;
      if (outs.length) this.eliminate(outs, this.result.why);
      if (!this.done) this.toArm();
    }
  }
  boom() {
    const al = [...this.alive];
    const relIds = this.rel.map((r) => r.id);
    const first = this.rel.length ? [this.rel[0].id] : [];
    // اللي شالوا بنفس اللحظة تقريباً (أقل من 60ms) مع الأول بيطلعوا معه
    if (this.rel.length > 1) for (let i = 1; i < this.rel.length; i++) if (this.rel[i].at - this.rel[0].at < 60) first.push(this.rel[i].id);
    const holders = al.filter((p) => !relIds.includes(p));
    const out = [...new Set([...first, ...holders])];
    const survivors = al.filter((p) => !out.includes(p));
    this.phase = 'show'; this.phaseEnd = now() + 3200;
    this.exploded = now() >= this.boomAt;
    if (!survivors.length) {
      this.fails = (this.fails || 0) + 1;
      if (this.fails >= 3) { const o = first.length ? first : [al[Math.floor(Math.random() * al.length)]]; this.fails = 0; this.result = { out: o, first: o, holders: [], why: 'تالت مرة… بيطلع الأول' }; this.msg = 'تالت مرة طلعتوا كلكن… بيطلع الأول'; }
      else { this.result = { out: [], first, holders, why: '' }; this.msg = 'طلعتوا كلكن! منعيد الجولة'; }
    } else { this.fails = 0; this.result = { out, first, holders, why: 'القنبلة' }; this.msg = `${out.length === 1 ? 'واحد طلع' : out.length + ' طلعوا'}`; }
    al.forEach((p) => (this.hold[p] = false));
  }
  view() { return Object.assign(this.baseView(), { kind: 'bomb', phase: this.phase, phaseEnd: this.phaseEnd, hold: this.hold, rel: this.rel.map((r) => r.id), result: this.result, round: this.round, exploded: !!this.exploded, liveAt: this.phase === 'live' ? this.liveAt : 0, boomAt: this.phase === 'live' ? this.boomAt : 0 }); }
}

// 10) عالي واطي — الموبايل بينادي «عالي» أو «واطي»، والكل لازم يكون بالوضع الصح. وأحياناً جسمه بيعمل العكس ليضحك عليكن.
class HighLow extends ElimGame {
  constructor(ctx) { super(ctx); this.state = {}; this.ids.forEach((p) => (this.state[p] = 'U')); this.calls = []; this.judged = 0; this.fails = 0; this.last = null; }
  get realtime() { return true; }
  start() { this.msg = 'اسمع الكلمة… مو الحركة!'; this.t0 = now() + 2500; this.nextAt = this.t0; this.cur = 'U'; this.k = 0; }
  input(pid, msg) { if (msg.a === 'pos' && (msg.v === 'U' || msg.v === 'D') && this.alive.has(pid)) this.state[pid] = msg.v; }
  newCall(t) {
    const k = this.k++;
    let w;
    if (k < 2) w = k === 0 ? 'D' : 'U';
    else w = Math.random() < Math.min(0.32, 0.12 + k * 0.01) ? this.cur : (this.cur === 'U' ? 'D' : 'U');   // أحياناً بيكرّر نفس الكلمة
    const trick = k >= 3 && Math.random() < Math.min(0.45, 0.15 + k * 0.012);                            // جسمه بيعمل العكس
    const fake = k >= 5 && !trick && Math.random() < 0.12;                                               // «عا… واطي!»
    const win = Math.max(650, 1700 - k * 40);                                                            // الوقت المسموح بيضيق
    const c = { i: k, at: t, w, body: trick ? (w === 'U' ? 'D' : 'U') : w, fake, win };
    this.cur = w; this.calls.push(c); this.calls = this.calls.slice(-4);
    this.nextAt = t + win + Math.max(450, 1100 - k * 25) + (fake ? 300 : 0);
    this.pend = c;
  }
  tick() {
    if (this.done) return;
    const t = now();
    if (this.pend && t >= this.pend.at + this.pend.win + (this.pend.fake ? 300 : 0)) {
      const c = this.pend; this.pend = null;
      const al = [...this.alive];
      const wrong = al.filter((p) => this.state[p] !== c.w);
      this.last = { i: c.i, wrong, at: t };
      if (wrong.length && wrong.length < al.length) { this.fails = 0; this.eliminate(wrong, c.w === 'U' ? 'ما وقف' : 'ما قعد'); }
      else if (wrong.length >= al.length && ++this.fails >= 3) { this.fails = 0; }
    }
    if (!this.pend && t >= this.nextAt) this.newCall(t);
    if (this.k > 400) this.finish();
  }
  view() { return Object.assign(this.baseView(), { kind: 'highlow', t0: this.t0, calls: this.calls, pend: this.pend ? this.pend.i : -1, state: this.state, last: this.last }); }
}

// 11) الكاوبوي
class Cowboy extends ElimGame {
  constructor(ctx) { super(ctx); this.phase = 'wait'; this.picker = null; this.round = 0; }
  get realtime() { return true; }
  start() { this.toWait(); }
  toWait() { this.round++; this.phase = 'wait'; this.drawAt = now() + rint(2200, 6500); this.picker = null; this.msg = 'استعدّوا… لا حدا يسحب قبل الإشارة'; this.early = []; }
  input(pid, msg) {
    if (!this.alive.has(pid)) return;
    const t = now();
    if (msg.a === 'draw') {
      if (this.phase === 'wait') { this.early.push(pid); this.eliminate([pid], 'سحب قبل الإشارة'); if (!this.done) { this.phase = 'early'; this.phaseEnd = t + 2200; this.msg = 'استعجل… وطلع هو!'; } return; }
      if (this.phase === 'draw' && !this.picker) {
        this.picker = pid; this.reaction = t - this.drawAt; this.idle = 0;
        if (this.alive.size === 2) { const other = [...this.alive].find((p) => p !== pid); this.phase = 'shot'; this.shot = other; this.phaseEnd = t + 2000; this.msg = 'الأسرع!'; }
        else { this.phase = 'pick'; this.phaseEnd = t + 7000; this.msg = 'الأسرع عم يختار مين يطلّع…'; }
      }
    }
    if (msg.a === 'pick' && this.phase === 'pick' && pid === this.picker && this.alive.has(msg.v) && msg.v !== pid) { this.shot = msg.v; this.phase = 'shot'; this.phaseEnd = t + 2000; this.msg = 'بانغ!'; }
  }
  tick() {
    if (this.done) return;
    const t = now();
    if (this.phase === 'wait' && t >= this.drawAt) { this.phase = 'draw'; this.phaseEnd = t + 4500; this.msg = 'اسحب!'; }
    else if (this.phase === 'draw' && t >= this.phaseEnd) {
      this.idle = (this.idle || 0) + 1;
      if (this.idle >= 3) { this.idle = 0; const al = [...this.alive]; this.shot = al[Math.floor(Math.random() * al.length)]; this.phase = 'shot'; this.phaseEnd = t + 2000; this.msg = 'ولا حدا سحب تالت مرة… قرعة!'; }
      else { this.toWait(); this.msg = 'ولا حدا سحب… منعيد'; }
    }
    else if (this.phase === 'pick' && t >= this.phaseEnd) { const c = [...this.alive].filter((p) => p !== this.picker); this.shot = c[rint(0, c.length - 1)]; this.phase = 'shot'; this.phaseEnd = t + 2000; this.msg = 'خلص الوقت… اختيار عشوائي'; }
    else if (this.phase === 'shot' && t >= this.phaseEnd) { this.eliminate([this.shot], 'انضرب'); if (!this.done) this.toWait(); }
    else if (this.phase === 'early' && t >= this.phaseEnd) this.toWait();
  }
  view() { return Object.assign(this.baseView(), { kind: 'cowboy', phase: this.phase, drawAt: this.phase === 'wait' ? 0 : this.drawAt, phaseEnd: this.phaseEnd, picker: this.picker, shot: this.phase === 'shot' ? this.shot : null, round: this.round, reaction: this.reaction }); }
}

// 12) الدبكة — اللويّح هو الموبايل
const MOVES = ['R', 'L', 'D'];
class Dabke extends ElimGame {
  // كل لاعب إله 3 غلطات. السرعة بتزيد والوقت المسموح بيضيق كل ما طوّلوا.
  constructor(ctx) { super(ctx); this.beats = []; this.press = {}; this.judged = 0; this.t0 = 0; this.errs = {}; this.ids.forEach((p) => (this.errs[p] = 0)); this.lastErr = {}; }
  get realtime() { return true; }
  start() {
    this.t0 = now() + 3000; this.msg = 'دبكوا عالإيقاع! معك 3 غلطات';
    let t = this.t0; let last = 'D';
    for (let i = 0; i < 600; i++) {
      const bpm = Math.min(200, 84 + i * 1.3 + Math.max(0, i - 60) * 0.6);
      let mv; if (i < 4) mv = 'D'; else { mv = MOVES[rint(0, 2)]; if (Math.random() < Math.max(0.1, 0.35 - i * 0.003)) mv = last; }
      last = mv;
      const win = Math.max(95, 240 - i * 1.6);
      this.beats.push({ i, at: Math.round(t), mv, win, pr: i < 4 });
      t += 60000 / bpm;
    }
  }
  input(pid, msg) {
    if (msg.a !== 'step' || !this.alive.has(pid)) return;
    const at = +msg.at || now();
    const b = this.beats.find((x) => Math.abs(x.at - at) <= x.win);
    if (!b) { // كبسة برّا الإيقاع = غلطة عالدقة الأقرب
      const nb = this.beats.find((x) => x.i >= this.judged && x.at > at - 400);
      if (nb) { const k = pid + ':' + nb.i; if (!this.press[k]) this.press[k] = { mv: 'X' }; }
      return;
    }
    if (b.i < this.judged) return;
    const k = pid + ':' + b.i; if (this.press[k]) { this.press[k] = { mv: 'X' }; return; }   // كبستين عنفس الدقة = غلط
    this.press[k] = { mv: msg.v, d: at - b.at };
  }
  tick() {
    if (this.done) return;
    const t = now();
    while (this.judged < this.beats.length && t > this.beats[this.judged].at + this.beats[this.judged].win + 120) {
      const b = this.beats[this.judged];
      const al = [...this.alive];
      const miss = al.filter((p) => { const pr = this.press[p + ':' + b.i]; return !pr || pr.mv !== b.mv; });
      if (!b.pr && miss.length && miss.length < al.length) {
        miss.forEach((p) => { this.errs[p]++; this.lastErr[p] = t; });
        const outs = miss.filter((p) => this.errs[p] >= 3);
        if (outs.length) this.eliminate(outs, 'خلصت غلطاته');
      }
      this.judged++;
      if (this.done) return;
    }
    if (this.judged >= this.beats.length) this.finish();
  }
  view() {
    const from = Math.max(0, this.judged - 2);
    return Object.assign(this.baseView(), { kind: 'dabke', t0: this.t0, judged: this.judged, beats: this.beats.slice(from, from + 12), errs: this.errs, lastErr: this.lastErr, lives: 3 });
  }
}

const GAMES = {
  tug: { cls: Tug, name: 'شدّ الحبل', icon: '🪢' },
  island: { cls: Island, name: 'الجزيرة', icon: '🏝️' },
  rps: { cls: RPS, name: 'حجرة ورقة مقص', icon: '✊' },
  push: { cls: Push, name: 'الدفش', icon: '💥' },
  bomb: { cls: Bomb, name: 'القنبلة', icon: '💣' },
  highlow: { cls: HighLow, name: 'عالي واطي', icon: '↕️' },
  cowboy: { cls: Cowboy, name: 'الكاوبوي', icon: '🤠' },
  pillow: { cls: Pillow, name: 'معركة المخدّات', icon: '🛋️' },
  tag: { cls: Tag, name: 'تخليص', icon: '🏃' },
  blow: { cls: Blow, name: 'النفخ', icon: '🌬️' },
  slipper: { cls: Slipper, name: 'حرب الشحاطات', icon: '🩴' },
  dabke: { cls: Dabke, name: 'الدبكة', icon: '🥁' },
};

module.exports = { GAMES, shuffle };
