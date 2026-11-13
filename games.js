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
class Pillow extends Bracket {
  initMatch(m) { m.st = {}; m.ps.forEach((p) => (m.st[p] = { hp: 3, wind: 0, block: 0, bcd: 0, cd: 0, hit: 0, bounce: 0 })); m.max = 35; m.sudden = false; }
  matchInput(m, pid, msg) {
    const s = m.st[pid]; const t = now();
    if (msg.a === 'atk' && !s.wind && t >= s.cd && t >= s.block) s.wind = t + 550;
    if (msg.a === 'blk' && !s.wind && t >= s.bcd) { s.block = t + 450; s.bcd = t + 1350; }
  }
  tickMatch(m) {
    const t = now();
    for (const p of m.active.slice()) {
      const s = m.st[p];
      if (s.wind && t >= s.wind) {
        s.wind = 0; s.cd = t + 500;
        const targets = m.active.filter((q) => q !== p);
        let bounced = false;
        targets.forEach((q) => { const o = m.st[q]; if (t < o.block) bounced = true; else { o.hp--; o.hit = t + 400; } });
        if (bounced) { s.hp--; s.bounce = t + 500; }
        for (const q of m.active.slice()) if (m.st[q].hp <= 0) this.knock(m, q);
        if (m.done) return;
      }
    }
    if (m.t >= m.max) {
      const top = Math.max(...m.active.map((p) => m.st[p].hp));
      const best = m.active.filter((p) => m.st[p].hp === top);
      if (best.length === 1) this.endMatch(m, best[0]);
      else if (!m.sudden) { m.sudden = true; m.max += 15; m.active.forEach((p) => { if (m.st[p].hp < top) this.knock(m, p); else m.st[p].hp = 1; }); }
      else this.endMatch(m, best[rint(0, best.length - 1)]);
    }
  }
  matchView(m) { const o = {}; for (const p of m.ps) { const s = m.st[p]; o[p] = { hp: s.hp, wind: s.wind, block: s.block, bcd: s.bcd, cd: s.cd, hit: s.hit, bounce: s.bounce }; } return { st: o, max: m.max, sudden: m.sudden }; }
}

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
  initMatch(m) { m.st = {}; m.ps.forEach((p, i) => (m.st[p] = { hits: 0, hide: 0, hcd: 0, tcd: 0, phase: Math.random() * 6.28, per: rnd(1.5, 1.9) })); m.fly = []; m.max = 40; m.sudden = false; m.t0 = now(); }
  aim(m, p, t) { const s = m.st[p]; return Math.sin(((t - m.t0) / 1000) * (2 * Math.PI) / s.per + s.phase); }
  targetsOf(m, p) { // موقع كل خصم على مدى السهم
    const opp = m.active.filter((q) => q !== p);
    if (opp.length === 1) return [{ id: opp[0], at: 0, w: 0.34 }];
    return [{ id: opp[0], at: -0.55, w: 0.3 }, { id: opp[1], at: 0.55, w: 0.3 }];
  }
  matchInput(m, pid, msg) {
    const s = m.st[pid]; const t = now();
    if (msg.a === 'hide' && t >= s.hcd) { s.hide = t + 700; s.hcd = t + 1700; }
    if (msg.a === 'throw' && t >= s.tcd && t >= s.hide) {
      s.tcd = t + 1000;
      const a = this.aim(m, pid, t - 80);
      const tg = this.targetsOf(m, pid).find((x) => Math.abs(a - x.at) <= x.w);
      m.fly.push({ from: pid, to: tg ? tg.id : null, aim: a, at: t, land: t + 800 });
    }
  }
  tickMatch(m) {
    const t = now();
    for (const f of m.fly) {
      if (f.res || t < f.land) continue;
      if (!f.to || !m.active.includes(f.to)) { f.res = 'miss'; continue; }
      const o = m.st[f.to];
      if (t < o.hide) f.res = 'block'; else { f.res = 'hit'; o.hits++; o.hitAt = t; if (o.hits >= 3) this.knock(m, f.to); if (m.done) return; }
    }
    m.fly = m.fly.filter((f) => !f.res || t - f.land < 900);
    if (m.t >= m.max) {
      const low = Math.min(...m.active.map((p) => m.st[p].hits));
      const best = m.active.filter((p) => m.st[p].hits === low);
      if (best.length === 1) this.endMatch(m, best[0]);
      else if (!m.sudden) { m.sudden = true; m.max += 15; m.active.slice().forEach((p) => { if (m.st[p].hits > low) this.knock(m, p); else m.st[p].hits = 2; }); }
      else this.endMatch(m, best[rint(0, best.length - 1)]);
    }
  }
  matchView(m) { const o = {}; for (const p of m.ps) { const s = m.st[p]; o[p] = { hits: s.hits, hide: s.hide, hcd: s.hcd, tcd: s.tcd, phase: s.phase, per: s.per, hitAt: s.hitAt || 0 }; } return { st: o, fly: m.fly.map((f) => ({ from: f.from, to: f.to, aim: f.aim, at: f.at, land: f.land, res: f.res || null })), t0: m.t0, max: m.max, sudden: m.sudden }; }
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

