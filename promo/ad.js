// BeatsRPG promo: a ~30 second ad cut together from real fights played by the
// game's own autoplay. The fights, music and sound effects are the game's code;
// this file only directs them (which fight, when to cut) and draws the captions.
//
// Live:   open promo/ad.html and press Play.
// Render: node promo/render.mjs drives this page frame by frame (see that file).
(function () {
  const BR = window.BR;
  const C = {
    ink: '#130f22', deep: '#0b0816', parch: '#f2e6c9', dim: '#9a8fb5', gold: '#f7b538',
    rune: '#5ce1e6', hex: '#c792ff', ember: '#ff6b4a', moss: '#7bd389', line: '#3b3160', ink3: '#2a2147',
  };
  const FD = '"Jersey 10", "Pixelify Sans", monospace';
  const FU = '"Pixelify Sans", monospace';
  const FK = 'Silkscreen, monospace';
  const RENDER = /[?&]render\b/.test(location.search);

  // Seeded randomness so the fights (patterns, letters, words, particles) are the same every run.
  let seed = 20261009;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const canvas = document.getElementById('ad');
  const out = canvas.getContext('2d');
  const game = document.createElement('canvas');
  game.width = 1920; game.height = 1080;
  const gx = game.getContext('2d');

  const audio = new BR.AudioEngine();
  let origin = 0; // context time of the ad's t = 0
  let adBus = null;

  // ---- timeline (seconds) ---------------------------------------------------
  const barOf = (id) => { const e = BR.ENEMIES.find((x) => x.id === id); return e.beats * 60 / e.bpm; };
  const T = {};
  T.drum = barOf('slime');               // cold open = the slime's count-in bar
  T.rune = T.drum + barOf('slime');      // 1 bar of War Drum
  T.spell = T.rune + 2 * barOf('goblin');
  T.twin = T.spell + 3 * barOf('skeleton');
  T.tag = T.twin + 2 * barOf('dragon');
  T.kill = T.tag + 3.6;
  T.endMax = 33;

  // Scenes: what is on screen and what the caption says.
  const SCENES = [
    { at: T.drum, gear: 'War Drum', role: 'Tank', big: 'ONE KEY.', color: C.gold, keys: [' '] },
    { at: T.rune, gear: 'Rune Blade', role: 'Duelist', big: 'LETTERS.', color: C.rune, keys: ['a', 's', 'd', 'f', 'j', 'k', 'l'] },
    { at: T.spell, gear: 'Spellbook', role: 'Caster', big: 'WHOLE WORDS.', color: C.hex, keys: null },
    { at: T.twin, gear: 'Twin Daggers', role: 'Rogue', big: 'TWO HANDS.', color: C.rune, keys: ['f', 'j'] },
  ];

  // ---- fights -----------------------------------------------------------------
  const keyGlow = {};
  function fight(enemyId, weaponId, at, opts = {}) {
    const E = { ...BR.ENEMIES.find((e) => e.id === enemyId), ...(opts.enemy || {}) };
    const W = BR.WEAPONS.find((w) => w.id === weaponId);
    const b = new BR.Battle({ audio, showResults() {} }, { enemy: E, weapon: W, trinket: BR.TRINKETS[0], settings: { offset: 0, cues: true, autoplay: true } });
    const abs = origin + at;
    const barDur = E.beats * 60 / E.bpm;
    b.bus = audio.newBus();
    // Skip the count-in: the cut lands on the first attack bar (or on the last count-in bar).
    b.t0 = abs - (opts.countIn ? 1 : 2) * barDur;
    const schedule = b.scheduleBar.bind(b);
    b.scheduleBar = (bar) => { if (b.t0 + bar.start >= abs - 0.001) schedule(bar); };
    const hit = b.hit.bind(b);
    b.hit = (n, jt) => { hit(n, jt); keyGlow[n.key] = 1; };
    if (opts.hp) b.foe.hp = opts.hp;
    b.ensureBars(abs - b.t0);
    return b;
  }

  let cur = null;
  const cut = (b) => { if (cur && cur !== b) audio.killBus(cur.bus, 0.04); cur = b; };

  function direct(t) {
    if (!direct.done) direct.done = {};
    const once = (k, fn) => { if (!direct.done[k] && t >= (typeof T[k] === 'number' ? T[k] : 0) - 1e-6) { direct.done[k] = true; fn(); } };
    once('open', () => {
      cut(fight('slime', 'drum', 0, { countIn: true, enemy: { atk: [{ a: [0, 1, 2, 3] }] } }));
      // Cold open: a kick under every count-in click, then an impact on the cut.
      const bd = T.drum / 4;
      for (let i = 0; i < 4; i++) audio.kick(origin + i * bd, adBus, 0.75);
      impact(T.drum, 0.5);
    });
    once('rune', () => { cut(fight('goblin', 'rune', T.rune)); });
    once('spell', () => { cut(fight('skeleton', 'spell', T.spell)); });
    once('twin', () => {
      cut(fight('dragon', 'twin', T.twin, { hp: 501, enemy: { atk: [BR.ENEMIES[3].atk[0], BR.ENEMIES[3].atk[4]] } }));
    });
    // Finish the dragon on an off-beat strike, so the VICTORY banner is not
    // replaced by the next bar's banner in the same frame.
    if (t >= T.kill && cur && cur.state === 'play') {
      const next = cur.notes.filter((n) => n.state === 'pending').sort((a, b) => a.t - b.t)[0];
      if (next && next.type === 'atk' && next.t - next.bar.start > 0.01) cur.foe.hp = Math.min(cur.foe.hp, 1);
    }
    if (cur && cur.state === 'won' && T.won === undefined) {
      T.won = t;
      T.end = t + 1.3;
      endSound(T.end);
    }
  }

  // ---- ad-only sound (on its own bus, scheduled ahead) --------------------------
  function impact(at, vol = 1) {
    const t = origin + at;
    audio.kick(t, adBus, 1 * vol);
    audio.noise(t, adBus, { type: 'lowpass', freq: 2500, vol: 0.35 * vol, decay: 0.6 });
    audio.noise(t, adBus, { type: 'highpass', freq: 5000, vol: 0.12 * vol, decay: 0.9 });
  }
  function endSound(at) {
    const t = origin + at, bd = 60 / 140;
    impact(at, 1);
    audio.bass(t, 41, 2.5, adBus, false);
    audio.pad(t, [65, 68, 72, 77], 4.2, adBus);
    audio.pad(t, [53, 60], 4.2, adBus);
    for (let i = 1; i < 8; i++) audio.hat(t + i * bd, adBus, 0.04);
    impact(at + 4 * bd, 0.55);
    [77, 81, 84, 89].forEach((m, i) => audio.tone(t + 4 * bd + i * 0.07, BR.mtof(m), adBus, { type: 'square', vol: 0.05, decay: i === 3 ? 1.2 : 0.2, filter: 3200 }));
  }

  // ---- drawing helpers ---------------------------------------------------------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);
  const easeBack = (v) => { v = clamp01(v); const s = 1.7; return 1 + (s + 1) * Math.pow(v - 1, 3) + s * Math.pow(v - 1, 2); };
  function text(s, x, y, font, color, { align = 'left', stroke = 0, strokeColor = C.ink, shadow = 0 } = {}) {
    out.font = font; out.textAlign = align; out.textBaseline = 'alphabetic';
    if (shadow) { out.fillStyle = C.ink3; out.fillText(s, x + shadow, y + shadow); }
    if (stroke) { out.lineWidth = stroke; out.lineJoin = 'round'; out.strokeStyle = strokeColor; out.strokeText(s, x, y); }
    out.fillStyle = color; out.fillText(s, x, y);
  }
  function keycap(label, cx, cy, w, glow, accent) {
    const h = 64, up = 8 * (1 - glow);
    out.fillStyle = '#1a1430'; out.fillRect(cx - w / 2, cy - h / 2 + 6, w, h);
    out.fillStyle = glow > 0.02 ? mix(C.ink3, accent, glow) : C.ink3;
    out.fillRect(cx - w / 2, cy - h / 2 - up + 6, w, h - 6);
    out.strokeStyle = glow > 0.02 ? accent : C.line; out.lineWidth = 3;
    out.strokeRect(cx - w / 2 + 1.5, cy - h / 2 - up + 7.5, w - 3, h - 9);
    text(label, cx, cy + 14 - up, `bold 26px ${FK}`, glow > 0.5 ? C.ink : C.parch, { align: 'center' });
  }
  function mix(a, b, k) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  }

  // ---- frame ---------------------------------------------------------------------
  let last = 0;
  function frame() {
    const t = audio.heard() - origin;
    const dt = Math.max(0, Math.min(0.05, t - last));
    last = t;
    direct(t);
    for (const k in keyGlow) keyGlow[k] = Math.max(0, keyGlow[k] - dt * 5);

    if (cur) {
      cur.update(dt);
      gx.setTransform(2, 0, 0, 2, 0, 0);
      gx.imageSmoothingEnabled = false;
      cur.S.autoplay = false; // hides the in-game "AUTOPLAY DEMO" tag
      cur.render(gx);
      cur.S.autoplay = true;
    }

    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    if (t < T.drum) drawColdOpen(t);
    else if (T.end !== undefined && t >= T.end) drawEndCard(t - T.end);
    else {
      drawGame(t);
      if (t >= T.tag) drawTagline(t - T.tag, 1 - clamp01((t - T.kill + 0.3) / 0.3));
      else drawCaption(t);
    }
    return t;
  }

  function drawGame(t) {
    // A gentle push-in on each shot.
    const s = SCENES.slice().reverse().find((x) => t >= x.at);
    const k = s ? clamp01((t - s.at) / 6) : 0;
    const z = 1.0 + 0.04 * k;
    out.fillStyle = C.ink; out.fillRect(0, 0, 1920, 1080);
    // Behind the tagline the fight keeps going, blurred.
    const blur = t >= T.tag ? 8 * clamp01((t - T.tag) / 0.3) * (1 - clamp01((t - T.kill + 0.3) / 0.3)) : 0;
    out.save();
    out.translate(960, 540); out.scale(z, z); out.translate(-960, -540);
    if (blur > 0.2) out.filter = `blur(${blur.toFixed(1)}px)`;
    out.drawImage(game, 0, 0);
    out.restore();
    // Flash on every cut.
    const since = s ? t - s.at : 9;
    if (since < 0.18) { out.fillStyle = `rgba(242,230,201,${0.55 * (1 - since / 0.18)})`; out.fillRect(0, 0, 1920, 1080); }
  }

  function drawColdOpen(t) {
    const bd = T.drum / 4;
    const beat = Math.min(3, Math.floor(t / bd));
    const ph = (t - beat * bd) / bd;
    out.fillStyle = C.deep; out.fillRect(0, 0, 1920, 1080);
    // Pulse ring on each beat.
    const r = 200 + ph * 700;
    out.strokeStyle = `rgba(92,225,230,${0.35 * (1 - ph)})`; out.lineWidth = 10;
    out.beginPath(); out.arc(960, 540, r, 0, Math.PI * 2); out.stroke();
    const words = [['EVERY', C.parch], ['FIGHT', C.parch], ['IS A', C.parch], ['SONG.', C.gold]];
    const line1 = words.slice(0, Math.min(2, beat + 1));
    const line2 = beat >= 2 ? words.slice(2, beat + 1) : [];
    const pop = (i) => (i === beat ? 1 + 0.18 * Math.exp(-ph * 9) : 1);
    const drawLine = (ws, y, base) => {
      out.font = `260px ${FD}`;
      const widths = ws.map(([w]) => out.measureText(w + ' ').width);
      let x = 960 - widths.reduce((a, b) => a + b, 0) / 2 + out.measureText(' ').width / 2;
      ws.forEach(([w, col], i) => {
        const sc = pop(base + i);
        out.save(); out.translate(x + widths[i] / 2 - out.measureText(' ').width / 2, y); out.scale(sc, sc);
        text(w, 0, 0, `260px ${FD}`, col, { align: 'center', shadow: 10 });
        out.restore();
        x += widths[i];
      });
    };
    drawLine(line1, 500, 0);
    drawLine(line2, 740, 2);
    // The slime's actual count-in, small, so the beat reads as the game's.
    text(String(4 - beat), 960, 960, `64px ${FD}`, `rgba(154,143,181,${1 - ph * 0.7})`, { align: 'center' });
  }

  function drawCaption(t) {
    const s = SCENES.slice().reverse().find((x) => t >= x.at);
    if (!s) return;
    const lt = t - s.at;
    const inK = easeOut(lt / 0.25);
    const x0 = 64 - (1 - inK) * 120;
    // Title in the sky, left of the combo counter and above the hero.
    const g = out.createLinearGradient(0, 0, 980, 0);
    g.addColorStop(0, 'rgba(11,8,22,0.85)'); g.addColorStop(0.75, 'rgba(11,8,22,0.6)'); g.addColorStop(1, 'rgba(11,8,22,0)');
    out.globalAlpha = inK;
    out.fillStyle = g; out.fillRect(0, 104, 980, 196);
    out.fillStyle = s.color; out.fillRect(0, 104, 10, 196);
    text(`${s.gear.toUpperCase()} · ${s.role.toUpperCase()}`, x0, 152, `bold 28px ${FK}`, s.color);
    const sc = easeBack(lt / 0.3);
    out.save(); out.translate(x0, 278); out.scale(sc, sc);
    text(s.big, 0, 0, `150px ${FD}`, C.parch, { shadow: 6 });
    out.restore();
    out.globalAlpha = 1;
    // What your hands do: the keys light up on every hit.
    if (s.keys) {
      const up = easeOut((lt - 0.1) / 0.25);
      out.save(); out.translate(0, (1 - up) * 120);
      out.fillStyle = C.deep; out.fillRect(0, 968, 1920, 112);
      out.fillStyle = s.color; out.fillRect(0, 968, 1920, 3);
      text('YOU PRESS', 64, 1036, `bold 26px ${FK}`, C.dim);
      let x = 300;
      s.keys.forEach((k) => {
        const w = k === ' ' ? 360 : 72;
        keycap(k === ' ' ? 'SPACE' : k.toUpperCase(), x + w / 2, 1020, w, keyGlow[k] || 0, s.color);
        x += w + 14;
      });
      out.restore();
    }
  }

  function drawTagline(lt, fade) {
    out.fillStyle = `rgba(11,8,22,${0.7 * fade})`; out.fillRect(0, 0, 1920, 1080);
    const lines = [
      [0.0, 'THE FOE SETS THE RHYTHM.', C.ember, 430],
      [1.5, 'YOUR GEAR DECIDES', C.rune, 600],
      [1.5, 'HOW YOU PLAY IT.', C.rune, 740],
    ];
    lines.forEach(([at, s, col, y]) => {
      const k = easeOut((lt - at) / 0.25);
      if (k <= 0) return;
      out.globalAlpha = k * fade;
      const sc = easeBack((lt - at) / 0.3);
      out.save(); out.translate(960, y); out.scale(sc, sc);
      text(s, 0, 0, `150px ${FD}`, C.parch, { align: 'center', shadow: 7 });
      out.restore();
      out.fillStyle = col;
      out.font = `150px ${FD}`;
      const w = out.measureText(s).width;
      if (s !== 'YOUR GEAR DECIDES') out.fillRect(960 - w / 2, y + 26, w * k, 8);
      out.globalAlpha = 1;
    });
  }

  function drawEndCard(lt) {
    out.fillStyle = C.deep; out.fillRect(0, 0, 1920, 1080);
    // Hero and dragon silhouettes bobbing on the beat at 140 BPM.
    const bd = 60 / 140;
    const pulse = Math.exp(-((lt / bd) % 1) * 7);
    out.save();
    out.globalAlpha = 0.22;
    out.setTransform(2, 0, 0, 2, 0, 0);
    BR.drawActor(out, 'hero', { x: 170, y: 470, lunge: 0, hurt: 0, flash: 0, dead: 0 }, 1, pulse, false);
    BR.drawActor(out, 'dragon', { x: 800, y: 470, lunge: 0, hurt: 0, flash: 0, dead: 0 }, -1, pulse, false);
    out.restore();
    out.globalAlpha = 1;
    const ring = (lt % bd) / bd;
    out.strokeStyle = `rgba(247,181,56,${0.25 * (1 - ring)})`; out.lineWidth = 8;
    out.beginPath(); out.arc(960, 440, 300 + ring * 500, 0, Math.PI * 2); out.stroke();

    const k = easeBack(lt / 0.35);
    out.save(); out.translate(960, 470); out.scale(k, k);
    out.font = `300px ${FD}`;
    const wB = out.measureText('Beats').width, wR = out.measureText('RPG').width;
    const x0 = -(wB + wR) / 2;
    text('Beats', x0, 0, `300px ${FD}`, C.parch, { shadow: 12 });
    text('RPG', x0 + wB, 0, `300px ${FD}`, C.gold, { shadow: 12 });
    out.restore();
    out.globalAlpha = easeOut((lt - 0.25) / 0.3);
    text('A RHYTHM-TYPING RPG', 960, 560, `bold 34px ${FK}`, C.dim, { align: 'center' });
    out.globalAlpha = 1;

    const fk = lt - 4 * bd;
    if (fk > 0) {
      const s = easeBack(fk / 0.3);
      out.save(); out.translate(960, 740); out.scale(s, s);
      out.font = `140px ${FD}`;
      const w = out.measureText('FREE TO PLAY').width;
      out.fillStyle = C.gold; out.fillRect(-w / 2 - 50, -118, w + 100, 150);
      out.fillStyle = C.ink3; out.fillRect(-w / 2 - 50, 32, w + 100, 10);
      text('FREE TO PLAY', 0, 0, `140px ${FD}`, C.ink, { align: 'center' });
      out.restore();
      out.globalAlpha = easeOut((fk - 0.3) / 0.3);
      text('Right in your browser  ·  No download  ·  No sign-up', 960, 900, `40px ${FU}`, C.parch, { align: 'center' });
      out.globalAlpha = 1;
    }
  }

  // ---- boot --------------------------------------------------------------------
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    canvas.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  function setupAudio(ctx) {
    const AC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    audio.init();
    window.AudioContext = AC;
    adBus = audio.newBus(0.8);
  }

  const fontsReady = Promise.all(['20px "Jersey 10"', '20px "Pixelify Sans"', 'bold 20px Silkscreen'].map((f) => document.fonts.load(f)));

  // Live playback in real time.
  async function play() {
    document.getElementById('play').hidden = true;
    await fontsReady;
    if (!audio.ctx) setupAudio(new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }));
    await audio.ctx.resume();
    origin = audio.ctx.currentTime + 0.3;
    last = 0;
    const loop = () => {
      audio.sync();
      const t = frame();
      if (T.end === undefined || t < T.end + 5.2) requestAnimationFrame(loop);
      else { document.getElementById('play').hidden = false; document.getElementById('play').textContent = '↻ Replay'; }
    };
    requestAnimationFrame(loop);
  }
  document.getElementById('play').addEventListener('click', () => {
    if (audio.ctx) { location.reload(); return; }
    play();
  });

  // Offline rendering: an OfflineAudioContext is the clock. Each step renders audio
  // up to the next frame time, then runs the game for that frame.
  const R = {
    async init({ fps = 60, sampleRate = 48000, maxSeconds = T.endMax } = {}) {
      document.body.classList.add('render');
      await fontsReady;
      const ctx = new OfflineAudioContext(2, Math.ceil(maxSeconds * sampleRate), sampleRate);
      setupAudio(ctx);
      audio.sync = () => {};
      audio.heard = () => ctx.currentTime;
      R.ctx = ctx; R.fps = fps; R.k = 0; R.started = false;
      frame();
      return { fps, sampleRate };
    },
    // Advance one frame. Returns the ad time and whether the ad is over.
    async step() {
      const ctx = R.ctx;
      const t = ++R.k / R.fps;
      const p = ctx.suspend(t);
      if (!R.started) { R.started = true; R.rendered = ctx.startRendering(); } else ctx.resume();
      await p;
      const now = frame();
      return { t: now, end: T.end !== undefined && now >= T.end + 5.0 };
    },
    async finish() {
      R.ctx.resume();
      const buf = await R.rendered;
      const len = Math.min(buf.length, Math.ceil((R.k / R.fps) * buf.sampleRate));
      // 16-bit stereo WAV, base64.
      const data = new DataView(new ArrayBuffer(44 + len * 4));
      const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); data.setUint32(4, 36 + len * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
      data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true);
      data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * 4, true);
      data.setUint16(32, 4, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * 4, true);
      const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
      for (let i = 0; i < len; i++) {
        data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i])) * 32767, true);
      }
      const bytes = new Uint8Array(data.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    },
  };
  window.AD = R;
  if (RENDER) document.body.classList.add('render');
})();
