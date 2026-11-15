// قعدة آخر واحد — الواجهة
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const IG = 'https://www.instagram.com/eyad.hloubi';

  const GAMES = {
    tug: { name: 'شدّ الحبل', icon: '🪢', how: 'كل اتنين ضد بعض. كبس «شدّ!» بأسرع ما فيك لتسحب الحبل لعندك. الخسرانين بيطلعوا، وإذا العدد فردي في حبل تلاتي.' },
    island: { name: 'الجزيرة', icon: '🏝️', how: 'لفّوا بالساحة، وفجأة بتطلع جزر عليها دواير (كل دائرة لواحد). عدد الجزر وحجمها بيتغيّر كل مرة. اركض واقعد بدائرة فاضية، واللي بيضل بلا جزيرة بيطلع.' },
    rps: { name: 'حجرة ورقة مقص', icon: '✊', how: 'كل اتنين ضد بعض، اللي بيربح مرتين بيكمّل. بالتلاتية بتضلّوا تلعبوا لحد ما واحد يغلب التنين سوا.' },
    push: { name: 'الدفش', icon: '💥', how: 'السهم بيلف حواليك. اضغط مطوّل لتوقفه وتشحن قوة، وفلّت لتندفش باتجاهه. طيّر غيرك برّا الحلبة… وانتبه ما تطلع لحالك! وكل 20 ثانية الحلبة بتصغر.' },
    bomb: { name: 'القنبلة', icon: '💣', how: 'كل واحد بالجويستيك. اللي على راسه القنبلة بيلحق الناس، وبس يلمس حدا بتنتقل لراسه، وما بترجع للي عطاه ياها (إلا إذا ضلّيتوا اتنين). الفتيل مبيّن فوق، ولما تنفجر بيطلع اللي على راسه.' },
    highlow: { name: 'عالي واطي', icon: '↕️', how: 'في درج من 5 درجات. الموبايل بينادي «الدرجة 3!» مثلاً، وإنت بتطلع وبتنزل بالزرّين لتوصلها قبل ما يخلص الوقت. انتبه: أحياناً الموبايل بيوقف عدرجة غير اللي قالها! اللي بيكون عالدرجة الغلط بيطلع، والوقت بيقصر.' },
    chairs: { name: 'كراسي', icon: '🪑', how: 'الكراسي بالنص وعددها أقل منكن بواحد، والكل بيلفّ حواليها والموسيقى شغالة. بس توقف الموسيقى اكبس «اقعد!» بأسرع ما فيك. اللي ما لحق كرسي بيطلع، واللي بيكبس قبل ما توقف بيتزحلق. وانتبه: أحياناً الموسيقى بتخفت وبترجع لتضحك عليك!' },
    pillow: { name: 'معركة المخدّات', icon: '🛋️', how: 'الكل بساحة وحدة. حرّك شخصيتك بالجويستيك، لفّ على حدا واكبس «اضرب». بعد كل ضربة بتصيب بتستنى ثانيتين، فاهرب وارجع. 3 ضربات وبتطير.' },
    tag: { name: 'تخليص', icon: '🏃', how: 'المسّاك هو الموبايل نفسه. حرّك شخصيتك واهرب منه بالساحة. اللي بيمسكه بيطلع، وآخر واحد بيضل هو الفايز.' },
    blow: { name: 'النفخ', icon: '🌬️', how: 'كل اتنين مقابل بعض وبيناتكن ريشة. انفخوا عالمايك (أسفل الموبايل) بنفس الوقت، والأقوى بيزحلها لعند التاني. اللي بتوصلو الريشة بيطلع. اعمل المعايرة قبل اللعبة، وإذا المايك ما زبط معك بتكبس بسرعة بدل النفخ.' },
    slipper: { name: 'حرب الشحاطات', icon: '🩴', how: 'كلكن بحلقة وحدة، كل واحد ورا كنباية. دقّ على اللي بدك تشلّف عليه، وبتضل تشلّف عليه شحاطة كل ثانية. طول ما إصبعك عالزر إنت متخبّي، بس التخبّاية بتخلص إذا طوّلت. اللي بينصاب مرتين بيطلع، وآخر اتنين الشحاطات بتصير طايرة!' },
    dabke: { name: 'الدبكة', icon: '🥁', how: 'بتطلع إشارة وحدة بالنص: يمين أو فوق أو شمال. بس تطلع اكبسها فوراً. معك 3 غلطات، وكل ما طوّلتوا الإشارات بتسرع.' },
  };
  const GIDS = Object.keys(GAMES);
  const ENC_M = ['حظ أوفر', 'شدّ حيلك', 'الجاية إلك', 'طلعت بكير… بس بشرف', 'المرة الجاية بتكسّرها'];
  const ENC_F = ['حظ أوفر', 'شدّي حيلك', 'الجاية إلِك', 'طلعتي بكير… بس بشرف', 'المرة الجاية بتكسّريها'];
  function title(pos, g, id) {
    const f = g === 'f';
    if (pos === 1) return f ? 'آخر وحدة' : 'آخر واحد';
    if (pos === 2) return f ? 'قبل الأخيرة' : 'قبل الأخير';
    if (pos === 3) return f ? 'صامدة للآخر' : 'صامد للآخر';
    const l = f ? ENC_F : ENC_M; let h = 0; for (const ch of id || '') h = (h * 31 + ch.charCodeAt(0)) % 997; return l[h % l.length];
  }

  // ───── الهوية ─────
  document.querySelectorAll('.fam-ch').forEach((el) => (el.innerHTML = BRAND.chairSVG(30)));
  $('#coverIcon').innerHTML = BRAND.iconSVG(132);
  $('#editMe2') && ($('#editMe2').onclick = () => $('#editMe').click());

  // ───── الحالة ─────
  const S = { ws: null, code: null, token: null, me: null, room: null, g: null, offset: 0, rtt: 1e9, lastMsg: 0, retry: 0, mode: null, pendingCreate: null, wantClose: false, gkey: '', lastFlash: 0, introKey: '', wheelKey: '', revealStep: -1, finalKey: '', gphoto: null };
  const sNow = () => Date.now() + S.offset;
  const me = () => S.room && S.room.players.find((p) => p.id === S.me);
  const isHost = () => S.room && S.room.hostId === S.me;
  const P = (id) => S.room && S.room.players.find((p) => p.id === id);

  // ───── الثيم ─────
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.themeResolved = dark ? 'dark' : 'light';
    document.querySelector('meta[name=theme-color]').content = dark ? '#1C1A22' : '#F4E9D4';
    const tb = document.querySelector('#btnTheme'); if (tb) tb.innerHTML = `<svg><use href="#${dark ? 'i-sun' : 'i-moon'}"/></svg>`;
    D.readCss();
  }
  let theme = localStorage.getItem('akw-theme') || '';
  applyTheme(theme);
  $('#btnTheme').onclick = () => { const cur = document.documentElement.dataset.themeResolved; theme = cur === 'dark' ? 'light' : 'dark'; localStorage.setItem('akw-theme', theme); applyTheme(theme); };

  // ───── أدوات ─────
  let toastT;
  function toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
  // رجوع وقدّام: الرجوع خطوة وحدة لورا (بنص القعدة بيفرجيك الشاشة اللي قبل بلا ما يوقف اللعب)، وقدّام بيرجعك لمكانك
  const NAV = { back: [], fwd: [] }, PEEKABLE = new Set(['cover', 'code', 'profile', 'lobby', 'over', 'final']);
  function show(id) {
    if (!S.navMove && S.screen && S.screen !== id) { if (PEEKABLE.has(S.screen) && !(S.room && S.me && ['cover', 'code', 'profile'].includes(S.screen))) { NAV.back.push(S.screen); if (NAV.back.length > 20) NAV.back.shift(); } NAV.fwd = []; }
    showRaw(id); navBtns();
  }
  function navBtns() { $('#btnBack').classList.toggle('dis', !NAV.back.length); $('#btnFwd').classList.toggle('dis', !NAV.fwd.length && !S.peek); let pk = $('#peekChip'); if (S.peek) { if (!pk) { pk = document.createElement('button'); pk.id = 'peekChip'; pk.className = 'peek'; pk.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>رجعة للقعدة'; pk.onclick = goFwd; document.body.appendChild(pk); } } else if (pk) pk.remove(); }
  function inRoom() { return !!(S.room && S.me); }
  function goBack() { if (!NAV.back.length) return; const prev = NAV.back.pop(); NAV.fwd.push(S.peek ? S.peekFrom || S.screen : S.screen); if (inRoom() && !['cover', 'code', 'profile'].includes(prev)) { if (!S.peek) S.peekFrom = S.screen; S.peek = true; } S.navMove = true; showRaw(prev); S.navMove = false; navBtns(); }
  function goFwd() { if (S.peek) { S.peek = false; NAV.fwd = []; route(); navBtns(); return; } if (!NAV.fwd.length) return; const nx = NAV.fwd.pop(); NAV.back.push(S.screen); S.navMove = true; showRaw(nx); S.navMove = false; navBtns(); }
  function showRaw(id) { if (id !== 'intro') DEMO.stop(); $$('.screen').forEach((s) => s.classList.toggle('on', s.id === 's-' + id)); S.screen = id; $('#top').classList.toggle('hide', id === 'cover'); document.body.classList.toggle('host', isHost()); $$('.host-only').forEach((e) => e.classList.toggle('hide', !isHost())); window.scrollTo(0, 0); }
  function modal(id, on) { $('#' + id).classList.toggle('hide', !on); }
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.classList.add('hide'); }));
  $$('[data-back]').forEach((b) => (b.onclick = () => { if (S.room && S.me) { S.mode = ''; route(); } else if (NAV.back.length) goBack(); else show('cover'); }));
  $('#btnBack').onclick = goBack; $('#btnFwd').onclick = goFwd;
  // الأزرار فوق: مخفية، وبتطلع لما تطلع لفوق (سكرول أو سحبة لتحت) أو تدق عالشريط، وبتختفي بعد شوي
  const TOP = $('#top'); let topT = 0;
  function topOpen(ms = 4000) { TOP.classList.add('open'); clearTimeout(topT); topT = setTimeout(() => { if (!TOP.matches(':hover')) TOP.classList.remove('open'); else topOpen(2000); }, ms); }
  $('#btnGrip').onclick = (e) => { e.stopPropagation(); topOpen(); };
  TOP.addEventListener('click', (e) => { if (!e.target.closest('.top-btns')) topOpen(); else topOpen(3000); });
  let lastY = window.scrollY; window.addEventListener('scroll', () => { const y = window.scrollY; if (y < lastY - 6 || y < 4) topOpen(); lastY = y; }, { passive: true });
  window.addEventListener('wheel', (e) => { if (e.deltaY < -8) topOpen(); }, { passive: true });
  let ty0 = null; window.addEventListener('touchstart', (e) => { ty0 = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => { if (ty0 != null && e.touches[0].clientY - ty0 > 60 && (ty0 < 150 || (window.scrollY < 4 && !e.target.closest('#controls,.stage,.joy,.crop-box,.demo-box')))) { topOpen(); ty0 = null; } }, { passive: true });
  function avatarHTML(id, cls = 'hd') { const p = P(id) || {}; const im = D.photo(id); return `<i class="${cls}" style="background-color:${p.color || '#999'};${im ? `background-image:url(${im.src})` : ''}">${im ? '' : D.initials(p.name)}</i>`; }
  function confirmBox(text, yes) { $('#confTxt').textContent = text; modal('mConfirm', true); $('#confYes').onclick = () => { modal('mConfirm', false); yes(); }; }
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ───── الاتصال (مع رجعة تلقائية) ─────
  function wsUrl() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
  function connect() {
    if (S.ws && (S.ws.readyState === 0 || S.ws.readyState === 1)) return;
    const ws = new WebSocket(wsUrl()); S.ws = ws;
    ws.onopen = () => {
      S.retry = 0; S.lastMsg = Date.now(); $('#net').classList.add('hide');
      if (S.pendingCreate) { ws.send(JSON.stringify(S.pendingCreate)); S.pendingCreate = null; }
      else if (S.code) ws.send(JSON.stringify({ t: 'hello', code: S.code, token: S.token }));
      ping();
    };
    ws.onmessage = (e) => { S.lastMsg = Date.now(); let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
    ws.onclose = () => { if (S.ws !== ws) return; S.ws = null; if (S.wantClose) return; if (S.code) { $('#net').classList.remove('hide'); setTimeout(connect, Math.min(4000, 400 * 2 ** S.retry++)); } };
    ws.onerror = () => {};
  }
  function send(o) { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); }
  function ping() { send({ t: 'ping', c: Date.now() }); }
  setInterval(() => { if (S.ws && S.ws.readyState === 1) ping(); if (S.code && S.ws && S.ws.readyState === 1 && Date.now() - S.lastMsg > 9000) { try { S.ws.close(); } catch (e) {} } }, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.code && (!S.ws || S.ws.readyState > 1)) { S.retry = 0; connect(); } });
  window.addEventListener('online', () => { if (S.code) { S.retry = 0; connect(); } });

  function saveTok() { try { localStorage.setItem('akw-' + S.code, S.token); localStorage.setItem('akw-last', S.code); } catch (e) {} }
  function setUrl() { const u = new URL(location.href); u.searchParams.set('r', S.code); history.replaceState(null, '', u); }

  function onMsg(m) {
    switch (m.t) {
      case 'pong': { const rtt = Date.now() - m.c; if (rtt < S.rtt * 1.5 || rtt < 120) { S.rtt = Math.min(S.rtt, rtt) * 0.9 + rtt * 0.1; S.offset = m.s - (m.c + rtt / 2); } break; }
      case 'you': S.me = m.id; S.token = m.token; S.code = m.code; saveTok(); setUrl(); break;
      case 'room': S.room = m.room; S.offset = S.offset || m.room.now - Date.now(); route(); break;
      case 'guest': S.room = m.room; S.me = null; showJoinProfile(); break;
      case 'g': S.g = m.g; S.g._rx = performance.now(); onGame(); break;
      case 'photo': D.setPhoto(m.id, m.data); setTimeout(refreshAvatars, 60); break;
      case 'gphoto': S.gphoto = m.data; if (m.data) D.setPhoto('__group', m.data); setTimeout(refreshGroup, 60); break;
      case 'noroom': toast('ما لقينا هالقعدة… يمكن خلصت'); S.code = null; history.replaceState(null, '', location.pathname); show('cover'); break;
      case 'kicked': S.wantClose = true; try { S.ws.close(); } catch (e) {} localStorage.removeItem('akw-' + S.code); $('#kickedT').textContent = m.why === 'new' ? 'الريس فتح قعدة جديدة' : 'طلعت من القعدة'; $('#kickedP').textContent = m.why === 'new' ? 'بدّلوا الناس. فيك تفوت من جديد إذا بدك.' : 'الريس طلّعك من القعدة. فيك ترجع تفوت من جديد.'; show('kicked'); break;
      case 'toast': toast(m.text); break;
    }
  }
  $('#rejoin').onclick = () => { S.wantClose = false; S.token = null; S.me = null; connect(); if (S.ws && S.ws.readyState === 1) send({ t: 'hello', code: S.code }); };
  $('#toCover').onclick = () => { S.code = null; history.replaceState(null, '', location.pathname); show('cover'); };

  // ───── الغلاف ─────
 const tk = () => document.querySelector('.ticker').style.setProperty('--tw', document.querySelector('.ticker').clientWidth + 'px'); addEventListener('resize', tk); setTimeout(tk, 50);
  $('#ticker').textContent = GIDS.map((g) => GAMES[g].icon + ' ' + GAMES[g].name).join('   ·   ') + '   ·   كل لعبة اللاعبين بيطلّعوا بعض لحد ما يضل آخر واحد   ·   ';
  $('#goCreate').onclick = () => { SFX.unlock(); S.mode = 'create'; openProfile(true); };
  $('#goJoin').onclick = () => { SFX.unlock(); show('code'); setTimeout(() => $('#codeIn').focus(), 100); };
  $('#codeGo').onclick = () => { const c = $('#codeIn').value.trim().toUpperCase(); if (c.length !== 5) return toast('الكود 5 أحرف'); S.code = c; S.token = localStorage.getItem('akw-' + c); S.wantClose = false; if (S.ws && S.ws.readyState === 1) send({ t: 'hello', code: c, token: S.token }); else connect(); };
  $('#codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#codeGo').click(); });

  // غلاف متحرك: شخصيات عم تركض بالحارة وواحد بيطير
  (function coverAnim() {
    const cv = $('#coverCv'), c = cv.getContext('2d');
    const cols = ['#E2553D', '#2A7DE1', '#2BA36B', '#E8A317', '#8E5BD8', '#E5689A', '#1FA8A8'];
    const names = ['س', 'ر', 'م', 'ل', 'ع', 'ن', 'ه'];
    const runners = cols.map((col, i) => ({ x: Math.random(), sp: 0.04 + Math.random() * 0.05, lane: i % 3, col, n: names[i], fall: 0 }));
    function frame() {
      if (S.screen === 'cover') {
        const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        D.hara(c, w, h, { wall: true });
        const t = performance.now() / 1000, s = Math.max(10, Math.min(20, w / 40));
        runners.forEach((r, i) => {
          r.x += r.sp / 60; if (r.x > 1.1) { r.x = -0.1; r.fall = 0; }
          if (!r.fall && Math.random() < 0.0015) r.fall = t;
          const y = h * (0.78 + r.lane * 0.07);
          const k = r.fall ? Math.min(1, (t - r.fall) / 0.8) : 0;
          D.char(c, r.x * w, y + k * 40, s, { id: 'cv' + i, name: r.n, color: r.col }, { pose: r.fall ? 'fall' : 'run', flip: 1, seed: i, alpha: 0.85 - k * 0.6, t: t + i });
          if (r.fall && t - r.fall > 1.4) { r.fall = 0; r.x = -0.12; }
        });
      }
      requestAnimationFrame(frame);
    }
    frame();
  })();

  // ───── البروفايل والصور ─────
  const prof = { photo: '', gender: '' };
  function openProfile(create) {
    S.mode = create ? 'create' : 'join';
    $('#profTitle').textContent = create ? 'افتح قعدة جديدة' : 'عرّفنا عليك';
    $('#sessFields').classList.toggle('hide', !create);
    $('#nameIn').value = new URLSearchParams(location.search).get('n') || ''; prof.photo = ''; prof.gender = '';
    setAv(''); $$('#genderSeg button').forEach((b) => b.classList.remove('on'));
    $('#sessName').value = ''; $$('#sessType button').forEach((b) => b.classList.toggle('on', b.dataset.t === 'شلة')); $('#sessTypeCustom').classList.add('hide');
    $('#profErr').textContent = '';
    show('profile');
  }
  function showJoinProfile() { if (S.screen !== 'profile' || S.mode !== 'join') openProfile(false); }
  function setAv(data) { prof.photo = data; $('#avImg').src = data || ''; $('#avPick').classList.toggle('has', !!data); }
  $$('#genderSeg button').forEach((b) => (b.onclick = () => { prof.gender = b.dataset.g; $$('#genderSeg button').forEach((x) => x.classList.toggle('on', x === b)); }));
  function chips(sel, input) { $$(sel + ' button').forEach((b) => (b.onclick = () => { $$(sel + ' button').forEach((x) => x.classList.toggle('on', x === b)); $(input).classList.toggle('hide', b.dataset.t !== 'custom'); })); }
  chips('#sessType', '#sessTypeCustom'); chips('#mSessType', '#mSessTypeC');
  const chipVal = (sel, input) => { const b = $(sel + ' button.on'); if (!b) return 'شلة'; return b.dataset.t === 'custom' ? ($(input).value.trim() || 'قعدة') : b.dataset.t; };
  $('#avPick').onclick = () => pickPhoto('gallery', 'me');
  $('#pickGallery').onclick = () => pickPhoto('gallery', 'me');
  $('#pickSelfie').onclick = () => pickPhoto('selfie', 'me');
  $('#pickClear').onclick = () => setAv('');
  $('#profGo').onclick = () => {
    if (!prof.gender) { $('#profErr').textContent = 'اختار شب أو صبية'; return; }
    const player = { name: $('#nameIn').value.trim(), gender: prof.gender, photo: prof.photo };
    SFX.unlock();
    if (S.mode === 'edit') { send({ t: 'profile', name: player.name || undefined, gender: player.gender, photo: player.photo }); route(); return; }
    if (S.mode === 'create') {
      const session = { name: $('#sessName').value.trim() || 'قعدتنا', type: chipVal('#sessType', '#sessTypeCustom'), count: 6 };
      if (!$('#sessName').value.trim()) { $('#profErr').textContent = 'حط اسم للقعدة (بيطلع بصورة الستوري)'; return; }
      S.wantClose = false; S.code = null; S.token = null;
      const msg = { t: 'create', player, session };
      if (S.ws && S.ws.readyState === 1) send(msg); else { S.pendingCreate = msg; connect(); }
    } else send(Object.assign({ t: 'join' }, player));
  };
  $('#editMe').onclick = () => { const p = me(); openProfile(false); S.mode = 'edit'; $('#profTitle').textContent = 'عدّل اسمك وصورتك'; $('#nameIn').value = p.name; prof.gender = p.gender; $$('#genderSeg button').forEach((x) => x.classList.toggle('on', x.dataset.g === p.gender)); const im = D.photo(p.id); setAv(im ? im.src : ''); };

  // قصّ الصورة: تكبير، سحب لكل الأطراف، لفّ، وطول/عرض للصورة الجماعية
  let crop = null;
  function pickPhoto(src, target) {
    S.pickTarget = target;
    if (src === 'selfie') return openCam(target);
    const fi = $('#fileIn'); fi.value = ''; fi.onchange = () => { const f = fi.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => openCrop(im, target); im.src = rd.result; }; rd.readAsDataURL(f); }; fi.click();
  }
  let camStream = null, camFacing = 'user';
  async function openCam(target) {
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing } }); $('#camV').srcObject = camStream; modal('mCam', true); }
    catch (e) { toast('ما قدرنا نفتح الكاميرا'); }
  }
  function stopCam() { if (camStream) camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  $('#mCam').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) stopCam(); });
  $('#camFlip').onclick = async () => { stopCam(); camFacing = camFacing === 'user' ? 'environment' : 'user'; openCam(S.pickTarget); };
  $('#camShot').onclick = () => {
    const v = $('#camV'); const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext('2d');
    if (camFacing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(v, 0, 0); stopCam(); modal('mCam', false);
    const im = new Image(); im.onload = () => openCrop(im, S.pickTarget); im.src = c.toDataURL('image/jpeg', 0.92);
  };
  function openCrop(im, target) {
    const group = target === 'group';
    crop = { src: im, rot: 0, zoom: 1, ox: 0, oy: 0, group, ori: group ? 'wide' : 'sq' };
    $('#cropOri').classList.toggle('hide', !group);
    $('#cropT').textContent = group ? 'صورة الشلة' : 'قصّ صورتك';
    $('#cropZoom').value = 1;
    modal('mCrop', true); setCropBox(); drawCrop();
  }
  function setCropBox() { const b = $('#cropBox'); b.classList.toggle('wide', crop.ori === 'wide'); b.classList.toggle('tall', crop.ori === 'tall'); const cv = $('#cropCv'); requestAnimationFrame(() => { cv.width = b.clientWidth * 2; cv.height = b.clientHeight * 2; drawCrop(); }); }
  function rotated() { if (!crop.rot && !crop.flip) return crop.src; const c = document.createElement('canvas'), s = crop.src, r = crop.rot % 4; c.width = r % 2 ? s.naturalHeight : s.naturalWidth; c.height = r % 2 ? s.naturalWidth : s.naturalHeight; const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate((r * Math.PI) / 2); if (crop.flip) x.scale(-1, 1); x.drawImage(s, -s.naturalWidth / 2, -s.naturalHeight / 2); return c; }
  function cropGeom(W, H) { const im = crop.img || (crop.img = rotated()); const iw = im.width || im.naturalWidth, ih = im.height || im.naturalHeight; const base = Math.max(W / iw, H / ih); const sc = base * crop.zoom; const w = iw * sc, h = ih * sc; const mx = (w - W) / 2, my = (h - H) / 2; crop.ox = Math.max(-mx, Math.min(mx, crop.ox)); crop.oy = Math.max(-my, Math.min(my, crop.oy)); return { im, x: (W - w) / 2 + crop.ox, y: (H - h) / 2 + crop.oy, w, h }; }
  function drawCrop() { if (!crop) return; const cv = $('#cropCv'), x = cv.getContext('2d'); const W = cv.width, H = cv.height; if (!W) return; const g = cropGeom(W, H); x.clearRect(0, 0, W, H); x.drawImage(g.im, g.x, g.y, g.w, g.h); if (!crop.group) { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.rect(0, 0, W, H); x.arc(W / 2, H / 2, W / 2 - 2, 0, 7, true); x.fill('evenodd'); } }
  $('#cropZoom').oninput = (e) => { crop.zoom = +e.target.value; drawCrop(); };
  $('#cropFlip').onclick = () => { crop.flip = !crop.flip; crop.img = null; drawCrop(); };
  $('#cropRot').onclick = () => { crop.rot = (crop.rot + 1) % 4; crop.img = null; crop.ox = crop.oy = 0; drawCrop(); };
  $('#cropOri').onclick = () => { crop.ori = crop.ori === 'wide' ? 'tall' : 'wide'; crop.ox = crop.oy = 0; setCropBox(); };
  (() => { const b = $('#cropBox'); let st = null; const pts = new Map(); let pinch = null;
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st = [e.clientX, e.clientY, crop.ox, crop.oy]; if (pts.size === 2) { const [a, c] = [...pts.values()]; pinch = [Math.hypot(a[0] - c[0], a[1] - c[1]), crop.zoom]; } });
    b.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]); const k = $('#cropCv').width / b.clientWidth; if (pts.size === 2 && pinch) { const [a, c] = [...pts.values()]; crop.zoom = Math.max(1, Math.min(4, pinch[1] * Math.hypot(a[0] - c[0], a[1] - c[1]) / pinch[0])); $('#cropZoom').value = crop.zoom; } else if (st) { crop.ox = st[2] + (e.clientX - st[0]) * k; crop.oy = st[3] + (e.clientY - st[1]) * k; } drawCrop(); });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) st = null; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('wheel', (e) => { e.preventDefault(); crop.zoom = Math.max(1, Math.min(4, crop.zoom - e.deltaY * 0.002)); $('#cropZoom').value = crop.zoom; drawCrop(); }, { passive: false });
  })();
  $('#cropOk').onclick = () => {
    const W = crop.group ? (crop.ori === 'wide' ? 800 : 600) : 360, H = crop.group ? (crop.ori === 'wide' ? 600 : 800) : 360;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = cropGeom(W, H); c.getContext('2d').drawImage(g.im, g.x, g.y, g.w, g.h);
    const data = c.toDataURL('image/jpeg', crop.group ? 0.8 : 0.85);
    modal('mCrop', false);
    if (S.pickTarget === 'group') { send({ t: 'session', groupPhoto: data }); toast('انحفظت صورة الشلة'); }
    else setAv(data);
    crop = null;
  };

  // ───── التوجيه حسب حالة القعدة ─────
  function route() {
    const r = S.room; if (!r) return;
    if (!S.me) return showJoinProfile();
    if (S.screen === 'profile' && S.mode === 'edit') return;
    document.body.classList.toggle('host', isHost());
    updateTop(); meBtn();
    const show = (id) => { if (S.peek) { S.live = id; return; } window.__show(id); };
    if (r.phase === 'lobby') { renderLobby(); show('lobby'); }
    else if (r.phase === 'wheel') { renderWheel(); show('wheel'); }
    else if (r.phase === 'game') {
      const st = r.cur.stage;
      if (st === 'intro') { renderIntro(); show('intro'); }
      else if (st === 'count' || st === 'play') { show('play'); setupPlay(); }
      else if (st === 'over') { renderOver(); show('over'); }
    } else if (r.phase === 'reveal') { renderReveal(); show('reveal'); }
    else if (r.phase === 'final') { renderFinal(); show('final'); }
    $$('.host-only').forEach((e) => e.classList.toggle('hide', !isHost()));
  }
  window.__show = show;
  // زر حسابي: صورتي فوق، وبيفتح تعديل الاسم والصورة
  function meBtn() { const b = $('#btnMe'), p = me(); if (!p) { b.classList.remove('has'); b.style.backgroundImage = ''; return; } const im = D.photo(p.id); b.classList.toggle('has', !!im); b.style.backgroundImage = im ? `url(${im.src})` : ''; }
  $('#btnMe').onclick = () => { if (me()) $('#editMe').click(); else toast('عرّفنا عليك أول شي'); };
  function updateTop() {
    const r = S.room; let t = r.name;
    if (r.cur) t += ` · اللعبة ${r.cur.n}/${r.count}`; else if (r.phase === 'wheel' && r.wheel) t += ` · اللعبة ${r.wheel.n}/${r.count}`;
    $('#topInfo').textContent = t;
  }
  function refreshAvatars() { if (!S.room) return; meBtn(); if (S.screen === 'lobby') renderLobby(); if (S.screen === 'intro') renderIntro(true); if (S.screen === 'final') { S.finalKey = ''; renderFinal(); } }
  function refreshGroup() { const has = !!S.gphoto; $('#groupImg').src = S.gphoto || ''; $('#groupPh').classList.toggle('has', has); if (S.screen === 'final') drawStory(); }

  // ───── الانتظار ─────
  function renderLobby() {
    const r = S.room;
    $('#lobbyCode').textContent = r.code;
    $('#lobbyName').textContent = `${r.name} · ${r.type}`;
    const on = r.players.filter((p) => p.online).length;
    $('#lobbyCount').textContent = `${on} لاعب`;
    const link = location.origin + '/?r=' + r.code;
    if (S.qrFor !== link) { S.qrFor = link; try { const q = qrcode(0, 'M'); q.addData(link); q.make(); $('#qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { $('#qr').textContent = r.code; } }
    $('#lobbyPlayers').innerHTML = r.players.slice().sort((a, b) => a.joined - b.joined).map((p) => `<div class="pl ${p.online ? '' : 'off'}">${p.id === r.hostId ? '<span class="crown">👑</span>' : ''}<div class="head" style="background:${p.color}">${D.photo(p.id) ? `<img src="${D.photo(p.id).src}">` : D.initials(p.name)}</div><div class="nm">${esc(p.name)}${p.id === S.me ? ' (إنت)' : ''}</div></div>`).join('');
    $('#hostBox').classList.toggle('hide', !isHost()); $('#guestWait').classList.toggle('hide', isHost());
    const gsel = (id) => GIDS.map((g) => `<button data-g="${g}" class="${r.games.includes(g) ? 'on' : ''}"><i>${GAMES[g].icon}</i>${GAMES[g].name}</button>`).join('');
    $('#gSel').innerHTML = gsel(); $('#gSelG').innerHTML = gsel();
    $$('#revealSeg button').forEach((b) => b.classList.toggle('on', b.dataset.r === (r.revealMode || 'one')));
    $$('#gSel button').forEach((b) => (b.onclick = () => { const g = b.dataset.g; let sel = r.games.includes(g) ? r.games.filter((x) => x !== g) : r.games.concat(g); if (!sel.length) return toast('لازم تضل لعبة وحدة عالأقل'); send({ t: 'session', games: sel }); }));
    $('#startBtn').disabled = on < 2; $('#startHint').textContent = on < 2 ? 'لازم يكون في لاعبين عالأقل' : `${r.games.length} ${r.games.length > 10 || r.games.length < 3 ? 'لعبة' : 'ألعاب'}، والدولاب بيختار ترتيبها`;
    refreshGroup();
  }
  $('#gAll').onclick = () => send({ t: 'session', games: GIDS.slice() });
  $$('#revealSeg button').forEach((b) => (b.onclick = () => send({ t: 'session', reveal: b.dataset.r })));
  $('#startBtn').onclick = () => { SFX.unlock(); send({ t: 'start' }); };
  $('#copyLink').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + '/?r=' + S.room.code); toast('انتسخ الرابط'); } catch (e) { toast(location.origin + '/?r=' + S.room.code, 5000); } };
  $('#shareLink').onclick = () => { const url = location.origin + '/?r=' + S.room.code; if (navigator.share) navigator.share({ title: 'قعدة آخر واحد', text: `فوت عقعدتنا «${S.room.name}» — الكود ${S.room.code}`, url }).catch(() => {}); else $('#copyLink').click(); };
  $('#gpGallery').onclick = () => pickPhoto('gallery', 'group');
  $('#gpSelfie').onclick = () => pickPhoto('selfie', 'group');
  $('#groupPh').onclick = () => { if (isHost()) pickPhoto('gallery', 'group'); };
  function openSess() { const r = S.room; $('#mSessName').value = r.name; const known = ['شلة', 'رفقة', 'عيلة'].includes(r.type); $$('#mSessType button').forEach((b) => b.classList.toggle('on', known ? b.dataset.t === r.type : b.dataset.t === 'custom')); $('#mSessTypeC').classList.toggle('hide', known); $('#mSessTypeC').value = known ? '' : r.type; modal('mSess', true); }
  $('#editSess').onclick = openSess; $('#fEditSess').onclick = openSess; $('#fGroupPh').onclick = () => pickPhoto('gallery', 'group');
  $('#mSessOk').onclick = () => { send({ t: 'session', name: $('#mSessName').value.trim(), type: chipVal('#mSessType', '#mSessTypeC') }); modal('mSess', false); };

  // ───── الدولاب ─────
  const SL = ['#E2553D', '#E8A317', '#2A7DE1', '#2BA36B', '#8E5BD8', '#E5689A'];
  function wheelSvg(done, off) {
    off = off || [];
    let s = '';
    GIDS.forEach((g, i) => {
      const a0 = ((i * 30 - 90) * Math.PI) / 180, a1 = (((i + 1) * 30 - 90) * Math.PI) / 180, R = 100;
      const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R];
      const played = done.includes(g), gone = off.includes(g);
      s += `<path d="M0 0 L${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${R} ${R} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} Z" fill="${played || gone ? '#bdb3a4' : SL[i % SL.length]}" stroke="#1E1B18" stroke-width="2"/>`;
      const am = i * 30 + 15;
      s += `<g transform="rotate(${am}) translate(0 -70)"><text text-anchor="middle" dominant-baseline="central" font-size="${played || gone ? 16 : 22}" fill="#6e6153">${played ? '✔' : gone ? '✕' : GAMES[g].icon}</text></g>`;
    });
    return `<g id="wheelG">${s}</g><circle r="101" fill="none" stroke="#1E1B18" stroke-width="4"/>`;
  }
  function renderWheel() {
    const w = S.room.wheel; if (!w) return;
    $('#wheelTitle').textContent = `اللعبة ${w.n} من ${S.room.count}`;
    const key = w.startAt + ':' + w.gid; if (S.wheelKey === key) return; S.wheelKey = key;
    $('#wheelSvg').innerHTML = wheelSvg(w.done, w.off); $('#wheelRes').innerHTML = '';
    const final = 360 * w.turns - (w.idx * 30 + 15) + w.jitter * 20;
    const g = $('#wheelG'); let lastSlice = -1, shown = false;
    const anim = () => {
      if (S.wheelKey !== key) return;
      const t = sNow(), p = Math.max(0, Math.min(1, (t - w.startAt) / w.dur));
      const e = 1 - Math.pow(1 - p, 4);
      const ang = final * e;
      g.setAttribute('transform', `rotate(${ang.toFixed(2)})`);
      const sl = Math.floor((ang + 15) / 30); if (sl !== lastSlice && p > 0 && p < 1) { lastSlice = sl; SFX.tick(); }
      if (p >= 1 && !shown) { shown = true; SFX.reveal(); $('#wheelRes').innerHTML = `<span class="pop">${GAMES[w.gid].icon} ${GAMES[w.gid].name}</span>`; }
      if (p < 1 || !shown) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ───── تقديم اللعبة ─────
  function renderIntro(soft) {
    const r = S.room, cur = r.cur, G = GAMES[cur.gid];
    const key = cur.gid + ':' + cur.n;
    if (S.introKey !== key) {
      S.introKey = key; S.readySent = false;
      $('#introN').textContent = `اللعبة ${cur.n} من ${r.count}`;
      $('#introName').textContent = G.icon + ' ' + G.name; $('#introHow').textContent = G.how;
      DEMO.start(cur.gid, $('#demoCv'));
      const ex = $('#introExtra'); ex.innerHTML = '';
      const snd = document.createElement('button'); snd.className = 'btn sm'; snd.textContent = '🔊 اختبر الصوت (علّي الصوت)'; snd.onclick = () => SFX.test(); ex.appendChild(snd);
      if (cur.gid === 'blow') ex.appendChild(calibBox());
      if (cur.gid === 'tag' || cur.gid === 'island') { const n = document.createElement('p'); n.className = 'muted sm'; n.textContent = 'التحكم بالجويستيك تحت (وعاللابتوب بالأسهم).'; ex.appendChild(n); }
      if (cur.gid === 'dabke') { const n = document.createElement('p'); n.className = 'muted sm'; n.textContent = 'الدبكة بدها صوت عالي: الإيقاع بيطلع من موبايلك.'; ex.appendChild(n); }
    }
    const ready = new Set(r.ready);
    $('#readyBtn').textContent = ready.has(S.me) ? 'جاهز ✔ (استنى الباقي)' : 'جاهز!';
    $('#readyBtn').disabled = ready.has(S.me);
    $('#readyList').innerHTML = r.players.filter((p) => p.online).map((p) => { const im = D.photo(p.id); return `<span class="r ${ready.has(p.id) ? 'ok' : ''}"><i style="background-color:${p.color};${im ? `background-image:url(${im.src})` : ''}"></i>${esc(p.name)}</span>`; }).join('');
  }
  $('#readyBtn').onclick = () => { SFX.unlock(); send({ t: 'ready' }); };
  $('#beginBtn').onclick = () => send({ t: 'begin' });
  $('#skipBtn').onclick = () => confirmBox('نمرّر هاللعبة ونلفّ الدولاب من جديد؟', () => send({ t: 'skip' }));

  function calibBox() {
    const b = document.createElement('div'); b.className = 'calib';
    b.innerHTML = '<b>معايرة المايك 🎤</b><p class="sm" id="calT">كبسة وحدة: ثانية هدوء، وبعدين انفخ لحد ما يتعبّى الشريط.</p><div class="meter"><i id="calM"></i></div><div class="meter thin"><i id="calP"></i></div><div class="row center"><button class="btn sm" id="calGo">ابدأ المعايرة</button><button class="btn sm ghost" id="calTap">بلا مايك… بلعب بالكبس</button></div>';
    let live = false;
    const loop = () => { if (!document.body.contains(b) || !live) return; b.querySelector('#calM').style.width = Math.round(MIC.level() * 100) + '%'; requestAnimationFrame(loop); };
    b.querySelector('#calTap').onclick = () => { MIC.setBad(true); b.querySelector('#calT').textContent = 'تمام، رح تلعب بالكبس السريع بدل النفخ.'; };
    b.querySelector('#calGo').onclick = async () => {
      SFX.unlock(); const T = b.querySelector('#calT'), go = b.querySelector('#calGo'), M = b.querySelector('#calM'), Pp = b.querySelector('#calP'); go.disabled = true; live = false;
      if (!(await MIC.start())) { T.textContent = 'ما في إذن للمايك. اسمح بالمايك من إعدادات المتصفح وجرّب، أو العب بالكبس السريع.'; go.disabled = false; return; }
      const good = await MIC.calibrate((st) => { T.textContent = st === 'quiet' ? '1) اسكت ثانية… 🤫' : '2) هلّق انفخ عالمايك (تحت الموبايل) لحد ما يتعبّى الشريط التاني! 🌬️'; }, (prog, lv) => { Pp.style.width = Math.round(prog * 100) + '%'; M.style.width = Math.round(lv * 100) + '%'; });
      T.textContent = good ? 'تمام! انفخ وشوف الشريط يتعبّى. ✔' : 'المايك ما لقط النفخ… قرّب تمك من أسفل الموبايل وأعد، أو العب بالكبس.';
      go.textContent = 'أعد المعايرة'; go.disabled = false; Pp.style.width = good ? '100%' : '0%'; live = true; loop();
    };
    return b;
  }

  // ───── اللعب ─────
  const cv = $('#cv'), cx = cv.getContext('2d');
  let curUI = null, uiKey = '';
  GUI.init({ get me() { return DEMO.drawing ? '__nobody' : S.me; }, get demo() { return DEMO.drawing; }, send: (m) => { if (!DEMO.drawing) send(Object.assign({ t: 'g' }, m)); }, P: (id) => DEMO.P(id) || P(id), sNow: () => (DEMO.drawing ? Date.now() : sNow()) });
  function setupPlay() {
    DEMO.stop();
    const cur = S.room.cur;
    const key = cur.gid + ':' + cur.n + ':' + cur.startAt;
    if (uiKey !== key) {
      if (curUI && curUI.cleanup) curUI.cleanup();
      uiKey = key; GUI.reset(); S.g = null; S.lastFlash = 0;
      curUI = GUI.UI[cur.gid];
      const ctl = $('#controls'); ctl.innerHTML = '';
      S.ctlMode = '';
      $('#playMsg').textContent = GAMES[cur.gid].icon + ' ' + GAMES[cur.gid].name;
      $('#stairs').innerHTML = '';
      if (cur.gid === 'blow' && !MIC.ok) MIC.start();
    }
    $('#countOv').classList.toggle('hide', cur.stage !== 'count');
  }
  function onGame() {
    const g = S.g; if (!g || !S.room || !S.room.cur) return;
    // إقصاء جديد
    if (g.flash && g.flash.at !== S.lastFlash) {
      S.lastFlash = g.flash.at;
      if (sNow() - g.flash.at < 3000) showOut(g.flash);
    }
    $('#playMsg').textContent = g.msg || '';
    const outs = (g.done ? [] : (g.out || []).flat()).filter((id) => !g.alive.includes(id));
    const st = $('#stairs'); const k = g.alive.join(',') + '|' + outs.join(',');
    if (st.dataset.k !== k) {
      st.dataset.k = k;
      const chip = (id, out) => { const p = P(id) || {}; const im = D.photo(id); return `<span class="nc ${out ? 'out' : ''} ${id === S.me ? 'me' : ''}"><i style="background-color:${p.color};${im ? `background-image:url(${im.src})` : ''}">${im ? '' : D.initials(p.name)}</i>${esc(p.name)}</span>`; };
      st.innerHTML = `<span class="lbl2">بالساحة ${g.alive.length}</span>` + g.alive.map((id) => chip(id, false)).join('') + (outs.length ? `<span class="lbl2 sep">برّا</span>` + outs.slice().reverse().map((id) => chip(id, true)).join('') : '');
    }
    // أزرار التحكم
    const inGame = S.room.cur.ids.includes(S.me);
    const alive = g.alive.includes(S.me);
    const mode = !inGame ? 'watch' : alive && !g.done ? 'play' : 'out';
    if (mode !== S.ctlMode) {
      S.ctlMode = mode; const ctl = $('#controls');
      if (curUI && curUI.cleanup && mode !== 'play') curUI.cleanup();
      if (mode === 'play') curUI.controls(ctl, g);
      else ctl.innerHTML = `<div class="outbanner">${mode === 'watch' ? 'فتت بنص اللعبة… بتلعب من اللعبة الجاية 👀' : g.done ? 'خلصت اللعبة!' : 'طلعت! 🪜 قعدت عالدرج… استنى اللعبة الجاية'}</div>`;
    }
  }
  function showOut(f) {
    const mine = f.ids.includes(S.me);
    SFX.out(); if (mine) { try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch (e) {} }
    const ov = $('#outOv'); ov.classList.remove('hide');
    ov.innerHTML = `${mine ? '<b>طلعت</b>' : ''}<div class="hs">${f.ids.slice(0, 6).map((id) => avatarHTML(id, '')).join('')}</div><small>${esc(f.ids.length === 1 ? (P(f.ids[0]) || {}).name + ' — ' + f.text : f.ids.length + ' طلعوا — ' + f.text)}</small>`;
    ov.style.animation = 'none'; void ov.offsetWidth; ov.style.animation = '';
    clearTimeout(S.outT); S.outT = setTimeout(() => ov.classList.add('hide'), 1700);
  }
  let lastBeep = -1;
  function loop() {
    if (S.screen === 'play' && S.room && S.room.cur) {
      const st = $('.stage'); const dpr = Math.min(2, devicePixelRatio || 1); const w = st.clientWidth, h = st.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cur = S.room.cur;
      if (cur.stage === 'count') {
        const left = Math.ceil((cur.startAt - sNow()) / 1000);
        $('#countOv').textContent = left > 0 ? left : 'يلا!';
        if (left !== lastBeep && left >= 0 && left <= 3) { lastBeep = left; SFX.beep(left); }
        D.hara(cx, w, h, { wall: true });
        const ps = cur.ids.map(P).filter(Boolean); const s = Math.max(8, Math.min(24, w / (ps.length * 2.8)));
        ps.forEach((p, i) => D.char(cx, w / 2 + (i - (ps.length - 1) / 2) * s * 2.6, h * 0.82, s, p, { pose: 'idle', me: p.id === S.me, seed: i }));
      } else if (S.g && curUI) {
        try { if (curUI.tick && S.ctlMode === 'play') curUI.tick(S.g); if (curUI.update && S.ctlMode === 'play') curUI.update(S.g); curUI.draw(cx, w, h, S.g); } catch (e) { console.error(e); }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ───── نتيجة اللعبة ─────
  function rankRow(r, extra) { const p = P(r.id) || { name: '؟' }; return `<div class="rk ${r.id === S.me ? 'me' : ''}"><span class="ps">${r.pos}</span>${avatarHTML(r.id)}<span class="nm">${esc(p.name)}${extra ? `<small>${extra}</small>` : ''}</span><span class="pt">+${r.pts}</span></div>`; }
  function renderOver() {
    const cur = S.room.cur; const G = GAMES[cur.gid];
    $('#overTitle').textContent = `${G.icon} ${G.name} — خلصت`;
    const key = cur.n + cur.gid;
    if (S.overAnim !== key) $('#overList').innerHTML = (cur.rank || []).map((r) => rankRow(r, r.pos === 1 ? title(1, (P(r.id) || {}).gender, r.id) + ' 🏆' : '')).join('');
    // كشف من الأخير للأول
    if (S.overAnim !== key) {
      S.overAnim = key; clearTimeout(S.overT);
      const rows = [...$('#overList').children]; rows.forEach((el) => el.classList.add('rk-hide'));
      const groups = []; (cur.rank || []).forEach((r, i) => { const g = groups.find((x) => x.pos === r.pos); g ? g.idx.push(i) : groups.push({ pos: r.pos, idx: [i] }); });
      let k = groups.length - 1; const step = () => { if (k < 0 || S.overAnim !== key) return; const g = groups[k--]; g.idx.forEach((i) => rows[i] && rows[i].classList.remove('rk-hide')); if (g.pos === 1) { FX.burst(); SFX.win(); } else SFX.pop(); S.overT = setTimeout(step, g.pos <= 3 ? 1100 : 450); };
      S.overT = setTimeout(step, 500);
    } else { S.overDone = true; }
    $('#overHint').textContent = isHost() ? 'الدولاب بيلفّ لحالو بعد شوي إذا ما كبست' : 'استنى الريس… أو الدولاب بيلفّ لحالو';
    if (S.overKey !== key) { S.overKey = key; SFX.reveal(); }
  }
  $('#nextBtn').onclick = () => send({ t: 'next' });
  $('#replayBtn').onclick = () => confirmBox('نعيد اللعبة؟ نتيجتها رح تنلغى.', () => send({ t: 'replay' }));

  // ───── حفلة الكشف ─────
  const FX = (() => { const cv = $('#fxCv'), c = cv.getContext('2d'); let parts = [], on = false; function burst() { const w = innerWidth, h = innerHeight; for (let k = 0; k < 5; k++) { const x = w * (0.2 + Math.random() * 0.6), y = h * (0.15 + Math.random() * 0.35); const col = ['#E2553D', '#E8A317', '#2A7DE1', '#2BA36B', '#E5689A'][k % 5]; for (let i = 0; i < 46; i++) { const a = Math.random() * 7, v = 2 + Math.random() * 5; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col, d: k * 12 }); } } if (!on) { on = true; tick(); } } function tick() { cv.width = innerWidth; cv.height = innerHeight; c.clearRect(0, 0, cv.width, cv.height); parts.forEach((p) => { if (p.d > 0) { p.d--; return; } p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.vx *= 0.99; p.life -= 0.012; c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.col; c.fillRect(p.x, p.y, 5, 5); }); parts = parts.filter((p) => p.life > 0); if (parts.length) requestAnimationFrame(tick); else { on = false; c.clearRect(0, 0, cv.width, cv.height); } } return { burst }; })();
  function renderReveal() {
    const rv = S.room.reveal; if (!rv) return;
    if (S.revealStep === rv.step) return; S.revealStep = rv.step;
    const steps = rv.steps || rv.positions.map((p) => [p]);
    const shown = steps.slice(0, rv.step).flat();
    if (!shown.length) { $('#rvStage').innerHTML = '<div class="door"><div class="pos">مين…؟</div><div class="nm">جاهزين؟</div></div>'; $('#rvList').innerHTML = ''; return; }
    const lastStep = steps[rv.step - 1]; const cur = Math.min(...lastStep);
    shown.splice(shown.indexOf(cur), 1); shown.push(cur);
    const ppl = rv.final.filter((f) => f.pos === cur);
    const nm = ppl.map((f) => (P(f.id) || {}).name).join(' و');
    $('#rvStage').innerHTML = `<div class="door ${cur === 1 ? 'first' : ''}"><div class="pos">${cur === 1 ? 'المركز الأول' : 'المركز ' + cur}</div><div class="hs">${ppl.map((f) => avatarHTML(f.id, '')).join('')}</div><div class="nm">${esc(nm)}</div><div class="tt">${title(cur, ppl.length === 1 ? (P(ppl[0].id) || {}).gender : 'm', ppl[0].id)}</div><div class="pos" style="margin-top:6px">${ppl[0].pts} نقطة</div></div>`;
    $('#rvList').innerHTML = shown.slice(0, -1).sort((a, b) => a - b).map((pos) => rv.final.filter((f) => f.pos === pos).map((f) => rankRow({ id: f.id, pos: f.pos, pts: f.pts })).join('')).join('');
    if (cur === 1) { SFX.win(); FX.burst(); setTimeout(FX.burst, 900); } else if (cur <= 3) { SFX.whistle(); } else SFX.reveal();
  }
  $('#skipReveal').onclick = () => send({ t: 'skipReveal' });

  // ───── النتيجة النهائية ─────
  let storyL = 'podium', storyT = 'light';
  function renderFinal() {
    const r = S.room, rv = r.reveal; if (!rv) return;
    const key = r.seq + ':' + r.players.map((p) => p.photoVer + p.name).join(',') + (r.name || '');
    if (S.finalKey === key) return; S.finalKey = key;
    $('#finalList').innerHTML = rv.final.map((f) => rankRow(f, title(f.pos, (P(f.id) || {}).gender, f.id))).join('');
    $('#finalGames').innerHTML = r.played.map((g, i) => `<div class="gtab"><b>${i + 1}. ${GAMES[g.gid].icon} ${GAMES[g.gid].name}</b><div class="gl">${g.rank.map((x) => `<span>${x.pos}. ${esc((P(x.id) || {}).name)} +${x.pts}</span>`).join('')}</div></div>`).join('');
    drawStory();
  }
  $$('#storyLayout button').forEach((b) => (b.onclick = () => { storyL = b.dataset.l; drawStory(); }));
  $$('#storyTheme button').forEach((b) => (b.onclick = () => { storyT = b.dataset.m; drawStory(); }));
  async function drawStory() {
    const r = S.room; if (!r || !r.reveal) return; const p = me(); if (!p) return;
    $$('#storyLayout button').forEach((b) => b.classList.toggle('on', b.dataset.l === storyL));
    $$('#storyTheme button').forEach((b) => b.classList.toggle('on', b.dataset.m === storyT));
    try { await document.fonts.load('800 80px Changa'); await document.fonts.load('80px Lalezar'); await document.fonts.load('600 40px Changa'); await document.fonts.load('400 40px Changa'); } catch (e) {}
    for (const im of [BRAND.chairImg(), BRAND.iconImg()]) if (!im.complete) await new Promise((ok) => { im.onload = ok; im.onerror = ok; setTimeout(ok, 1500); });
    const f = r.reveal.final.find((x) => x.id === p.id) || { pos: r.players.length, pts: 0, f: 0 };
    STORY.render($('#storyCv'), { name: p.name, color: p.color, photo: D.photo(p.id), group: D.photo('__group'), sess: `${r.name} · ${r.type}`, sessName: r.name, sessType: r.type, crew: r.players.map((q) => ({ id: q.id, name: q.name, color: q.color, photo: D.photo(q.id) })), rank: r.reveal.final.map((x) => { const q = r.players.find((y) => y.id === x.id); return q ? { id: q.id, name: q.name, color: q.color, photo: D.photo(q.id), pos: x.pos, pts: x.pts, me: q.id === p.id } : null; }).filter(Boolean), pos: f.pos, pts: f.pts, f: f.f, title: title(f.pos, p.gender, p.id), games: r.played.length }, storyL, storyT);
  }
  $('#dlStory').onclick = () => { $('#storyCv').toBlob(async (b) => { const file = new File([b], 'qa3da-akher-wahed.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'قعدة آخر واحد' }); return; } catch (e) {} } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qa3da-akher-wahed.png'; a.click(); }, 'image/png'); };
  $('#shareFriends').onclick = async () => { const data = { title: 'قعدة', text: 'جرّبوا «قعدة آخر واحد» مع شلتكن. الرابط بالبايو 👇', url: IG }; if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(IG); toast('انتسخ رابط الصفحة'); } catch (e) { window.open(IG, '_blank', 'noopener'); } };
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; S.canInstall = true; });
  function openInstall() {
    const ua = navigator.userAgent; const k = /Instagram|FBAN|FBAV|Snapchat|TikTok/i.test(ua) ? 'inapp' : /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document) ? 'ios' : /android/i.test(ua) ? 'and' : 'pc';
    const L = [{ k: 'inapp', t: 'فاتحها من جوّا إنستغرام؟', d: 'اكبس ⋯ فوق واختار «فتح بالمتصفح»، ومن هنيك نزّلها.' }, { k: 'ios', t: 'آيفون (Safari)', d: 'اكبس زر المشاركة ⬆ تحت، وبعدين «إضافة إلى الشاشة الرئيسية» ← «إضافة».' }, { k: 'and', t: 'أندرويد (Chrome)', d: 'اكبس ⋮ فوق، وبعدين «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».' }, { k: 'pc', t: 'اللابتوب (Chrome أو Edge)', d: 'اكبس أيقونة التثبيت بآخر شريط العنوان، أو من القائمة ⋮ اختار «تثبيت».' }].filter((o) => o.k !== 'inapp' || k === 'inapp');
    $('#osl').innerHTML = L.sort((a, b) => (b.k === k) - (a.k === k)).map((o) => `<div class="${o.k === k ? 'me' : ''}"><b>${o.t}</b>${o.d}</div>`).join('');
    $('#instNative').classList.toggle('hide', !deferredInstall);
    modal('mInstall', true);
  }
  $('#instNative').onclick = async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; modal('mInstall', false); } };
  $('#installBtn').onclick = openInstall; $('#coverInstall').onclick = openInstall;
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) { $('#coverInstall').classList.add('hide'); $('#installBox').classList.add('hide'); }

  // ───── زر البيت: قعدة جديدة بـ3 خيارات ─────
  $('#btnHome').onclick = () => {
    const r = S.room; const b = $('#homeBody');
    if (!r || !S.me) { NAV.back = []; NAV.fwd = []; show('cover'); return; }
    let h = '<div class="home-opts">';
    if (isHost()) h += `<button class="btn" data-a="same">🔁 بنفس الناس<small>منرجع عالانتظار بنفس اللاعبين، والنقاط بتتصفّر</small></button><button class="btn" data-a="new">✨ بناس جدد<small>كل اللاعبين بيطلعوا إلا إنت، وبيفوت غيرهن بنفس الكود</small></button><button class="btn" data-a="zero">🧹 من الصفر<small>اسم جديد ونوع جديد وصورة شلة جديدة، وناس جدد</small></button>`;
    else h += '<p class="muted sm">القعدة الجديدة بإيد الريس. فيك تطلع وتفتح قعدة إلك.</p><button class="btn" data-a="mine">✨ افتح قعدة جديدة إلي</button>';
    h += '<button class="btn ghost" data-a="leave">🚪 اطلع من القعدة</button></div>';
    b.innerHTML = h; $('#mHome h3').textContent = 'قعدة جديدة'; modal('mHome', true);
    b.querySelectorAll('[data-a]').forEach((x) => (x.onclick = () => { modal('mHome', false); homeAct(x.dataset.a); }));
  };
  function leaveRoom() { S.wantClose = true; try { S.ws.close(); } catch (e) {} localStorage.removeItem('akw-' + S.code); S.code = null; S.room = null; S.me = null; S.peek = false; NAV.back = []; NAV.fwd = []; history.replaceState(null, '', location.pathname); }
  function homeAct(a) {
    if (a === 'same') confirmBox('قعدة جديدة بنفس الناس؟ النقاط بتتصفّر.', () => send({ t: 'newSession', same: true }));
    else if (a === 'new') confirmBox('قعدة جديدة بناس جدد؟ كل اللاعبين بيطلعوا إلا إنت.', () => send({ t: 'newSession', same: false }));
    else if (a === 'zero') confirmBox('نبلّش من الصفر؟ الكل بيطلع، واسم القعدة وصورتها بيتصفّروا.', () => { send({ t: 'newSession', same: false, zero: true }); setTimeout(openSess, 600); });
    else if (a === 'mine') confirmBox('تطلع من هالقعدة وتفتح وحدة جديدة؟', () => { leaveRoom(); openProfile(true); });
    else if (a === 'leave') confirmBox('أكيد بدك تطلع من القعدة؟', () => { leaveRoom(); show('cover'); });
  }
  // ───── زر الريس واللاعبين ─────
  $('#btnPlayers').onclick = () => {
    const r = S.room; const b = $('#homeBody');
    if (!r || !S.me) return;
    const host = isHost(); const cur = r.cur;
    let h = '';
    if (host) {
      h += '<div class="menu">';
      if (cur && cur.stage === 'play') h += '<button class="btn" data-a="endGame">⏹ سكّر هاللعبة هلّق (كل واحد لوين وصل)</button>';
      if (cur && cur.stage !== 'intro') h += '<button class="btn" data-a="replay">↺ أعد هاللعبة (النتيجة بتنلغى)</button>';
      if (cur || r.phase === 'wheel') h += '<button class="btn" data-a="skip">⏭ مرّر هاللعبة (بتنشال من القائمة)</button>';
      if (r.phase !== 'lobby' && r.phase !== 'final' && r.phase !== 'reveal') h += '<button class="btn" data-a="finish">🏁 خلّصنا… رجّينا النتيجة</button>';
      h += '</div>';
    }
    h += `<h3 style="margin-top:12px">اللاعبين (${r.players.length})</h3>`;
    h += r.players.slice().sort((a, b) => a.joined - b.joined).map((p) => `<div class="pman ${p.id === S.me ? 'me' : ''}">${avatarHTML(p.id)}<div class="nm">${esc(p.name)}${p.id === S.me ? ' (إنت)' : ''}${p.id === r.hostId ? ' 👑' : ''}<small>${p.online ? 'متصل' : 'مو متصل'} · ${p.total} نقطة</small></div>${host && p.id !== S.me ? `<button class="btn sm" data-ren="${p.id}">اسم</button><button class="btn sm" data-host="${p.id}">ريس</button><button class="btn sm pri" data-kick="${p.id}">${p.gender === 'f' ? 'طلّعها' : 'طلّعو'}</button>` : ''}</div>`).join('');
    if (!host) { const hp = P(r.hostId); if (hp && !hp.online) h += '<button class="btn wide" data-a="claim">الريس مو متصل… صير إنت الريس</button>'; }
    b.innerHTML = h; $('#mHome h3').textContent = host ? 'أدوات الريس' : 'اللاعبين'; modal('mHome', true);
    b.querySelectorAll('[data-a]').forEach((x) => (x.onclick = () => {
      const a = x.dataset.a; modal('mHome', false);
      if (a === 'endGame') confirmBox('نسكّر اللعبة هلّق؟ اللي لسّا بالساحة بيتقاسموا الصدارة.', () => send({ t: 'endGame' }));
      else if (a === 'replay') confirmBox('نعيد اللعبة؟ نتيجتها بتنلغى.', () => send({ t: 'replay' }));
      else if (a === 'skip') confirmBox('نمرّر هاللعبة ونلفّ الدولاب؟', () => send({ t: 'skip' }));
      else if (a === 'finish') confirmBox('نخلّص ونروح عحفلة الكشف؟', () => send({ t: 'finish' }));
      else if (a === 'claim') send({ t: 'claimHost' });
    }));
    b.querySelectorAll('[data-kick]').forEach((x) => (x.onclick = () => { const p = P(x.dataset.kick); confirmBox(`نطلّع ${p.name} من القعدة؟`, () => { send({ t: 'kick', id: p.id }); modal('mHome', false); }); }));
    b.querySelectorAll('[data-host]').forEach((x) => (x.onclick = () => { const p = P(x.dataset.host); confirmBox(`نسلّم الريسة لـ${p.name}؟`, () => { send({ t: 'transfer', id: p.id }); modal('mHome', false); }); }));
    b.querySelectorAll('[data-ren]').forEach((x) => (x.onclick = () => { const p = P(x.dataset.ren); const n = prompt('الاسم الجديد', p.name); if (n) send({ t: 'rename', id: p.id, name: n }); modal('mHome', false); }));
  };
  $('#fSame').onclick = () => homeAct('same'); $('#fNew').onclick = () => homeAct('new');

  // ───── التعليمات ─────
  $('#btnHelp').onclick = () => {
    $('#helpBody').innerHTML = `<div class="help"><h3>كيف منلعب «قعدة آخر واحد»؟</h3>
<p>كل واحد من موبايله. الريس بيفتح القعدة وبيختار الألعاب اللي بدهن (وبيشيل اللي ما بدو ياها)، والدولاب بيختار ترتيبها. بكل لعبة اللاعبين بيطلّعوا بعض لحد ما يضل آخر واحد، وبكل لعبة جديدة بيرجع الكل يلعب.</p>
<h4>النقاط بكل لعبة</h4><p>آخر واحد بيضل 5 · اللي قبله 4 · بعدو 3 · بعدو 2 · بعدو 1 · والباقي 0. واللي بيطلعوا سوا بنفس اللحظة بياخدوا نفس النقاط. وبالآخر حفلة كشف من الأخير للأول.</p>
<h4>الألعاب الـ12</h4>${GIDS.map((g) => `<div class="g"><b>${GAMES[g].icon} ${GAMES[g].name}</b><p>${GAMES[g].how}</p></div>`).join('')}
<h4>للريس</h4><p>من زر ⌂ فوق: طلّع أي لاعب بأي وقت، سلّم الريسة، سكّر اللعبة، أعدها، مرّرها، أو افتح قعدة جديدة بنفس الناس أو بناس جدد. وإذا الريس انقطع، بعد شوي بيصير في ريس جديد لحالو.</p>
<h4>إذا انقطع النت</h4><p>افتح نفس الرابط وبترجع عالقعدة لحالك بنفس اسمك ونقاطك.</p>
<p class="muted sm" style="margin-top:12px">مرجع اللعبة: ألعاب الإقصاء الشعبية بالحارات والمدارس، مصمّمة للموبايل.<br>إعداد م. إياد حلوبي</p></div>`;
    modal('mHelp', true);
  };

  // ───── البداية ─────
  const qp = new URLSearchParams(location.search).get('r');
  if (qp) { S.code = qp.toUpperCase(); S.token = localStorage.getItem('akw-' + S.code); connect(); show('cover'); }
  else show('cover');
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(theme));
})();