// 6) الجزيرة
class Island extends Arena {
  constructor(ctx) { super(ctx); this.speed = 0.34; this.phase = 'roam'; this.phaseEnd = 0; this.k = 0; this.groups = []; this.final = null; this.roundN = 0; }
  start() { this.toRoam(); }
  toRoam() { this.phase = 'roam'; this.phaseEnd = now() + rint(2500, 4000); this.k = 0; this.msg = 'لفّوا بالساحة… واستنّوا الرقم'; }
  pickK() {
    const n = this.alive.size; const c = [];
    for (let k = 2; k <= Math.min(5, n - 1); k++) if (n % k !== 0) c.push(k);
    return c.length ? c[rint(0, c.length - 1)] : 2;
  }
  tick(dt) {
    if (this.done) return;
    const t = now();
    if (this.phase === 'roam') {
      this.moveAll(dt);
      if (t >= this.phaseEnd) {
        if (this.alive.size <= 3) { this.phase = 'final'; this.final = [rnd(0.2, 0.8), rnd(0.25, 0.85)]; this.phaseEnd = t + 12000; this.msg = 'الجزيرة الأخيرة! أول واصل بيربح'; }
        else { this.roundN++; this.k = this.pickK(); this.phase = 'gather'; this.phaseEnd = t + (this.alive.size > 8 ? 6500 : 5500); this.msg = `تجمّعوا ${this.k} ${this.k}!`; }
      }
    } else if (this.phase === 'gather') {
      this.moveAll(dt);
      if (t >= this.phaseEnd) this.judge();
    } else if (this.phase === 'judge') {
      if (t >= this.phaseEnd) { const outs = this.pendingOut; this.pendingOut = null; if (outs && outs.length) this.eliminate(outs, 'ضلّ برّا الدائرة'); if (!this.done) this.toRoam(); }
    } else if (this.phase === 'final') {
      this.moveAll(dt);
      const f = this.final;
      const arr = [...this.alive].filter((p) => Math.hypot(this.pos[p][0] - f[0], this.pos[p][1] - f[1]) <= 0.07);
      if (arr.length || t >= this.phaseEnd) {
        let winners = arr;
        const dist = (p) => Math.hypot(this.pos[p][0] - f[0], this.pos[p][1] - f[1]);
        const rest = [...this.alive].filter((p) => !winners.includes(p)).sort((a, b) => dist(b) - dist(a));
        if (!winners.length) { winners = [rest.pop()]; }
        rest.forEach((p) => this.eliminate([p], 'ما لحق الجزيرة'));
      }
    }
  }
  judge() {
    const ids = [...this.alive], L = 0.09, seen = new Set(), comps = [];
    for (const p of ids) {
      if (seen.has(p)) continue;
      const comp = [p]; seen.add(p);
      for (let i = 0; i < comp.length; i++) for (const q of ids) if (!seen.has(q)) { const a = this.pos[comp[i]], b = this.pos[q]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= L) { seen.add(q); comp.push(q); } }
      comps.push(comp);
    }
    const safeGroups = [], outs = [];
    for (const c of comps) {
      if (c.length < this.k) { outs.push(...c); continue; }
      const cx = c.reduce((s, p) => s + this.pos[p][0], 0) / c.length, cy = c.reduce((s, p) => s + this.pos[p][1], 0) / c.length;
      const sorted = c.slice().sort((a, b) => Math.hypot(this.pos[a][0] - cx, this.pos[a][1] - cy) - Math.hypot(this.pos[b][0] - cx, this.pos[b][1] - cy));
      const keep = Math.floor(c.length / this.k) * this.k;
      const safe = sorted.slice(0, keep);
      for (let i = 0; i < safe.length; i += this.k) safeGroups.push(safe.slice(i, i + this.k));
      outs.push(...sorted.slice(keep));
    }
    this.groups = safeGroups.map((g) => { const cx = g.reduce((s, p) => s + this.pos[p][0], 0) / g.length, cy = g.reduce((s, p) => s + this.pos[p][1], 0) / g.length; return { ids: g, c: [cx, cy] }; });
    this.phase = 'judge'; this.phaseEnd = now() + 2600;
    let finalOuts = outs;
    if (outs.length >= this.alive.size) {
      // ولا حدا كمّل مجموعة: أكبر المجموعات بتنجى، وإذا كلها متساوية منعيد (وبعد 3 مرات بيطلع الأبعد عن الكل)
      const max = Math.max(...comps.map((c) => c.length));
      const big = comps.filter((c) => c.length === max).flat();
      if (max > 1 && big.length < ids.length) { finalOuts = ids.filter((p) => !big.includes(p)); this.groups = comps.filter((c) => c.length === max).map((g) => ({ ids: g, c: [g.reduce((s, p) => s + this.pos[p][0], 0) / g.length, g.reduce((s, p) => s + this.pos[p][1], 0) / g.length] })); }
      else if ((this.fails = (this.fails || 0) + 1) >= 3) {
        const iso = (p) => Math.min(...ids.filter((q) => q !== p).map((q) => Math.hypot(this.pos[p][0] - this.pos[q][0], this.pos[p][1] - this.pos[q][1])));
        finalOuts = [ids.slice().sort((a, b) => iso(b) - iso(a))[0]];
      } else finalOuts = [];
    }
    if (finalOuts.length) this.fails = 0;
    this.pendingOut = finalOuts;
    this.msg = !finalOuts.length ? 'ولا حدا تجمّع صح! منعيد' : finalOuts.length === 1 ? 'واحد ضلّ برّا!' : `${finalOuts.length} ضلّوا برّا!`;
  }
  view() { return Object.assign(this.baseView(), { kind: 'island', phase: this.phase, phaseEnd: this.phaseEnd, k: this.k, pos: this.posView(), groups: this.phase === 'judge' ? this.groups : [], pending: this.phase === 'judge' ? this.pendingOut : [], final: this.final }); }
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
    if (!this.go) { if (now() >= this.goAt) this.go = true; else return; }
    this.t += dt;
    const shrink = this.t < 70 ? (this.t / 70) * 0.09 : 0.09 + (this.t - 70) * 0.012;
    this.R = Math.max(0.1, this.R0 - shrink);
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
    return Object.assign(this.baseView(), { kind: 'push', R: +this.R.toFixed(4), pr: this.pr, p: o, go: this.go, goAt: this.goAt });
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
      const q = this.pos[c.tgt]; if (!q) continue;
      const dx = q[0] - c.x, dy = q[1] - c.y, d = Math.hypot(dx, dy) || 1;
      const qq = [c.x + (dx / d) * c.sp * dt, c.y + (dy / d) * c.sp * dt];
      this.pushOut(qq, 0.03); c.x = clamp(qq[0], 0.03, 0.97); c.y = clamp(qq[1], 0.05, 0.97);
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
  view() { return Object.assign(this.baseView(), { kind: 'bomb', phase: this.phase, phaseEnd: this.phaseEnd, hold: this.hold, rel: this.rel.map((r) => r.id), result: this.result, round: this.round, exploded: !!this.exploded }); }
}

