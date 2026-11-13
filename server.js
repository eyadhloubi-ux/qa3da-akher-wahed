// قعدة آخر واحد — السيرفر
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { GAMES, shuffle } = require('./games');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'qa3da';
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
const now = () => Date.now();

// ───────── إحصائيات ─────────
let stats = { sessions: 0, players: 0, gamesPlayed: {}, finished: 0, since: new Date().toISOString() };
try { stats = Object.assign(stats, JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))); } catch (e) {}
let statsDirty = false;
setInterval(() => { if (!statsDirty) return; statsDirty = false; try { fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true }); fs.writeFileSync(STATS_FILE, JSON.stringify(stats)); } catch (e) {} }, 10000);
const bump = (k, sub) => { if (sub) { stats[k][sub] = (stats[k][sub] || 0) + 1; } else stats[k]++; statsDirty = true; };

// ───────── التطبيق ─────────
const app = express();
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', setHeaders: (res, p) => { if (/sw\.js$|index\.html$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/health', (q, r) => r.send('ok'));
app.get('/stats', (q, r) => r.json(Object.assign({}, stats, { liveRooms: rooms.size, livePlayers: [...rooms.values()].reduce((s, x) => s + [...x.players.values()].filter((p) => p.online).length, 0) })));
app.get('/admin', (q, r) => {
  if (q.query.key !== ADMIN_KEY) return r.status(403).send('ممنوع');
  r.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admin/data', (q, r) => {
  if (q.query.key !== ADMIN_KEY) return r.status(403).json({});
  r.json({ stats, rooms: [...rooms.values()].map((x) => ({ code: x.code, name: x.name, phase: x.phase, players: x.players.size, online: [...x.players.values()].filter((p) => p.online).length, game: x.cur && x.cur.gid, created: x.created })) });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2 * 1024 * 1024 });

// ───────── الغرف ─────────
const rooms = new Map();
const COLORS = ['#E2553D', '#2A7DE1', '#2BA36B', '#E8A317', '#8E5BD8', '#E5689A', '#1FA8A8', '#F07B2A', '#5B6B7A', '#A8432C', '#3B4CC0', '#6E9B23', '#C2410C', '#0E7490', '#9D174D', '#7C5E10'];
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => { let c; do { c = ''; for (let i = 0; i < 5; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; } while (rooms.has(c)); return c; };
const newId = () => Math.random().toString(36).slice(2, 10);
const POINTS = [0, 5, 4, 3, 2, 1];      // المركز ← النقاط

function cleanName(s, max = 24) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, max); }
function cleanPhoto(s) { s = String(s || ''); return /^data:image\/(jpeg|png|webp);base64,/.test(s) && s.length < 450000 ? s : ''; }

function makeRoom(host, sess) {
  const code = newCode();
  const room = {
    code, created: now(), hostId: null, name: cleanName(sess.name, 30) || 'قعدتنا', type: cleanName(sess.type, 20) || 'شلة',
    games: Object.keys(GAMES), groupPhoto: '', groupPhotoVer: 0,
    players: new Map(), order: 0, phase: 'lobby', played: [], cur: null, wheel: null, reveal: null, ready: new Set(), seq: 0, timers: [],
  };
  rooms.set(code, room);
  bump('sessions');
  return room;
}

function addPlayer(room, d) {
  const used = new Set([...room.players.values()].map((p) => p.color));
  const color = COLORS.find((c) => !used.has(c)) || COLORS[room.players.size % COLORS.length];
  const p = { id: newId(), token: newId() + newId(), name: cleanName(d.name) || `لاعب ${room.players.size + 1}`, gender: d.gender === 'f' ? 'f' : 'm', photo: cleanPhoto(d.photo), photoVer: 1, color, online: true, lastSeen: now(), joined: ++room.order, ws: null, total: 0 };
  room.players.set(p.id, p);
  bump('players');
  return p;
}

function pubPlayer(p) { return { id: p.id, name: p.name, gender: p.gender, color: p.color, online: p.online, photoVer: p.photo ? p.photoVer : 0, joined: p.joined, total: p.total }; }

