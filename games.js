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
      if (losers.length && losers.length < this.alive.size) {
        // بالتلاتية: اللي طلع أول (قبل ما يكمّل التاني) مركزه أوطى
        const early = this.matches.filter((m) => m.ps.length === 3 && m.losers.length === 2).map((m) => m.losers[0]).filter((p) => losers.includes(p));
        if (early.length && early.length < losers.length) this.eliminate(early, 'خسر/ت المواجهة');
        this.eliminate(losers.filter((p) => !early.includes(p) || early.length >= losers.length), 'خسر/ت المواجهة');
      }
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
  initMatch(m) { m.score = {}; m.ps.forEach((p) => (m.score[p] = 0)); m.picks = {}; m.throwEnd = 0; m.reveal = null; m.revealEnd = 0; m.n = 0; if (m.ps.length === 3) { m.lives = {}; m.ps.forEach((p) => (m.lives[p] = 2)); } }   // بالتلاتية: كل واحد إلو فرصتين
  onFightStart(m) { this.nextThrow(m); }
  nextThrow(m) { m.picks = {}; m.reveal = null; m.throwEnd = now() + 6000; m.n++; }
  onShrink(m) { if (!m.lives) m.active.forEach((p) => (m.score[p] = 0)); }
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
    if (m.n > (m.lives ? 40 : 14)) { this.endMatch(m, m.active[rint(0, m.active.length - 1)]); return; }
    if (!r || r.draw) return this.nextThrow(m);
    if (m.lives) {   // تلاتية: كل رمية خسرانة بتاخد فرصة، واللي بتخلص فرصتيه بيطلع
      r.losers.forEach((p) => (m.lives[p] = Math.max(0, m.lives[p] - 1)));
      const dead = r.losers.filter((p) => m.lives[p] <= 0);
      if (dead.length >= m.active.length) { dead.forEach((p) => (m.lives[p] = 1)); return this.nextThrow(m); }   // ما بيطلعوا الكل سوا
      dead.forEach((p) => { if (!m.done) this.knock(m, p); });
      if (!m.done) this.nextThrow(m);
      return;
    }
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
  matchView(m) { return { score: m.score, lives: m.lives || null, picked: Object.keys(m.picks), reveal: m.reveal, throwEnd: m.throwEnd }; }
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