// 10) المزاد الأخير
class Auction extends ElimGame {
  constructor(ctx) {
    super(ctx);
    this.bal = {}; const B = 12 * (this.ids.length - 1) + 12; this.B = B;
    this.ids.forEach((p) => (this.bal[p] = B));
    this.phase = 'bid'; this.bids = {}; this.round = 0; this.reveal = null; this.history = [];
  }
  get realtime() { return true; }
  start() { this.toBid(); }
  toBid() { this.round++; this.phase = 'bid'; this.bids = {}; this.phaseEnd = now() + 15000; this.reveal = null; this.msg = 'زايد بالسر… الأقل بيطلع'; }
  input(pid, msg) { if (this.phase === 'bid' && this.alive.has(pid) && msg.a === 'bid') { this.bids[pid] = clamp(Math.floor(+msg.v || 0), 0, this.bal[pid]); if ([...this.alive].every((p) => p in this.bids)) this.phaseEnd = Math.min(this.phaseEnd, now() + 800); } }
  tick() {
    if (this.done) return;
    const t = now();
    if (this.phase === 'bid' && t >= this.phaseEnd) {
      const al = [...this.alive];
      const b = {}; al.forEach((p) => (b[p] = this.bids[p] || 0));
      al.forEach((p) => (this.bal[p] -= b[p]));
      const sorted = al.slice().sort((x, y) => b[y] - b[x]);
      let refund = 0, top = null;
      if (sorted.length > 1 && b[sorted[0]] > b[sorted[1]]) { top = sorted[0]; refund = Math.floor((b[sorted[0]] - b[sorted[1]]) / 2); this.bal[top] += refund; }
      const low = Math.min(...al.map((p) => b[p]));
      let outs = al.filter((p) => b[p] === low);
      if (outs.length >= al.length) { this.ties = (this.ties || 0) + 1; outs = this.ties >= 3 ? [al[Math.floor(Math.random() * al.length)]] : []; if (outs.length) this.ties = 0; } else this.ties = 0;
      this.reveal = { bids: b, outs, top, refund, low };
      this.history.push(this.reveal);
      this.phase = 'reveal'; this.phaseEnd = t + 4800;
      this.msg = outs.length ? 'انكشفت المزايدات!' : 'تعادلتوا كلكن… منعيد';
    } else if (this.phase === 'reveal' && t >= this.phaseEnd) {
      const outs = this.reveal.outs; if (outs.length) this.eliminate(outs, 'أقل مزايدة');
      if (!this.done) this.toBid();
    }
  }
  view() { return Object.assign(this.baseView(), { kind: 'auction', phase: this.phase, phaseEnd: this.phaseEnd, bal: this.bal, B: this.B, bidded: Object.keys(this.bids), reveal: this.reveal, round: this.round }); }
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
  constructor(ctx) { super(ctx); this.beats = []; this.press = {}; this.judged = 0; this.t0 = 0; this.bpm = 84; }
  get realtime() { return true; }
  start() {
    this.t0 = now() + 3000; this.msg = 'دبكوا عالإيقاع!';
    let t = this.t0; let last = 'D';
    for (let i = 0; i < 400; i++) {
      const bpm = Math.min(156, 84 + i * 1.1);
      let mv; if (i < 4) mv = 'D'; else { mv = MOVES[rint(0, 2)]; if (Math.random() < 0.35) mv = last; }
      last = mv;
      const win = Math.max(140, 240 - i * 1.4);
      this.beats.push({ i, at: Math.round(t), mv, win });
      t += 60000 / bpm;
    }
  }
  input(pid, msg) {
    if (msg.a !== 'step' || !this.alive.has(pid)) return;
    const at = +msg.at || now();                 // وقت السيرفر حسب ساعة الموبايل المضبوطة
    const b = this.beats.find((x) => Math.abs(x.at - at) <= x.win);
    if (!b || b.i < this.judged) return;
    const k = pid + ':' + b.i; if (this.press[k]) return;
    this.press[k] = { mv: msg.v, d: at - b.at };
  }
  tick() {
    if (this.done) return;
    const t = now();
    while (this.judged < this.beats.length && t > this.beats[this.judged].at + this.beats[this.judged].win + 120) {
      const b = this.beats[this.judged];
      const al = [...this.alive];
      const miss = al.filter((p) => { const pr = this.press[p + ':' + b.i]; return !pr || pr.mv !== b.mv; });
      if (miss.length && miss.length < al.length) this.eliminate(miss, 'غلط بالخطوة');
      this.judged++;
      if (this.done) return;
    }
    if (this.judged >= this.beats.length) this.finish();
  }
  view() {
    const from = Math.max(0, this.judged - 2);
    return Object.assign(this.baseView(), { kind: 'dabke', t0: this.t0, judged: this.judged, beats: this.beats.slice(from, from + 10) });
  }
}

const GAMES = {
  tug: { cls: Tug, name: 'شدّ الحبل', icon: '🪢' },
  island: { cls: Island, name: 'الجزيرة', icon: '🏝️' },
  rps: { cls: RPS, name: 'حجرة ورقة مقص', icon: '✊' },
  push: { cls: Push, name: 'الدفش', icon: '💥' },
  bomb: { cls: Bomb, name: 'القنبلة', icon: '💣' },
  auction: { cls: Auction, name: 'المزاد الأخير', icon: '🔨' },
  cowboy: { cls: Cowboy, name: 'الكاوبوي', icon: '🤠' },
  pillow: { cls: Pillow, name: 'معركة المخدّات', icon: '🛋️' },
  tag: { cls: Tag, name: 'تخليص', icon: '🏃' },
  blow: { cls: Blow, name: 'النفخ', icon: '🌬️' },
  slipper: { cls: Slipper, name: 'حرب الشحاطات', icon: '🩴' },
  dabke: { cls: Dabke, name: 'الدبكة', icon: '🥁' },
};

module.exports = { GAMES, shuffle };
