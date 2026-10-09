// Pixel-art sprites authored as strings (one char per pixel, '.' = transparent),
// plus procedurally painted battle backdrops. Everything is drawn facing right;
// enemies are mirrored at draw time.
(function () {
  const BR = window.BR;

  const SPRITES = {
    hero: {
      pal: { k: '#1a1c2c', r: '#d04648', H: '#d6e0ea', h: '#94a6bd', d: '#566c86', s: '#f4c99a', e: '#1a1c2c',
        b: '#3b5dc9', B: '#29366f', g: '#ffcd75', w: '#f4f4f4', n: '#8a5a2b', l: '#5d3a1a' },
      rows: [
        '.....rrr..........',
        '....rr........w...',
        '...kkkkkk....kwk..',
        '..kHHHHHHk...kwk..',
        '..kHhhhhhhk..kwk..',
        '..kHhkssssk..kwk..',
        '..kHkssseskk.kwk..',
        '..kHkssssk...kwk..',
        '...kkkkkk...kgggk.',
        '..kbbbbbbk...ksk..',
        '.kbbgbbbbbkkkssk..',
        '.kbbgbbbbbssssk...',
        '.kBbgbbbbbkkknk...',
        '..kBBBBBBk...nk...',
        '..kbbbkbbk...k....',
        '..kllk.kllk.......',
        '.kllk...kllk......',
        '.kkk.....kkk......',
      ],
    },
    slime: {
      pal: { k: '#1a1c2c', G: '#a7f070', g: '#38b764', D: '#257179', w: '#f4f4f4' },
      rows: [
        '......kkkk......',
        '....kkGGGgkk....',
        '...kGGggggggk...',
        '..kGgggggggggk..',
        '.kGgggggwwggwwk.',
        '.kggggggwkggwkk.',
        'kgggggggggggggDk',
        'kggggggggkkkggDk',
        'kgggggggggggggDk',
        'kDgggggggggggDDk',
        '.kDDDDDDDDDDDDk.',
        '..kkkkkkkkkkkk..',
      ],
    },
    goblin: {
      pal: { k: '#1a1c2c', r: '#d04648', g: '#71a83a', D: '#3f6b2a', w: '#f4f4f4', y: '#ffcd75',
        n: '#8a5a2b', d: '#e8c39e', R: '#b13e53' },
      rows: [
        '.....kkkkkk.......',
        '....krrrrrrk......',
        '...krrrrrrrrk.....',
        'kk.kggggggggk.kk..',
        'kgkggggggywkgkgk..',
        '.kgggggggykkggk...',
        '..kgggggggggggk...',
        '...kggkwkwkggk..n.',
        '....kkggggggk..kn.',
        '...knnnnnnnnk.kn..',
        '..kgnnnnnnnngkn...',
        '..kgkRRRRRRRRkk...',
        '...kdddddddddk....',
        '...kdRddRddRdk....',
        '...kdddddddddk....',
        '....kkkkkkkkk.....',
        '....kDk...kDk.....',
        '...kkkk..kkkk.....',
      ],
    },
    skeleton: {
      pal: { k: '#1a1c2c', w: '#f0ead6', W: '#b8b09a', r: '#ff4d4d', S: '#c2cfdc', s: '#566c86', h: '#5a4a7a', g: '#ffcd75' },
      rows: [
        '....hhhhhh........',
        '...hkkkkkkh.......',
        '...kwwwwwwk.......',
        '..kwwwwwwwwk......',
        '..kwwkkwwkkk......',
        '..kwwkrwwkrk......',
        '..kwwwwkwwwk......',
        '...kwkwkwkk.....S.',
        '....kkkkk......kSk',
        '..kkWwWwWkk...kSk.',
        '.kwkkwWwkkwk.kSk..',
        '.kwkkWwWkkwkkgk...',
        '.kwkkwWwkk.kwwk...',
        '..k.kkkkk...ks....',
        '....kw.wk.........',
        '....kw.wk.........',
        '....kw.wk.........',
        '...kww.wwk........',
        '...kkk.kkk........',
      ],
    },
    dragon: {
      pal: { k: '#1a1c2c', r: '#c0392b', R: '#7a1f2b', y: '#ffcd75', p: '#5d275d', P: '#8e3b6e', w: '#f4f4f4', e: '#ffe066', o: '#ff8a3d' },
      rows: [
        '....................kk........',
        '...................kwk..kk....',
        '...kk.............krrk.kwk....',
        '..kppk...........krrrrkrrk....',
        '.kpPPpk.........krrrkerrrrk...',
        '.kpPPPpk........krrrrrrrrrrkk.',
        'kpPPPPPpk.......krrrrrkkrrrrrk',
        'kpPPPPPPpk.....krrrrk..kwkwkk.',
        '.kpPPPPPPpk....krrrrk.....oo..',
        '..kpPPPPPPpk..krrrrrk....ooo..',
        '...kkpPPPPPrkkrrrrrk..........',
        '.....kkrrrrrrrryyyrk..........',
        '....kkrrrrrrrryyyyrk..........',
        '..krrrrrrrrrrryyyyrk..........',
        '.krRkkrrrrrrryyyyrk...........',
        'krRk..krrrrrrrrrrk............',
        'kRk...krrRkkkrrRk.............',
        '.k....krrk...krrk.............',
        '.....krrrk..krrrk.............',
        '.....kkkk...kkkk..............',
      ],
    },
  };

  const cache = {};
  function build(name, white) {
    const def = SPRITES[name];
    const w = Math.max(...def.rows.map((r) => r.length));
    const h = def.rows.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    def.rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || !def.pal[ch]) continue;
        x.fillStyle = white ? '#ffffff' : def.pal[ch];
        x.fillRect(i, y, 1, 1);
      }
    });
    return { canvas: c, w, h };
  }

  BR.Sprites = {
    get(name) {
      if (!cache[name]) {
        const s = build(name, false);
        s.white = build(name, true).canvas;
        cache[name] = s;
      }
      return cache[name];
    },
    SCALE: { hero: 6, slime: 7, goblin: 6, skeleton: 6, dragon: 6 },
  };

  // ---- Backdrops -----------------------------------------------------------
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function grad(x, y0, y1, stops) {
    const g = x.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function ridge(x, rand, base, amp, step, color) {
    x.fillStyle = color;
    x.beginPath(); x.moveTo(0, 300);
    let y = base;
    for (let px = 0; px <= 960; px += step) {
      y = base + (rand() - 0.5) * amp;
      x.lineTo(px, y);
    }
    x.lineTo(960, 300); x.closePath(); x.fill();
  }
  function stars(x, rand, n, color, maxY) {
    x.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const s = rand() < 0.15 ? 2 : 1;
      x.fillRect(Math.floor(rand() * 960), Math.floor(rand() * maxY), s, s);
    }
  }
  function ground(x, rand, top, mid, dark, speck) {
    x.fillStyle = mid; x.fillRect(0, 262, 960, 38);
    x.fillStyle = top; x.fillRect(0, 262, 960, 5);
    x.fillStyle = dark; x.fillRect(0, 294, 960, 6);
    x.fillStyle = speck;
    for (let i = 0; i < 90; i++) x.fillRect(Math.floor(rand() * 960), 270 + Math.floor(rand() * 22), 3, 2);
  }

  const SCENES = {
    meadow(x, rand) {
      x.fillStyle = grad(x, 0, 262, ['#1d2a52', '#35508a', '#7a8fc0']); x.fillRect(0, 0, 960, 300);
      stars(x, rand, 60, 'rgba(255,255,255,0.6)', 120);
      x.fillStyle = 'rgba(255,240,210,0.9)'; x.beginPath(); x.arc(780, 70, 26, 0, 7); x.fill();
      ridge(x, rand, 190, 40, 60, '#2c3c6e');
      ridge(x, rand, 222, 24, 40, '#2d5a4a');
      ridge(x, rand, 245, 14, 24, '#3a7550');
      ground(x, rand, '#7cc35a', '#4c8a3d', '#2f5a2a', '#5fa349');
      x.fillStyle = '#d9f0a0';
      for (let i = 0; i < 40; i++) x.fillRect(Math.floor(rand() * 960), 262 + Math.floor(rand() * 4), 2, 3);
    },
    forest(x, rand) {
      x.fillStyle = grad(x, 0, 262, ['#101a2a', '#1f3340', '#3d5a58']); x.fillRect(0, 0, 960, 300);
      stars(x, rand, 30, 'rgba(255,255,255,0.4)', 90);
      for (const [base, col, n] of [[200, '#15292a', 22], [235, '#1c3a33', 16], [262, '#244a3c', 11]]) {
        x.fillStyle = col;
        for (let i = 0; i < n; i++) {
          const cx = rand() * 980 - 10, h = 70 + rand() * 90, w = h * 0.38;
          x.beginPath(); x.moveTo(cx, base - h); x.lineTo(cx + w, base); x.lineTo(cx - w, base); x.closePath(); x.fill();
        }
        x.fillRect(0, base - 2, 960, 300 - base);
      }
      ground(x, rand, '#5a6e33', '#3b4a26', '#252f18', '#4b5c2c');
      x.fillStyle = 'rgba(255,224,102,0.8)';
      for (let i = 0; i < 18; i++) x.fillRect(Math.floor(rand() * 960), 120 + Math.floor(rand() * 130), 2, 2);
    },
    crypt(x, rand) {
      x.fillStyle = grad(x, 0, 262, ['#0d0a16', '#1c1630', '#2d2448']); x.fillRect(0, 0, 960, 300);
      for (let i = 0; i < 7; i++) {
        const px = 30 + i * 150;
        x.fillStyle = '#251e3b'; x.fillRect(px, 40, 44, 222);
        x.fillStyle = '#2f2749'; x.fillRect(px + 4, 40, 8, 222);
        x.fillStyle = '#1a1529'; x.fillRect(px - 6, 34, 56, 10);
        if (i < 6) {
          x.strokeStyle = '#251e3b'; x.lineWidth = 10;
          x.beginPath(); x.arc(px + 97, 110, 53, Math.PI, 0); x.stroke();
        }
      }
      for (const tx of [130, 830]) {
        const g = x.createRadialGradient(tx, 150, 2, tx, 150, 90);
        g.addColorStop(0, 'rgba(255,170,80,0.55)'); g.addColorStop(1, 'rgba(255,170,80,0)');
        x.fillStyle = g; x.fillRect(tx - 90, 60, 180, 180);
        x.fillStyle = '#5d3a1a'; x.fillRect(tx - 3, 150, 6, 18);
        x.fillStyle = '#ffcd75'; x.fillRect(tx - 4, 140, 8, 10);
        x.fillStyle = '#ff8a3d'; x.fillRect(tx - 2, 136, 4, 6);
      }
      x.fillStyle = '#3b3352'; x.fillRect(0, 262, 960, 38);
      x.fillStyle = '#4a4166'; x.fillRect(0, 262, 960, 4);
      x.fillStyle = '#2a2440';
      for (let r = 0; r < 3; r++) {
        x.fillRect(0, 272 + r * 10, 960, 2);
        for (let c = 0; c < 20; c++) x.fillRect(c * 52 + (r % 2) * 26, 272 + r * 10, 2, 10);
      }
    },
    volcano(x, rand) {
      x.fillStyle = grad(x, 0, 262, ['#1a0810', '#3d1220', '#7a2a1f']); x.fillRect(0, 0, 960, 300);
      x.fillStyle = '#2a0f16';
      x.beginPath(); x.moveTo(380, 262); x.lineTo(560, 70); x.lineTo(640, 70); x.lineTo(860, 262); x.closePath(); x.fill();
      const g = x.createRadialGradient(600, 70, 4, 600, 70, 140);
      g.addColorStop(0, 'rgba(255,138,61,0.8)'); g.addColorStop(1, 'rgba(255,138,61,0)');
      x.fillStyle = g; x.fillRect(440, 0, 320, 200);
      x.fillStyle = '#ff6b4a';
      x.beginPath(); x.ellipse(600, 71, 40, 4, 0, 0, Math.PI * 2); x.fill();
      for (const [sx, len, drift] of [[574, 46, -18], [602, 80, 6], [624, 58, 22]]) {
        x.beginPath(); x.moveTo(sx - 4, 72); x.lineTo(sx + 4, 72); x.lineTo(sx + drift + 1, 72 + len); x.closePath(); x.fill();
      }
      ridge(x, rand, 240, 20, 30, '#3a1418');
      ground(x, rand, '#5a2a24', '#3a1a1c', '#221012', '#4a2220');
      x.fillStyle = '#ff6b4a';
      for (let i = 0; i < 14; i++) {
        const px = rand() * 940, py = 270 + rand() * 20;
        x.fillRect(px, py, 10 + rand() * 30, 2);
      }
      x.fillStyle = 'rgba(255,205,117,0.85)';
      for (let i = 0; i < 40; i++) x.fillRect(Math.floor(rand() * 960), Math.floor(rand() * 240), 2, 2);
    },
  };

  const sceneCache = {};
  BR.Scenes = {
    get(name) {
      if (sceneCache[name]) return sceneCache[name];
      const c = document.createElement('canvas');
      c.width = 1920; c.height = 600;
      const x = c.getContext('2d');
      x.scale(2, 2);
      x.imageSmoothingEnabled = false;
      (SCENES[name] || SCENES.meadow)(x, rng(name.length * 977 + 13));
      sceneCache[name] = c;
      return c;
    },
  };
})();