// 5) حرب الشحاطات — كلكن بحلقة وحدة. يا متخبّي (طول ما إصبعك عالزر) يا عم تشلّف شحاطة كل ثانية عحدا. إصابتين وبتطلع.
class Slipper extends ElimGame {
  constructor(ctx) {
    super(ctx);
    this.st = {}; this.ids.forEach((p) => (this.st[p] = { hide: false, hp: 2, dealt: 0, next: 0, hitAt: 0, lastHitAt: 0 }));
    this.fly = []; this.go = false; this.goAt = now() + 2500; this.t = 0; this.max = 90; this.seq = 0;
  }
  get realtime() { return true; }
  start() { this.msg = 'شيل إصبعك لتشلّف… وحطّه لتتخبّى!'; }
  input(pid, msg) { if (msg.a === 'hide' && this.alive.has(pid)) { const s = this.st[pid], on = !!msg.on; if (!on && s.hide) s.next = Math.max(s.next, now() + 200); s.hide = on; } }
  tick(dt) {
    if (this.done) return;
    const t = now();
    if (!this.go) { if (t >= this.goAt) { this.go = true; this.ids.forEach((p, i) => (this.st[p].next = t + 300 + (i % 4) * 200)); } else return; }
    this.t += dt;
    const al = [...this.alive];
    for (const p of al) {
      const s = this.st[p];
      if (s.hide || t < s.next) continue;
      const opp = al.filter((q) => q !== p); if (!opp.length) continue;
      const open = opp.filter((q) => !this.st[q].hide);
      const pool = open.length ? open : opp;
      const to = pool[rint(0, pool.length - 1)];
      // آخر اتنين: كل شحاطة أسرع من اللي قبلها (بتنرمى أسرع وبتوصل أسرع)
      let gap = 1000, fly = 800;
      if (al.length === 2) { this.duoN = (this.duoN || 0) + 1; const k = Math.pow(0.9, this.duoN); gap = Math.max(320, 1000 * k); fly = Math.max(260, 800 * k); }
      s.next = t + gap;
      this.fly.push({ id: ++this.seq, from: p, to, at: t, land: t + fly });
    }
    const outs = [];
    for (const f of this.fly) {
      if (f.res || t < f.land) continue;
      const o = this.st[f.to];
      if (!this.alive.has(f.to)) { f.res = 'miss'; continue; }
      if (o.hide) f.res = 'block';
      else { f.res = 'hit'; o.hp--; o.hitAt = t; this.st[f.from].dealt++; if (o.hp <= 0 && !outs.includes(f.to)) outs.push(f.to); }
    }
    this.fly = this.fly.filter((f) => !f.res || t - f.land < 900);
    if (outs.length) this.eliminate(outs, 'انصاب مرتين');
    if (this.done) return;
    if (this.t >= this.max) {
      // خلص الوقت: الترتيب حسب الإصابات (الأقل انصاب أحسن، وبعدين اللي صاب أكتر)
      const rest = [...this.alive].sort((a, b) => (this.st[a].hp - this.st[b].hp) || (this.st[a].dealt - this.st[b].dealt));
      while (rest.length > 1) { const w = rest[0]; const grp = rest.filter((q) => this.st[q].hp === this.st[w].hp && this.st[q].dealt === this.st[w].dealt); grp.forEach((q) => rest.splice(rest.indexOf(q), 1)); if (rest.length) this.eliminate(grp, 'خلص الوقت'); else break; }
      this.finish();
    }
  }
  view() {
    const st = {}; for (const p of this.ids) { const s = this.st[p]; st[p] = { hide: s.hide, hp: s.hp, dealt: s.dealt, next: s.next, hitAt: s.hitAt }; }
    return Object.assign(this.baseView(), { kind: 'slipper', st, fly: this.fly.map((f) => ({ id: f.id, from: f.from, to: f.to, at: f.at, land: f.land, res: f.res || null })), go: this.go, goAt: this.goAt, t: Math.round(this.t), max: this.max });
  }
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
  sizes(C) {
    const out = [];
    const style = Math.random();
    while (C > 0) {
      let s;
      if (style < 0.35) s = Math.min(C, rint(4, 6));          // جزر كبيرة
      else if (style < 0.7) s = Math.min(C, rint(2, 3));      // جزر صغيرة كتير
      else s = Math.min(C, rint(1, 6));                        // خلطة
      out.push(s); C -= s;
    }
    return shuffle(out).slice(0, 7).concat(out.length > 7 ? [out.slice(7).reduce((a, b) => a + b, 0)] : []);
  }
  spawn() {
    const n = this.alive.size;
    // عدد الجزر وحجمها عشوائي كل مرة (مرة جزيرتين 6 و6، مرة جزر صغيرة كتير…) — بس دايماً في حدا بيضل برّا
    const k = n <= 3 ? 1 : rint(1, Math.max(1, Math.floor(n * 0.45)));
    const caps = this.sizes(n - k);
    const isl = [];
    for (const cap of caps) {
      const r = 0.05 + Math.min(cap, 6) * 0.013;
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
    const nc = 1;
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
// 9) القنبلة — جويستيك: واحد على راسه القنبلة وبيلحق الناس، بس يلمس حدا بتنتقل لراسه. ما بترجع للي عطاك ياها (إلا إذا ضلّيتوا اتنين).
// الفتيل مبيّن، ولما تنفجر بيطلع اللي على راسه.
class Bomb extends Arena {
  constructor(ctx) { super(ctx); this.speed = 0.3; this.holder = null; this.from = null; this.passAt = 0; this.round = 0; this.phase = 'wait'; this.phaseEnd = now() + 2500; this.liveAt = 0; this.boomAt = 0; this.boom = null; }
  start() { this.msg = 'اللي على راسه القنبلة… يلحق غيره!'; }
  newRound() {
    this.round++;
    const al = [...this.alive];
    this.holder = al[rint(0, al.length - 1)]; this.from = null; this.passAt = now();
    this.phase = 'live'; this.liveAt = now();
    const n = al.length; this.boomAt = this.liveAt + rint(6500, 10500) + Math.min(n, 10) * 300;
    this.msg = 'القنبلة عم تحترق…'; this.boom = null;
  }
  tick(dt) {
    if (this.done) return;
    const t = now();
    if (this.phase === 'wait') { this.moveAll(dt); if (t >= this.phaseEnd) this.newRound(); return; }
    if (this.phase === 'boom') { if (t >= this.phaseEnd) { if (!this.done) { this.phase = 'wait'; this.phaseEnd = t + 1500; this.msg = 'جولة جديدة…'; } } return; }
    // اللي حامل القنبلة أسرع شوي
    for (const p of this.alive) {
      const v = this.mv[p], q = this.pos[p], sp = this.speed * (p === this.holder ? 1.12 : 1);
      q[0] = clamp(q[0] + v[0] * sp * dt, 0.03, 0.97); q[1] = clamp(q[1] + v[1] * sp * dt, 0.05, 0.97);
    }
    if (!this.alive.has(this.holder)) { const al = [...this.alive]; this.holder = al[rint(0, al.length - 1)]; this.from = null; }
    // اللمس بينقل القنبلة
    if (t - this.passAt > 500) {
      const h = this.pos[this.holder];
      const two = this.alive.size <= 2;
      let best = null, bd = 0.065;
      for (const p of this.alive) {
        if (p === this.holder || (!two && p === this.from)) continue;
        const q = this.pos[p], d = Math.hypot(q[0] - h[0], q[1] - h[1]);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) { this.from = this.holder; this.holder = best; this.passAt = t; }
    }
    if (t >= this.boomAt) {
      const v = this.holder; this.boom = { id: v, at: t };
      this.phase = 'boom'; this.phaseEnd = t + 2600;
      this.msg = 'بووم!';
      this.eliminate([v], 'انفجرت فيه القنبلة');
    }
  }
  view() { return Object.assign(this.baseView(), { kind: 'bomb', pos: this.posView(), holder: this.phase === 'live' ? this.holder : null, from: this.from, phase: this.phase, liveAt: this.liveAt, boomAt: this.phase === 'live' ? this.boomAt : 0, boom: this.boom, round: this.round, passAt: this.passAt }); }
}

// 10) عالي واطي — درج من 5 درجات. الموبايل بينادي رقم درجة، والكل لازم يطلع أو ينزل عليها قبل ما يخلص الوقت.
// وأحياناً الموبايل نفسه بيوقف على درجة غير اللي قالها ليضحك عليكن.
class HighLow extends ElimGame {
  constructor(ctx) { super(ctx); this.step = {}; this.ids.forEach((p) => (this.step[p] = 1)); this.calls = []; this.k = 0; this.pend = null; this.last = null; this.cur = 1; }
  get realtime() { return true; }
  start() { this.msg = 'اسمع الرقم… مو وين واقف الموبايل!'; this.t0 = now() + 2500; this.nextAt = this.t0; }
  input(pid, msg) {
    if (!this.alive.has(pid)) return;
    if (msg.a === 'mv') { const d = msg.v > 0 ? 1 : -1; this.step[pid] = clamp(this.step[pid] + d, 1, 5); }
  }
  newCall(t) {
    const k = this.k++;
    let target; do { target = rint(1, 5); } while (target === this.cur && Math.random() < 0.8);
    const trick = k >= 2 && Math.random() < Math.min(0.5, 0.2 + k * 0.015);
    let body = target; if (trick) { do { body = rint(1, 5); } while (body === target); }
    const win = Math.max(1100, 2600 - k * 70);                   // الوقت بيضيق
    const c = { i: k, at: t, target, body, win };
    this.cur = target; this.calls.push(c); this.calls = this.calls.slice(-3); this.pend = c;
    this.nextAt = t + win + Math.max(700, 1300 - k * 25);
  }
  tick() {
    if (this.done) return;
    const t = now();
    if (this.pend && t >= this.pend.at + this.pend.win) {
      const c = this.pend; this.pend = null;
      const al = [...this.alive];
      const wrong = al.filter((p) => this.step[p] !== c.target);
      this.last = { i: c.i, wrong, at: t, target: c.target };
      if (wrong.length) {
        if (wrong.length < al.length) this.eliminate(wrong, 'وقف عالدرجة الغلط');
        else {   // الكل غلط: بيطلع الأبعد عن الدرجة الصح
          const dist = (p) => Math.abs(this.step[p] - c.target); const mx = Math.max(...al.map(dist));
          const far = al.filter((p) => dist(p) === mx); if (far.length < al.length) this.eliminate(far, 'كان الأبعد');
        }
      }
    }
    if (!this.pend && t >= this.nextAt) this.newCall(t);
    if (this.k > 400) this.finish();
  }
  view() { return Object.assign(this.baseView(), { kind: 'highlow', t0: this.t0, calls: this.calls, pend: this.pend ? this.pend.i : -1, step: this.step, last: this.last }); }
}

// 11) الهوكي — كل اتنين ضد بعض، أول واحد بيسجّل جولين بيربح. بالتلاتية واحد بيستنى ويلعب مع الربحان.
const HW = 1, HH = 1.6, PR = 0.08, KR = 0.042, GW = 0.42, PY = 0.16;
class Hockey extends Bracket {
  initMatch(m) {
    m.wait = m.ps.slice(2); m.pair = m.ps.slice(0, 2); m.sc = {}; m.ps.forEach((p) => (m.sc[p] = 0));
    m.pd = {}; m.max = 60; this.resetPair(m, 0);
  }
  resetPair(m, toward) {
    const [a, b] = m.pair;
    m.pd = {};
    if (a) m.pd[a] = { x: 0.5, y: HH - PY, tx: 0.5, ty: HH - PY, vx: 0, vy: 0 };   // a تحت
    if (b) m.pd[b] = { x: 0.5, y: PY, tx: 0.5, ty: PY, vx: 0, vy: 0 };            // b فوق
    m.serve = (m.serve || 0) + 1;
    const dir = toward || (Math.random() < 0.5 ? -1 : 1); { const a0 = rnd(-0.6, 0.6); const v0 = 0.9; m.pk = { x: 0.5, y: HH / 2, vx: Math.sin(a0) * v0, vy: dir * Math.cos(a0) * v0 }; }   // الطابة بتمشي شوي لعند اللي انسجل عليه
    m.freeze = now() + 1200; m.goal = null;
  }
  onShrink(m) {           // بالتلاتية: الربحان بيلعب مع اللي كان عم يستنى
    m.pair = m.active.slice(0, 2); m.wait = []; m.pair.forEach((p) => (m.sc[p] = 0)); m.t = 0; m.press = {}; m.sudden = false; this.resetPair(m, 0);
  }
  matchInput(m, pid, msg) {
    if (msg.a !== 'pad' || !m.pair.includes(pid)) return;
    const d = m.pd[pid]; if (!d) return;
    const x = clamp(+msg.x || 0, 0, 1);                                  // يمين ويسار بس
    if (pid === m.pair[0]) d.tx = PR + x * (HW - 2 * PR); else d.tx = HW - (PR + x * (HW - 2 * PR));
  }
  tickMatch(m, dt) {
    const t = now();
    if (m.goal && t < m.freeze) return;
    const steps = 4, h = dt / steps;
    for (let k = 0; k < steps; k++) {
      for (const p of m.pair) {
        const d = m.pd[p]; if (!d) continue;
        const dx = d.tx - d.x, dy = 0, dist = Math.abs(dx), mx = 2.4 * h;
        const mvx = dist > mx ? (dx / dist) * mx : dx, mvy = dist > mx ? (dy / dist) * mx : dy;
        d.vx = mvx / h; d.vy = mvy / h; d.x += mvx; d.y += mvy;
      }
      if (t < m.freeze) continue;
      const k2 = m.pk;
      k2.x += k2.vx * h; k2.y += k2.vy * h;
      // الطابة ما بتوقف أبداً، وكل ما طوّلتوا بتسرع
      { const want = Math.min(2.4, 0.95 + m.t * 0.025), sp0 = Math.hypot(k2.vx, k2.vy) || 1; const sp = sp0 < want ? want : sp0 * Math.exp(-0.3 * h); k2.vx *= sp / sp0; k2.vy *= sp / sp0;
        if (Math.abs(k2.vy) < 0.35 * sp) { k2.vy = Math.sign(k2.vy || 1) * 0.35 * sp; k2.vx = Math.sign(k2.vx || 1) * Math.sqrt(Math.max(0, sp * sp - k2.vy * k2.vy)); } }
      if (k2.x < KR) { k2.x = KR; k2.vx = Math.abs(k2.vx) * 0.9; }
      if (k2.x > HW - KR) { k2.x = HW - KR; k2.vx = -Math.abs(k2.vx) * 0.9; }
      const inMouth = Math.abs(k2.x - 0.5) < GW / 2;
      if (k2.y < KR && !inMouth) { k2.y = KR; k2.vy = Math.abs(k2.vy) * 0.9; }
      if (k2.y > HH - KR && !inMouth) { k2.y = HH - KR; k2.vy = -Math.abs(k2.vy) * 0.9; }
      for (const p of m.pair) {
        const d = m.pd[p]; if (!d) continue;
        const dx = k2.x - d.x, dy = k2.y - d.y, dist = Math.hypot(dx, dy), md = PR + KR;
        if (dist < md && dist > 1e-6) {
          const nx = dx / dist, ny = dy / dist;
          k2.x = d.x + nx * md; k2.y = d.y + ny * md;
          const rvx = k2.vx - d.vx, rvy = k2.vy - d.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) { k2.vx -= 1.85 * vn * nx; k2.vy -= 1.85 * vn * ny; }
          k2.vx += d.vx * 0.25; k2.vy += d.vy * 0.25;
          const sp = Math.hypot(k2.vx, k2.vy); if (sp > 3.2) { k2.vx *= 3.2 / sp; k2.vy *= 3.2 / sp; }
          m.hitAt = t;
        }
      }
      // جول؟
      if (k2.y < -KR || k2.y > HH + KR) {
        const scorer = k2.y < 0 ? m.pair[0] : m.pair[1];     // الطابة فاتت مرمى اللي فوق ← سجّل اللي تحت
        const loser = scorer === m.pair[0] ? m.pair[1] : m.pair[0];
        m.sc[scorer]++; m.goal = { by: scorer, at: t };
        if (m.sc[scorer] >= 2 || m.sudden) { this.knock(m, loser); return; }
        this.resetPair(m, scorer === m.pair[0] ? -1 : 1); m.goal = { by: scorer, at: t };
        return;
      }
    }
    // مين ضاغط أكتر: الطابة بنص الخصم
    if (m.pk && t >= m.freeze) { const k = m.pk.y < HH / 2 ? m.pair[0] : m.pair[1]; m.press = m.press || {}; m.press[k] = (m.press[k] || 0) + dt; }
    if (m.t >= m.max && !m.sudden) {
      const [a, b] = m.pair;
      if (m.sc[a] !== m.sc[b]) this.knock(m, m.sc[a] > m.sc[b] ? b : a);
      else { m.sudden = true; }                                  // تعادل: الجول الجاي بيربح
    } else if (m.sudden && m.t >= m.max + 25) {                  // وإذا ما حدا سجّل: بيربح اللي ضغط أكتر بنص التاني
      const [a, b] = m.pair, pr = m.press || {};
      this.knock(m, (pr[a] || 0) >= (pr[b] || 0) ? b : a);
    }
  }
  get pushEvery() { return 0.033; }   // الهوكي بدها تحديث أسرع لتمشي الطابة ناعمة
  matchView(m) {
    const r = (v) => Math.round(v * 1000) / 1000;
    const pd = {}; for (const p in m.pd) pd[p] = [r(m.pd[p].x), r(m.pd[p].y)];
    return { pair: m.pair, wait: m.wait, sc: m.sc, pd, pk: [r(m.pk.x), r(m.pk.y)], pv: [r(m.pk.vx), r(m.pk.vy)], frozen: now() < m.freeze, freeze: m.freeze, goal: m.goal, max: m.max, sudden: !!m.sudden, hitAt: m.hitAt || 0 };
  }
}

// 12) الدبكة — اللويّح هو الموبايل
const MOVES = ['R', 'L', 'D'];
class Dabke extends ElimGame {
  // بتطلع إشارة وحدة بس (يمين / فوق / شمال)، وبتكبسها فوراً. كل لاعب إله 3 غلطات، وكل ما طوّلتوا بتسرع.
  constructor(ctx) { super(ctx); this.beats = []; this.press = {}; this.judged = 0; this.t0 = 0; this.errs = {}; this.ids.forEach((p) => (this.errs[p] = 0)); this.lastErr = {}; }
  get realtime() { return true; }
  start() {
    this.t0 = now() + 3000; this.msg = 'بس تطلع الإشارة… اكبسها! معك 3 غلطات';
    let t = this.t0; let last = '';
    for (let i = 0; i < 500; i++) {
      let mv; do { mv = MOVES[rint(0, 2)]; } while (mv === last && Math.random() < 0.6);
      last = mv;
      const win = Math.max(480, 1400 - i * 14);                   // الوقت المسموح للكبسة بيضيق
      const gap = Math.max(250, 600 - i * 6);                     // والراحة بين الإشارات بتقصر
      this.beats.push({ i, at: Math.round(t), mv, win, pr: i < 3 });
      t += win + gap;
    }
  }
  input(pid, msg) {
    if (msg.a !== 'step' || !this.alive.has(pid)) return;
    const at = +msg.at || now();
    const b = this.beats.find((x) => at >= x.at - 60 && at <= x.at + x.win);
    if (!b || b.i < this.judged) return;                           // كبسة بين الإشارات ما بتنحسب
    const k = pid + ':' + b.i; if (this.press[k]) return;          // أول كبسة بس بتنحسب
    this.press[k] = { mv: msg.v, d: at - b.at };
  }
  tick() {
    if (this.done) return;
    const t = now();
    while (this.judged < this.beats.length && t > this.beats[this.judged].at + this.beats[this.judged].win + 150) {
      const b = this.beats[this.judged];
      const al = [...this.alive];
      const miss = al.filter((p) => { const pr = this.press[p + ':' + b.i]; return !pr || pr.mv !== b.mv; });
      if (!b.pr && miss.length && miss.length < al.length) {
        miss.forEach((p) => { this.errs[p]++; this.lastErr[p] = t; });
        const outs = miss.filter((p) => this.errs[p] >= 3);
        if (outs.length) {
          if (outs.length >= al.length) { /* ما بيطلعوا الكل */ }
          else this.eliminate(outs, 'خلصت غلطاته');
        }
      }
      this.judged++;
      if (this.done) return;
    }
    if (this.judged >= this.beats.length) this.finish();
  }
  view() {
    const from = Math.max(0, this.judged - 1);
    return Object.assign(this.baseView(), { kind: 'dabke', t0: this.t0, judged: this.judged, beats: this.beats.slice(from, from + 4), errs: this.errs, lastErr: this.lastErr, lives: 3 });
  }
}

const GAMES = {
  tug: { cls: Tug, name: 'شدّ الحبل', icon: '🪢' },
  island: { cls: Island, name: 'الجزيرة', icon: '🏝️' },
  rps: { cls: RPS, name: 'حجرة ورقة مقص', icon: '✊' },
  push: { cls: Push, name: 'الدفش', icon: '💥' },
  bomb: { cls: Bomb, name: 'القنبلة', icon: '💣' },
  highlow: { cls: HighLow, name: 'عالي واطي', icon: '↕️' },
  hockey: { cls: Hockey, name: 'الهوكي', icon: '🏒' },
  pillow: { cls: Pillow, name: 'معركة المخدّات', icon: '🛋️' },
  tag: { cls: Tag, name: 'تخليص', icon: '🏃' },
  blow: { cls: Blow, name: 'النفخ', icon: '🌬️' },
  slipper: { cls: Slipper, name: 'حرب الشحاطات', icon: '🩴' },
  dabke: { cls: Dabke, name: 'الدبكة', icon: '🥁' },
};

module.exports = { GAMES, shuffle };