function roomView(room) {
  return {
    code: room.code, hostId: room.hostId, name: room.name, type: room.type, count: room.games.length, games: room.games, groupPhotoVer: room.groupPhoto ? room.groupPhotoVer : 0,
    players: [...room.players.values()].map(pubPlayer), phase: room.phase, seq: room.seq,
    played: room.played.filter((g) => !g.cancelled).map((g) => ({ gid: g.gid, rank: g.rank })),
    cur: room.cur ? { gid: room.cur.gid, ids: room.cur.ids, stage: room.cur.stage, startAt: room.cur.startAt, rank: room.cur.rank || null, n: room.cur.n } : null,
    wheel: room.wheel, ready: [...room.ready], reveal: room.reveal, now: now(),
  };
}

function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function broadcast(room, o) { const s = JSON.stringify(o); for (const p of room.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }
function pushRoom(room) { room.seq++; broadcast(room, { t: 'room', room: roomView(room) }); }
function pushGame(room) { if (room.cur && room.cur.game) broadcast(room, { t: 'g', g: room.cur.game.view(), now: now() }); }

function later(room, ms, fn) { const h = setTimeout(() => { room.timers = room.timers.filter((x) => x !== h); fn(); }, ms); room.timers.push(h); return h; }
function clearTimers(room) { room.timers.forEach(clearTimeout); room.timers = []; }

// ───────── الترتيب والنقاط ─────────
// مجموعات الطالعين بالترتيب (الأخيرة = آخر من ضل). آخر واحد بياخد 5، اللي قبله 4… واللي طلعوا سوا بياخدوا نقاط أحسن مركز بيناتهن.
function rankFromGroups(groups) {
  const total = groups.reduce((s, g) => s + g.length, 0);
  const res = [];
  let worst = total;
  for (const g of groups) {
    const best = worst - g.length + 1;
    const pts = POINTS[best] || 0;          // اللي طلعوا سوا بياخدوا نقاط مركزهن (بلا كسور)
    g.forEach((id) => res.push({ id, pos: best, pts }));
    worst = best - 1;
  }
  return res.sort((a, b) => a.pos - b.pos);
}

function recomputeTotals(room) {
  for (const p of room.players.values()) p.total = 0;
  for (const g of room.played) if (!g.cancelled) for (const r of g.rank) { const p = room.players.get(r.id); if (p) p.total = Math.round((p.total + r.pts) * 100) / 100; }
}

// ───────── الدولاب ─────────
const GAME_IDS = Object.keys(GAMES);
function playedIds(room) { return room.played.filter((g) => !g.cancelled).map((g) => g.gid); }

function spinWheel(room, exclude) {
  clearTimers(room);
  const done = playedIds(room);
  const pool = room.games.filter((g) => !done.includes(g) && g !== exclude);
  if (!pool.length) return toReveal(room);
  let gid = pool[Math.floor(Math.random() * pool.length)];
  if (process.env.FORCE_ORDER) { const f = process.env.FORCE_ORDER.split(',').find((g) => pool.includes(g)); if (f) gid = f; }   // للفحص فقط
  room.phase = 'wheel'; room.cur = null; room.ready.clear();
  room.wheel = { gid, idx: GAME_IDS.indexOf(gid), startAt: now() + 400, dur: 5200, turns: 5 + Math.floor(Math.random() * 3), jitter: Math.random() * 0.6 - 0.3, done: done.slice(), off: GAME_IDS.filter((g) => !room.games.includes(g)), n: done.length + 1 };
  pushRoom(room);
  later(room, 400 + 5200 + 1600, () => toIntro(room, gid));
}

function onlineIds(room) { return [...room.players.values()].filter((p) => p.online).sort((a, b) => a.joined - b.joined).map((p) => p.id); }

function toIntro(room, gid) {
  clearTimers(room);
  room.phase = 'game';
  room.cur = { gid, ids: onlineIds(room), stage: 'intro', game: null, n: playedIds(room).length + 1 };
  room.ready.clear();
  room.wheel = null;
  pushRoom(room);
  later(room, 45000, () => { if (room.cur && room.cur.stage === 'intro') beginGame(room); });
}

function maybeAutoBegin(room) {
  if (!room.cur || room.cur.stage !== 'intro') return;
  const on = onlineIds(room);
  if (on.length >= 2 && on.every((id) => room.ready.has(id))) beginGame(room);
}

function beginGame(room) {
  if (!room.cur || room.cur.stage !== 'intro') return;
  clearTimers(room);
  const ids = onlineIds(room);
  if (ids.length < 2) { pushRoom(room); return; }
  room.cur.ids = ids;
  room.cur.stage = 'count';
  room.cur.startAt = now() + 3200;
  pushRoom(room);
  later(room, 3200, () => startGame(room));
}

function startGame(room) {
  const cur = room.cur; if (!cur) return;
  const G = GAMES[cur.gid];
  const ids = cur.ids.filter((id) => room.players.has(id));
  cur.stage = 'play';
  const game = new G.cls({
    ids,
    onOut: () => pushGame(room),
    onFinish: (groups) => later(room, 1400, () => finishGame(room, groups)),
  });
  cur.game = game;
  bump('gamesPlayed', cur.gid);
  game.start && game.start();
  pushRoom(room);
  pushGame(room);
  let last = now(), acc = 0;
  cur.loop = setInterval(() => {
    const t = now(), dt = Math.min(0.1, (t - last) / 1000); last = t;
    try { game.tick(dt); } catch (e) { console.error('tick', cur.gid, e); }
    acc += dt;
    if (game.realtime && acc >= 0.05) { acc = 0; pushGame(room); }
  }, 33);
}

function stopLoop(room) { if (room.cur && room.cur.loop) { clearInterval(room.cur.loop); room.cur.loop = null; } }

function finishGame(room, groups) {
  const cur = room.cur; if (!cur || cur.stage !== 'play') return;
  stopLoop(room);
  groups = groups.map((g) => g.filter((id) => room.players.has(id))).filter((g) => g.length);
  const rank = rankFromGroups(groups);
  cur.rank = rank; cur.stage = 'over';
  room.played.push({ gid: cur.gid, rank, at: now() });
  recomputeTotals(room);
  pushGame(room);
  pushRoom(room);
  later(room, 14000, () => { if (room.cur === cur && cur.stage === 'over') spinWheel(room); });
}

function toReveal(room) {
  clearTimers(room); stopLoop(room);
  recomputeTotals(room);
  room.phase = 'reveal'; room.cur = null; room.wheel = null;
  // ترتيب نهائي: النقاط، بعدين عدد المراكز الأولى، بعدين مراكز التلاتة الأولى
  const firsts = {}, tops = {};
  for (const g of room.played) if (!g.cancelled) for (const r of g.rank) { if (r.pos === 1) firsts[r.id] = (firsts[r.id] || 0) + 1; if (r.pos <= 3) tops[r.id] = (tops[r.id] || 0) + 1; }
  const ps = [...room.players.values()].map((p) => ({ id: p.id, pts: p.total, f: firsts[p.id] || 0, t3: tops[p.id] || 0 }));
  ps.sort((a, b) => b.pts - a.pts || b.f - a.f || b.t3 - a.t3);
  const final = []; let pos = 0;
  ps.forEach((p, i) => { const prev = ps[i - 1]; if (!prev || prev.pts !== p.pts || prev.f !== p.f || prev.t3 !== p.t3) pos = i + 1; final.push({ id: p.id, pos, pts: p.pts, f: p.f }); });
  const positions = [...new Set(final.map((f) => f.pos))].sort((a, b) => b - a);
  room.reveal = { final, positions, step: 0, done: false };
  stats.finished++; statsDirty = true;
  pushRoom(room);
  revealTick(room);
}

function revealTick(room) {
  const rv = room.reveal; if (!rv || rv.done) return;
  const wait = rv.step === 0 ? 2500 : (rv.positions[rv.step - 1] <= 3 ? 4200 : 2600);
  later(room, wait, () => {
    if (!room.reveal) return;
    if (rv.step < rv.positions.length) { rv.step++; pushRoom(room); revealTick(room); }
    else { rv.done = true; room.phase = 'final'; pushRoom(room); }
  });
}

function resetSession(room, keepPlayers) {
  clearTimers(room); stopLoop(room);
  room.played = []; room.cur = null; room.wheel = null; room.reveal = null; room.ready.clear(); room.phase = 'lobby'; room.games = (room.sel || Object.keys(GAMES)).slice();
  if (!keepPlayers) { for (const p of [...room.players.values()]) if (p.id !== room.hostId) { send(p.ws, { t: 'kicked', why: 'new' }); room.players.delete(p.id); } room.groupPhoto = ''; room.groupPhotoVer++; }
  recomputeTotals(room);
  bump('sessions');
  pushRoom(room);
}

function kick(room, id) {
  const p = room.players.get(id); if (!p || id === room.hostId) return;
  room.players.delete(id);
  room.ready.delete(id);
  send(p.ws, { t: 'kicked', why: 'host' });
  if (room.cur) {
    room.cur.ids = room.cur.ids.filter((x) => x !== id);
    if (room.cur.game && !room.cur.game.done) room.cur.game.remove(id);
  }
  for (const g of room.played) g.rank = g.rank.filter((r) => r.id !== id);
  if (room.reveal) room.reveal.final = room.reveal.final.filter((r) => r.id !== id);
  recomputeTotals(room);
  pushRoom(room); pushGame(room);
  maybeAutoBegin(room);
}

function setHost(room, id) { if (room.players.has(id)) { room.hostId = id; pushRoom(room); } }

// انتقال الريسة لحالها إذا الريس انقطع
setInterval(() => {
  for (const room of rooms.values()) {
    const h = room.players.get(room.hostId);
    const on = [...room.players.values()].filter((p) => p.online);
    if ((!h || (!h.online && now() - h.lastSeen > 25000)) && on.length) { room.hostId = on.sort((a, b) => a.joined - b.joined)[0].id; pushRoom(room); broadcast(room, { t: 'toast', text: 'الريس طلع… صار في ريس جديد' }); }
    // تنظيف الغرف الفاضية
    if (!on.length && now() - Math.max(...[...room.players.values()].map((p) => p.lastSeen), room.created) > 3 * 3600 * 1000) { clearTimers(room); stopLoop(room); rooms.delete(room.code); }
  }
}, 5000);

// ───────── الاتصال ─────────
function sendPhotos(ws, room) {
  for (const p of room.players.values()) if (p.photo) send(ws, { t: 'photo', id: p.id, v: p.photoVer, data: p.photo });
  if (room.groupPhoto) send(ws, { t: 'gphoto', v: room.groupPhotoVer, data: room.groupPhoto });
}

function attach(ws, room, p) {
  if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'replaced'); } catch (e) {} }
  p.ws = ws; p.online = true; p.lastSeen = now();
  ws.room = room; ws.pid = p.id;
  send(ws, { t: 'you', id: p.id, token: p.token, code: room.code });
  sendPhotos(ws, room);
  pushRoom(room);
  if (room.cur && room.cur.game) send(ws, { t: 'g', g: room.cur.game.view(), now: now() });
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    ws.isAlive = true;
    try { handle(ws, m); } catch (e) { console.error('handle', m && m.t, e); }
  });
  ws.on('close', () => {
    const room = ws.room; if (!room) return;
    const p = room.players.get(ws.pid);
    if (p && p.ws === ws) { p.online = false; p.lastSeen = now(); pushRoom(room); maybeAutoBegin(room); }
  });
});
setInterval(() => { wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) {} }); }, 15000);

