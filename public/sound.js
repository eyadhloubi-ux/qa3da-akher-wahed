// أصوات مركّبة بالـWebAudio — بلا ملفات
const SFX = (() => {
  let ac = null, master = null, muted = false;
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, d, type = 'square', vol = 0.18, when = 0, slide = 0) {
    const a = ctx(); if (!a || muted) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol = 0.3, when = 0, freq = 1200, q = 0.8, at) {
    const a = ctx(); if (!a || muted) return;
    const t = at !== undefined ? at : a.currentTime + when;
    const n = a.createBufferSource(), b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    n.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + d);
  }
  function drumAt(at, kind, vol = 0.5) { // دربكة: dum (عميقة) / tak (حادة)
    const a = ctx(); if (!a || muted) return;
    if (kind === 'dum') {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(55, at + 0.25);
      g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.35);
    } else noise(0.09, vol * 0.7, 0, 3200, 1.4, at);
  }
  // موسيقى الكراسي: لحن حجاز مع دربكة مقسوم، بتشتغل طول ما في حدا عم يطلبها
  let mus = null;
  function music(on) {
    const a = ctx(); if (!a) return;
    if (on) {
      if (!mus) {
        const g = a.createGain(); g.gain.value = 0.0001; g.connect(master); g.gain.exponentialRampToValueAtTime(0.9, a.currentTime + 0.15);
        mus = { g, next: a.currentTime + 0.05, i: 0, keep: performance.now() };
        const NOTES = [293.7, 311.1, 370, 392, 440, 466.2, 523.3, 587.3];
        const MEL = [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 3, 2, 1, 0, 2, 4, 6, 7, 6, 5, 4, 3, 4, 5, 4, 3, 2, 1, 0];
        const DRUM = ['dum', 0, 'tak', 0, 0, 'tak', 'dum', 0, 'tak', 0, 0, 'tak', 'dum', 0, 'tak', 'tak'];
        const step = 0.15;
        mus.timer = setInterval(() => {
          if (!mus) return; if (performance.now() - mus.keep > 450) return music(false);
          while (mus.next < a.currentTime + 0.25) {
            const t = mus.next, i = mus.i++;
            const f = NOTES[MEL[i % MEL.length]];
            const o = a.createOscillator(), og = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
            og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.16, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.95);
            o.connect(og); og.connect(mus.g); o.start(t); o.stop(t + step);
            const d = DRUM[i % DRUM.length]; if (d) drumAt(t, d, 0.42);
            mus.next += step;
          }
        }, 40);
      }
      mus.keep = performance.now();
    } else if (mus) {
      const m = mus; mus = null; clearInterval(m.timer);
      try { m.g.gain.cancelScheduledValues(a.currentTime); m.g.gain.setValueAtTime(m.g.gain.value || 0.5, a.currentTime); m.g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.06); setTimeout(() => m.g.disconnect(), 300); } catch (e) {}
    }
  }
  function duck(delay, len) { const a = ctx(); if (!a || !mus) return; const g = mus.g.gain, t = a.currentTime + delay; g.setValueAtTime(0.9, t); g.exponentialRampToValueAtTime(0.06, t + 0.08); g.setValueAtTime(0.06, t + len); g.exponentialRampToValueAtTime(0.9, t + len + 0.1); }
  return {
    music, duck,
    unlock() { ctx(); },
    get ac() { return ctx(); },
    setMuted(v) { muted = v; },
    tick() { tone(1400, 0.03, 'square', 0.07); },
    call(up) { if (up) { tone(520, 0.12, 'triangle', 0.2, 0, 300); tone(880, 0.18, 'triangle', 0.2, 0.12, 200); } else { tone(700, 0.12, 'triangle', 0.2, 0, -250); tone(330, 0.2, 'triangle', 0.2, 0.12, -120); } },
    click() { tone(660, 0.05, 'triangle', 0.12); },
    pop() { tone(500, 0.08, 'sine', 0.2, 0, 400); },
    beep(n) { tone(n ? 660 : 990, n ? 0.15 : 0.35, 'square', 0.14); },
    out() { tone(520, 0.3, 'sawtooth', 0.13, 0, -380); noise(0.25, 0.18, 0.18, 500); },
    hit() { noise(0.14, 0.35, 0, 900, 0.7); tone(140, 0.12, 'sine', 0.25); },
    whoosh() { noise(0.3, 0.2, 0, 1800, 0.5); },
    boom() { noise(1.1, 0.7, 0, 160, 0.4); tone(70, 0.9, 'sine', 0.4, 0, -40); },
    fuse() { noise(0.12, 0.05, 0, 5000, 2); },
    bang() { noise(0.25, 0.6, 0, 1800, 0.6); tone(90, 0.2, 'sine', 0.3); },
    whistle() { tone(1800, 0.35, 'sine', 0.14, 0, 300); tone(2100, 0.25, 'sine', 0.1, 0.36, -200); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.12)); tone(1046, 0.6, 'triangle', 0.14, 0.5); },
    reveal() { tone(392, 0.12, 'triangle', 0.14); tone(587, 0.3, 'triangle', 0.14, 0.12); },
    drumAt, noise, tone,
    test() { [440, 554, 659].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, i * 0.15)); },
  };
})();