function handle(ws, m) {
  if (m.t === 'ping') return send(ws, { t: 'pong', c: m.c, s: now() });

  if (m.t === 'create') {
    const room = makeRoom(m.player || {}, m.session || {});
    const p = addPlayer(room, m.player || {});
    room.hostId = p.id;
    return attach(ws, room, p);
  }
  if (m.t === 'hello') {
    const room = rooms.get(String(m.code || '').toUpperCase());
    if (!room) return send(ws, { t: 'noroom' });
    ws.room = room; ws.pid = null;
    const p = [...room.players.values()].find((x) => x.token === m.token);
    if (p) return attach(ws, room, p);
    send(ws, { t: 'guest', room: roomView(room) });
    if (room.groupPhoto) send(ws, { t: 'gphoto', v: room.groupPhotoVer, data: room.groupPhoto });
    return;
  }
  const room = ws.room; if (!room) return;
  if (m.t === 'join') {
    if (ws.pid && room.players.has(ws.pid)) return;
    if (room.players.size >= 20) return send(ws, { t: 'toast', text: 'القعدة مليانة (20 لاعب)' });
    const p = addPlayer(room, m);
    broadcast(room, p.photo ? { t: 'photo', id: p.id, v: p.photoVer, data: p.photo } : { t: 'noop' });
    return attach(ws, room, p);
  }
  const me = room.players.get(ws.pid); if (!me) return;
  me.lastSeen = now();
  const isHost = me.id === room.hostId;

  switch (m.t) {
    case 'profile': {
      if (m.name !== undefined) me.name = cleanName(m.name) || me.name;
      if (m.gender) me.gender = m.gender === 'f' ? 'f' : 'm';
      if (m.photo !== undefined) { me.photo = cleanPhoto(m.photo); me.photoVer++; if (me.photo) broadcast(room, { t: 'photo', id: me.id, v: me.photoVer, data: me.photo }); }
      return pushRoom(room);
    }
    case 'ready': { if (room.cur && room.cur.stage === 'intro') { room.ready.add(me.id); pushRoom(room); maybeAutoBegin(room); } return; }
    case 'unready': { room.ready.delete(me.id); return pushRoom(room); }
    case 'g': { if (room.cur && room.cur.game && room.cur.stage === 'play' && room.cur.ids.includes(me.id)) { room.cur.game.input(me.id, m); if (!room.cur.game.realtime) pushGame(room); } return; }
    case 'claimHost': { const h = room.players.get(room.hostId); if (!h || (!h.online && now() - h.lastSeen > 25000)) setHost(room, me.id); return; }
  }
  if (!isHost) return;
  switch (m.t) {
    case 'session': {
      if (m.name !== undefined) room.name = cleanName(m.name, 30) || room.name;
      if (m.type !== undefined) room.type = cleanName(m.type, 20) || room.type;
      if (Array.isArray(m.games) && room.phase === 'lobby') { const sel = GAME_IDS.filter((g) => m.games.includes(g)); if (sel.length) { room.games = sel; room.sel = sel.slice(); } }
      if (m.groupPhoto !== undefined) { room.groupPhoto = cleanPhoto(m.groupPhoto); room.groupPhotoVer++; broadcast(room, { t: 'gphoto', v: room.groupPhotoVer, data: room.groupPhoto }); }
      return pushRoom(room);
    }
    case 'start': { if (room.phase === 'lobby' && onlineIds(room).length >= 2) spinWheel(room); return; }
    case 'begin': return beginGame(room);
    case 'skip': { // مرّر: هاللعبة بتنشال من القائمة وبيلفّ الدولاب على غيرها
      if (room.phase === 'wheel' && room.wheel) { const gid = room.wheel.gid; room.games = room.games.filter((g) => g !== gid); return spinWheel(room); }
      if (!room.cur) return; const gid = room.cur.gid; stopLoop(room);
      room.games = room.games.filter((g) => g !== gid);
      if (room.cur.stage === 'over') { const last = room.played[room.played.length - 1]; if (last && last.gid === gid) room.played.pop(); }
      recomputeTotals(room); return spinWheel(room, gid);
    }
    case 'replay': { // أعد اللعبة: النتيجة بتنلغى
      if (!room.cur) return; const gid = room.cur.gid; stopLoop(room);
      if (room.cur.stage === 'over') { const last = room.played[room.played.length - 1]; if (last && last.gid === gid) room.played.pop(); }
      recomputeTotals(room); return toIntro(room, gid);
    }
    case 'endGame': { if (room.cur && room.cur.game && room.cur.stage === 'play') room.cur.game.forceEnd(); return; }
    case 'next': { if (room.cur && room.cur.stage === 'over') spinWheel(room); return; }
    case 'finish': return toReveal(room);
    case 'skipReveal': { if (room.reveal) { clearTimers(room); room.reveal.step = room.reveal.positions.length; room.reveal.done = true; room.phase = 'final'; pushRoom(room); } return; }
    case 'newSession': return resetSession(room, !!m.same);
    case 'kick': return kick(room, m.id);
    case 'rename': { const p = room.players.get(m.id); if (p) { p.name = cleanName(m.name) || p.name; pushRoom(room); } return; }
    case 'transfer': return setHost(room, m.id);
  }
}

server.listen(PORT, () => console.log('قعدة آخر واحد شغّالة على ' + PORT));
module.exports = { rankFromGroups };
