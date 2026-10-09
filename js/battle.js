// One fight: generates the enemy's bars, schedules the music, judges input
// against the audio clock, applies damage, and draws everything.
(function () {
  const BR = window.BR;

  const WIN = { perfect: 0.045, great: 0.09, good: 0.14 }; // seconds, before weapon/trinket modifiers
  const JUDGE_MUL = { perfect: 1, great: 0.75, good: 0.45 };
  const PENT = [0, 3, 5, 7, 10];
  const COUNT_IN = 2;
  const HIT_X = 150;
  const HW_TOP = 318, HW_BOT = 470;

  const C = {
    ink: '#130f22', panel: 'rgba(14,10,28,0.88)', line: '#3b3160', parch: '#f2e6c9', dim: '#9a8fb5',
    gold: '#f7b538', rune: '#5ce1e6', hex: '#c792ff', ember: '#ff6b4a', moss: '#7bd389', miss: '#6b6384',
  };
  const JUDGE_STYLE = {
    perfect: ['PERFECT', C.gold], great: ['GREAT', C.rune], good: ['GOOD', C.moss],
    miss: ['MISS', C.ember], wrong: ['WRONG KEY', C.ember], drop: ['DROPPED', C.ember],
  };
  const FONT_UI = '"Pixelify Sans", ui-monospace, monospace';
  const FONT_DISPLAY = '"Jersey 10", "Pixelify Sans", ui-monospace, monospace';
  const FONT_KEY = 'Silkscreen, ui-monospace, "Courier New", monospace'; // legible caps for anything you must type

  class Battle {
    constructor(game, cfg) {
      this.game = game;
      this.audio = game.audio;
      this.E = cfg.enemy; this.W = cfg.weapon; this.T = cfg.trinket; this.S = cfg.settings;
      this.mode = this.W.mode;
      this.lanes = this.mode === 'twin' ? 2 : 1;
      const wm = this.W.windowMul * (this.T.windowMul || 1);
      this.win = { perfect: WIN.perfect * wm, great: WIN.great * wm, good: WIN.good * wm };
      this.bpm = this.E.bpm; this.seq = this.E.seq; this.seqPos = 0; this.enraged = false;
      this.pxPerSec = 150 * this.E.bpm / 60;
      this.notes = []; this.bars = []; this.words = [];
      this.barIndex = 0; this.nextBarStart = 0;
      this.lastPattern = { atk: -1, def: -1 }; this.lastRune = null; this.recentWords = [];
      this.player = { hp: 100, maxHp: 100, x: 250, y: 262, lunge: 0, hurt: 0, flash: 0, block: 0, dead: 0 };
      this.foe = { hp: this.E.hp, maxHp: this.E.hp, x: 710, y: 262, lunge: 0, hurt: 0, flash: 0, dead: 0 };
      this.combo = 0; this.maxCombo = 0;
      this.stats = { perfect: 0, great: 0, good: 0, miss: 0, dealt: 0, taken: 0, cast: 0, fizzled: 0, cross: 0, parry: 0, holds: 0, notes: 0, time: 0 };
      this.texts = []; this.particles = []; this.slashes = [];
      this.shake = 0; this.banner = null; this.laneFlash = [0, 0];
      this.state = 'play'; this.endTimer = 0; this.paused = false; this.reported = false;
      this.songNow = -1; this.curBar = null;
      this.bg = BR.Scenes.get(this.E.scene);
    }

    start() {
      this.bus = this.audio.newBus();
      this.t0 = this.audio.ctx.currentTime + 0.35;
      this.ensureBars(0);
    }

    judgeTime(perfMs) {
      let p = perfMs;
      const pn = performance.now();
      if (!(p > 0) || Math.abs(p - pn) > 1000) p = pn;
      return this.audio.heard(p) - this.t0 - (this.S.offset || 0) / 1000;
    }

    // ---- chart generation ---------------------------------------------------
    ensureBars(now) {
      while (this.state === 'play' && this.nextBarStart < now + 2 * (this.E.beats * 60 / this.bpm) + 0.5) this.genBar();
    }

    pickWord(size, type) {
      const list = (BR.WORDS[type] && BR.WORDS[type][size]) || [];
      if (!list.length) return 'x'.repeat(size);
      let w, tries = 0;
      do { w = list[Math.floor(Math.random() * list.length)]; } while (this.recentWords.includes(w) && ++tries < 8);
      this.recentWords.push(w);
      if (this.recentWords.length > 6) this.recentWords.shift();
      return w;
    }

    genBar() {
      const i = this.barIndex++;
      const beats = this.E.beats, bd = 60 / this.bpm;
      let type = 'rest';
      if (i >= COUNT_IN) type = this.seq[this.seqPos++ % this.seq.length] === 'A' ? 'atk' : 'def';
      const bar = { i, start: this.nextBarStart, beats, bd, dur: beats * bd, type, notes: [] };
      this.nextBarStart += bar.dur;
      const prog = this.E.music.prog;
      bar.root = this.E.music.root + (i >= COUNT_IN ? prog[(i - COUNT_IN) % prog.length] : 0);
      if (type !== 'rest') {
        const pool = this.E[type];
        let pi;
        do { pi = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && pi === this.lastPattern[type]);
        this.lastPattern[type] = pi;
        const notes = BR.Chart.assignLanes(BR.Chart.rawNotes(pool[pi]), this.lanes);
        notes.forEach((n, k) => {
          n.t = bar.start + n.beat * bd;
          n.end = n.t + n.len * bd;
          n.type = type; n.state = 'pending'; n.bar = bar;
          const low = n.voice === 1 || n.lane === 1;
          n.pitch = bar.root + (type === 'def' ? 24 : low ? 24 : 36) + PENT[k % 5];
        });
        BR.Chart.assignKeys(notes, this, bar);
        bar.notes = notes;
        this.notes.push(...notes);
      }
      this.bars.push(bar);
      if (this.bars.length > 10) this.bars.shift();
      this.scheduleBar(bar);
    }

    scheduleBar(bar) {
      const a = this.audio, bus = this.bus, T0 = this.t0 + bar.start, bd = bar.bd, B = bar.beats;
      if (bar.type === 'rest') {
        for (let b = 0; b < B; b++) { a.click(T0 + b * bd, b === 0, bus); a.hat(T0 + b * bd + bd / 2, bus, 0.05); }
        return;
      }
      const def = bar.type === 'def', r = bar.root;
      for (let b = 0; b < B; b++) {
        const t = T0 + b * bd;
        if (B === 3) { if (b === 0) a.kick(t, bus); else a.snare(t, bus, 0.22); }
        else {
          if (b % 2 === 0) a.kick(t, bus); else a.snare(t, bus);
          if (def && b === 3) a.kick(t + bd / 2, bus, 0.6);
        }
        a.hat(t, bus, 0.09); a.hat(t + bd / 2, bus, 0.05);
        a.bass(t, r + (b % 2 ? 12 : 0), bd * 0.45, bus, def);
        a.bass(t + bd / 2, r, bd * 0.35, bus, def);
      }
      a.pad(T0, [r + 24, r + 27, r + 31], bar.dur, bus);
      if (this.S.cues) bar.notes.forEach((n) => a.cue(this.t0 + n.t, n.pitch, n.type === 'def', bus, n.len * bd));
    }

    barAt(t) {
      for (const b of this.bars) if (t >= b.start && t < b.start + b.dur) return b;
      return null;
    }

    // ---- frame update -------------------------------------------------------
    update(dt) {
      if (this.paused) return;
      const now = this.audio.heard() - this.t0;
      this.songNow = now;
      const jn = now - (this.S.offset || 0) / 1000;
      if (this.state === 'play') {
        this.stats.time = Math.max(0, now);
        this.ensureBars(now);
        if (this.S.autoplay) this.autoplay(jn);
        for (const n of this.notes) {
          if (n.state === 'pending' && jn > n.t + this.win.good) this.miss(n, 'miss');
          else if (n.state === 'holding' && jn >= n.end) this.completeHold(n);
          if (this.state !== 'play') break;
        }
        const bar = this.barAt(now);
        if (bar && bar !== this.curBar) { this.curBar = bar; this.onBarStart(bar); }
      } else {
        this.endTimer += dt;
        if (this.endTimer > 2.6 && !this.reported) { this.reported = true; this.game.showResults(this); }
      }
      this.notes = this.notes.filter((n) => n.state === 'pending' || n.state === 'holding' || n.end > now - 1.5);

      const decay = (v, rate) => Math.max(0, v - dt * rate);
      for (const a of [this.player, this.foe]) {
        a.lunge = decay(a.lunge, 4.5); a.hurt = decay(a.hurt, 4); a.flash = decay(a.flash, 6);
        if (a.block !== undefined) a.block = decay(a.block, 4);
      }
      if (this.state === 'won') this.foe.dead = Math.min(1, this.foe.dead + dt * 0.8);
      if (this.state === 'lost') this.player.dead = Math.min(1, this.player.dead + dt * 0.8);
      this.shake = decay(this.shake, 40);
      this.laneFlash = this.laneFlash.map((v) => decay(v, 6));
      for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; t.vy *= 0.92; }
      this.texts = this.texts.filter((t) => t.life > 0);
      for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const s of this.slashes) s.life -= dt;
      this.slashes = this.slashes.filter((s) => s.life > 0);
      if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    }

    onBarStart(bar) {
      const prev = this.bars[this.bars.indexOf(bar) - 1];
      if (bar.type === 'rest') {
        if (bar.i === 0) this.setBanner('READY', C.parch, this.W.hint);
      } else if (bar.type === 'def' && (!prev || prev.type !== 'def')) {
        this.setBanner('DEFEND', C.ember, 'Hit the ember notes to parry');
      } else if (bar.type === 'atk' && (!prev || prev.type !== 'atk')) {
        this.setBanner('ATTACK', C.rune, prev && prev.type === 'rest' ? 'Hit the notes to strike' : '');
      }
    }

    autoplay(jn) {
      for (const n of this.notes) {
        if (n.state === 'pending' && jn >= n.t) { this.hit(n, n.t); this.laneFlash[n.lane] = 1; }
        if (this.state !== 'play') return;
      }
    }

    // ---- input -------------------------------------------------------------
    static keyOf(e) {
      if (e.code === 'Space' || e.key === ' ') return ' ';
      if (e.key && e.key.length === 1) {
        const l = e.key.toLowerCase();
        if (l >= 'a' && l <= 'z') return l;
      }
      return null;
    }

    onKeyDown(e) {
      const k = Battle.keyOf(e);
      if (k === null) return false;
      e.preventDefault();
      if (e.repeat || this.paused || this.state !== 'play' || this.S.autoplay) return true;
      const jt = this.judgeTime(e.timeStamp);
      if (this.mode === 'twin') { if (k === 'f') this.laneFlash[0] = 1; if (k === 'j') this.laneFlash[1] = 1; }
      else this.laneFlash[0] = 1;

      let best = null, bestD = Infinity, near = null, nearD = Infinity;
      for (const n of this.notes) {
        if (n.state !== 'pending') continue;
        const d = Math.abs(jt - n.t);
        if (d > this.win.good) continue;
        if (n.key === k && d < bestD) { best = n; bestD = d; }
        if (d < nearD) { near = n; nearD = d; }
      }
      if (best) this.hit(best, jt);
      else if (near && (this.mode === 'rune' || this.mode === 'spell')) this.miss(near, 'wrong');
      else this.audio.sfxWhiff();
      return true;
    }

    onKeyUp(e) {
      const k = Battle.keyOf(e);
      if (k === null || this.paused || this.state !== 'play' || this.S.autoplay) return;
      const jt = this.judgeTime(e.timeStamp);
      for (const n of this.notes) {
        if (n.state !== 'holding' || n.key !== k) continue;
        if (jt < n.end - this.win.good) this.drop(n);
        else this.completeHold(n);
      }
    }

    // ---- judgement outcomes -------------------------------------------------
    hit(n, jt) {
      const d = Math.abs(jt - n.t);
      const j = d <= this.win.perfect ? 'perfect' : d <= this.win.great ? 'great' : 'good';
      n.judge = j;
      n.state = n.len > 0 ? 'holding' : 'hit';
      this.stats[j]++; this.stats.notes++;
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.popJudge(j, n.lane, j === 'perfect' ? '' : jt < n.t ? 'early' : 'late');
      this.burst(HIT_X, this.laneY(n.lane), n.type === 'def' ? C.ember : this.noteColor(n), 10);
      this.audio.sfxHit(j, n.pitch);
      if (j === 'perfect' && this.T.healOnPerfect) this.heal(this.T.healOnPerfect, true);

      if (n.type === 'atk') {
        let dmg = this.W.base * JUDGE_MUL[j];
        if (this.mode === 'twin' && n.partner && (n.partner.state === 'hit' || n.partner.state === 'holding')) {
          dmg += this.W.base * this.W.crossMul * JUDGE_MUL[j];
          this.stats.cross++;
          this.float('CROSS!', this.foe.x, 150, C.hex, 30);
        }
        this.strike(dmg);
      } else {
        this.stats.parry++;
        this.player.block = 1;
        this.audio.sfxParry();
        if (j === 'perfect') this.strike(this.W.base * 0.5, true);
      }
      if (n.word) this.wordProgress(n);
    }

    miss(n, kind) {
      n.state = 'miss'; n.judge = 'miss';
      this.stats.miss++; this.stats.notes++;
      this.combo = 0;
      this.popJudge(kind, n.lane);
      if (n.type === 'def') this.foeAttack(this.E.power);
      else {
        this.audio.sfxMiss();
        if (this.T.missPenalty) this.hurtPlayer(this.T.missPenalty);
      }
      if (n.word && this.state === 'play') this.wordProgress(n);
    }

    completeHold(n) {
      if (n.state !== 'holding') return;
      n.state = 'hit';
      this.stats.holds++;
      this.audio.sfxHold();
      if (n.type === 'atk') {
        this.float('HOLD!', HIT_X + 40, this.laneY(n.lane) - 40, C.gold, 22);
        this.strike(this.W.base * 0.6 * n.len);
      } else {
        this.float('BRACED', HIT_X + 40, this.laneY(n.lane) - 40, C.gold, 22);
      }
    }

    drop(n) {
      n.state = 'dropped';
      this.combo = 0;
      this.popJudge('drop', n.lane);
      if (n.type === 'def') this.foeAttack(this.E.power * 0.5);
      if (n.word) { n.word.misses++; this.wordProgress(n); }
    }

    wordProgress(n) {
      const w = n.word;
      if (w.done) return;
      if (n.state === 'miss') w.misses++;
      if (w.misses > 0) {
        w.done = true; w.result = 'fizzle';
        this.stats.fizzled++;
        this.float(w.type === 'atk' ? 'FIZZLE' : 'WARD BROKEN', 480, 200, C.miss, 26);
        return;
      }
      if (w.notes.some((x) => x.state === 'pending')) return;
      w.done = true; w.result = 'cast';
      const acc = w.notes.reduce((s, x) => s + (JUDGE_MUL[x.judge] || 0), 0) / w.notes.length;
      if (w.type === 'atk') {
        this.stats.cast++;
        this.audio.sfxSpell(w.text.length);
        this.setBanner(w.text.toUpperCase() + '!', C.hex, '', 0.9);
        this.spellFx();
        this.strike(this.W.wordBonus * w.text.length * acc);
      } else {
        this.float('WARD: ' + w.text.toUpperCase(), this.player.x, 140, C.moss, 24);
        this.heal(w.text.length);
      }
    }

    comboMul() {
      const cap = this.T.comboCap || 2;
      return 1 + Math.min(this.combo, 40) / 40 * (cap - 1);
    }

    strike(base, counter) {
      this.player.lunge = 1;
      this.slashes.push({ x: this.foe.x, y: 200, life: 0.25, color: counter ? C.gold : C.parch });
      this.damageFoe(base * this.comboMul() * (this.T.dmgMul || 1));
    }

    damageFoe(d) {
      if (this.state !== 'play') return;
      d = Math.max(1, Math.round(d));
      this.foe.hp = Math.max(0, this.foe.hp - d);
      this.stats.dealt += d;
      this.foe.flash = 1; this.foe.hurt = 1;
      this.float(String(d), this.foe.x + (Math.random() * 60 - 30), 170, C.parch, 26);
      this.burst(this.foe.x, 200, C.gold, 6);
      if (this.E.enrage && !this.enraged && this.foe.hp > 0 && this.foe.hp <= this.foe.maxHp / 2) {
        this.enraged = true;
        this.bpm = this.E.enrage.bpm;
        this.seq = this.E.enrage.seq; this.seqPos = 0;
        this.setBanner('ENRAGED', C.ember, this.E.enrage.bpm + ' BPM', 1.6);
        this.shake = 10;
      }
      if (this.foe.hp <= 0) this.end(true);
    }

    foeAttack(base) {
      this.foe.lunge = 1;
      this.hurtPlayer(base * (this.W.defMul || 1) * (this.T.takenMul || 1));
    }

    hurtPlayer(d) {
      if (this.state !== 'play') return;
      d = Math.round(d);
      if (d <= 0) return;
      this.player.hp = Math.max(0, this.player.hp - d);
      this.stats.taken += d;
      this.player.hurt = 1; this.player.flash = 1;
      this.shake = 8;
      this.float('-' + d, this.player.x, 170, C.ember, 26);
      this.audio.sfxHurt();
      if (this.player.hp <= 0) this.end(false);
    }

    heal(n, quiet) {
      if (this.player.hp >= this.player.maxHp) return;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + n);
      this.float('+' + n, this.player.x - 30, 180, C.moss, quiet ? 16 : 22);
      if (!quiet) this.audio.sfxHeal();
    }

    end(won) {
      if (this.state !== 'play') return;
      this.state = won ? 'won' : 'lost';
      this.won = won;
      for (const n of this.notes) if (n.state === 'pending' || n.state === 'holding') n.state = 'void';
      this.audio.killBus(this.bus, 1.2);
      this.setBanner(won ? 'VICTORY' : 'DEFEATED', won ? C.gold : C.ember, '', 3);
      if (won) { this.audio.sfxWin(); this.burst(this.foe.x, 200, C.gold, 40); }
      else this.audio.sfxLose();
    }

    results() {
      const s = this.stats;
      const total = Math.max(1, s.perfect + s.great + s.good + s.miss);
      const acc = (s.perfect + s.great * 0.8 + s.good * 0.5) / total;
      const grade = !this.won ? 'F' : acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.55 ? 'C' : 'D';
      return { acc, grade, won: this.won, maxCombo: this.maxCombo, ...s };
    }

    // ---- effects helpers ---------------------------------------------------
    setBanner(text, color, sub, life = 1.3) { this.banner = { text, color, sub, life, max: life }; }
    float(text, x, y, color, size) { this.texts.push({ text, x, y, vy: -60, life: 0.9, max: 0.9, color, size }); }
    popJudge(kind, lane, sub) {
      const [text, color] = JUDGE_STYLE[kind];
      this.texts.push({ text, sub, x: HIT_X + 10, y: this.laneY(lane) - 44, vy: -40, life: 0.5, max: 0.5, color, size: 20, judge: true });
    }
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.35 + Math.random() * 0.3, color, size: 2 + Math.floor(Math.random() * 3) });
      }
    }
    spellFx() {
      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        this.particles.push({ x: this.player.x + 40 + (this.foe.x - this.player.x - 40) * t, y: 190 - Math.sin(t * Math.PI) * 60, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 80, life: 0.3 + t * 0.4, color: i % 2 ? C.hex : C.gold, size: 3 });
      }
    }
    laneY(lane) { return this.lanes === 1 ? 394 : lane === 0 ? 366 : 424; }
    noteColor(n) {
      if (n.type === 'def') return C.ember;
      if (this.mode === 'twin') return n.lane === 0 ? C.rune : C.hex;
      if (this.mode === 'spell') return C.hex;
      if (this.mode === 'drum') return C.gold;
      return C.rune;
    }

    // ---- rendering ---------------------------------------------------------
    render(x) {
      const now = this.songNow;
      x.save();
      if (this.shake > 0) x.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      x.fillStyle = C.ink; x.fillRect(-20, -20, 1000, 580);
      x.drawImage(this.bg, 0, 0, 960, 300);

      const bar = this.barAt(now);
      let pulse = 0;
      if (bar) pulse = Math.exp(-(((now - bar.start) / bar.bd) % 1) * 7);
      const next = bar && this.bars[this.bars.indexOf(bar) + 1];
      const windup = this.state === 'play' && bar && bar.type !== 'def' && next && next.type === 'def';

      drawActor(x, 'hero', this.player, 1, pulse, false);
      drawActor(x, this.E.sprite, this.foe, -1, pulse, windup && ((now / (bar.bd / 2)) % 1 < 0.5));
      if (windup) {
        x.fillStyle = C.ember; x.font = `bold 34px ${FONT_DISPLAY}`; x.textAlign = 'center';
        x.fillText('!', this.foe.x, 262 - BR.Sprites.get(this.E.sprite).h * BR.Sprites.SCALE[this.E.sprite] - 14 - pulse * 6);
      }
      for (const s of this.slashes) {
        const k = 1 - s.life / 0.25;
        x.strokeStyle = s.color; x.globalAlpha = s.life / 0.25; x.lineWidth = 5;
        x.beginPath(); x.arc(s.x - 20, s.y, 50, -1.2 + k * 0.6, 0.4 + k * 0.6); x.stroke();
        x.globalAlpha = 1;
      }

      this.drawHud(x, bar, now, pulse);
      this.drawHighway(x, now, bar);
      this.drawBottom(x);

      for (const p of this.particles) { x.fillStyle = p.color; x.fillRect(p.x, p.y, p.size, p.size); }
      x.textAlign = 'center';
      for (const t of this.texts) {
        x.globalAlpha = Math.min(1, t.life / t.max * 2);
        x.font = `bold ${t.size}px ${t.judge ? FONT_UI : FONT_DISPLAY}`;
        outlineText(x, t.text, t.x + (t.judge ? 30 : 0), t.y, t.color);
        if (t.sub) { x.font = `12px ${FONT_UI}`; outlineText(x, t.sub, t.x + 30, t.y + 14, C.dim); }
      }
      x.globalAlpha = 1;
      this.drawBanner(x, bar, now);
      x.restore();
    }

    drawHud(x, bar, now, pulse) {
      hpBar(x, 24, 24, 300, this.player.hp, this.player.maxHp, C.moss, 'You · ' + this.W.name + (this.T.id !== 'none' ? ' + ' + this.T.name : ''), 'left');
      hpBar(x, 636, 24, 300, this.foe.hp, this.foe.maxHp, this.enraged ? C.ember : C.gold, this.E.name + ' · ' + this.E.title, 'right');
      x.textAlign = 'center';
      x.font = `11px ${FONT_KEY}`; x.fillStyle = C.dim;
      x.fillText(`${Math.round(this.bpm)} BPM · ${this.E.beats}/4`, 480, 30);
      if (bar) {
        const beat = Math.floor((now - bar.start) / bar.bd);
        for (let i = 0; i < bar.beats; i++) {
          const on = i === beat;
          x.fillStyle = on ? (bar.type === 'def' ? C.ember : bar.type === 'atk' ? C.rune : C.parch) : 'rgba(242,230,201,0.2)';
          const s = on ? 10 + pulse * 4 : 8;
          x.fillRect(480 - (bar.beats - 1) * 11 + i * 22 - s / 2, 44 - s / 2, s, s);
        }
      }
      if (this.combo >= 2) {
        x.font = `bold 30px ${FONT_DISPLAY}`;
        outlineText(x, `${this.combo} COMBO`, 480, 88, C.parch);
        x.font = `13px ${FONT_UI}`; x.fillStyle = C.gold;
        x.fillText(`x${this.comboMul().toFixed(2)} damage`, 480, 104);
      }
    }

    drawHighway(x, now, bar) {
      const pps = this.pxPerSec;
      x.fillStyle = C.panel; x.fillRect(0, HW_TOP, 960, HW_BOT - HW_TOP);
      x.fillStyle = C.line; x.fillRect(0, HW_TOP, 960, 2); x.fillRect(0, HW_BOT - 2, 960, 2);

      // Bar tints and beat lines
      for (const b of this.bars) {
        const x0 = HIT_X + (b.start - now) * pps, x1 = x0 + b.dur * pps;
        if (x1 < 0 || x0 > 960) continue;
        if (b.type !== 'rest') {
          x.fillStyle = b.type === 'def' ? 'rgba(255,107,74,0.09)' : 'rgba(92,225,230,0.05)';
          x.fillRect(Math.max(0, x0), HW_TOP + 2, Math.min(960, x1) - Math.max(0, x0), HW_BOT - HW_TOP - 4);
        }
        for (let i = 0; i < b.beats; i++) {
          const lx = x0 + i * b.bd * pps;
          if (lx < 0 || lx > 960) continue;
          x.fillStyle = i === 0 ? 'rgba(242,230,201,0.28)' : 'rgba(242,230,201,0.09)';
          x.fillRect(Math.round(lx), HW_TOP + 2, i === 0 ? 2 : 1, HW_BOT - HW_TOP - 4);
        }
        if (b.type !== 'rest' && x0 > HIT_X - 10 && x0 < 940) {
          x.font = `11px ${FONT_UI}`; x.textAlign = 'left';
          x.fillStyle = b.type === 'def' ? C.ember : C.rune;
          x.fillText(b.type === 'def' ? 'DEFEND' : 'ATTACK', x0 + 5, HW_TOP + 15);
        }
      }

      // Lanes and receptors
      for (let l = 0; l < this.lanes; l++) {
        const y = this.laneY(l);
        x.fillStyle = 'rgba(242,230,201,0.05)'; x.fillRect(0, y - 1, 960, 2);
        const f = this.laneFlash[l];
        x.strokeStyle = f > 0 ? C.parch : 'rgba(242,230,201,0.45)'; x.lineWidth = 3;
        x.beginPath(); x.arc(HIT_X, y, (this.lanes === 1 ? 26 : 21) + f * 4, 0, Math.PI * 2); x.stroke();
        if (f > 0) { x.fillStyle = `rgba(242,230,201,${f * 0.25})`; x.fill(); }
        const label = this.mode === 'twin' ? (l === 0 ? 'F' : 'J') : this.mode === 'drum' ? 'SPACE' : 'TYPE';
        keycap(x, label, 58, y, this.mode === 'twin' ? 30 : 64);
      }

      // Notes, far to near
      for (let i = this.notes.length - 1; i >= 0; i--) {
        const n = this.notes[i];
        if (n.state === 'hit' || n.state === 'void') continue;
        const y = this.laneY(n.lane);
        const r = this.lanes === 1 ? 22 : 18;
        let hx = HIT_X + (n.t - now) * pps;
        const tx = HIT_X + (n.end - now) * pps;
        if (hx > 1000 && n.state === 'pending') continue;
        const missed = n.state === 'miss' || n.state === 'dropped';
        const col = missed ? C.miss : this.noteColor(n);
        if (n.state === 'holding') hx = HIT_X;
        if (n.len > 0 && tx > hx) {
          x.fillStyle = col; x.globalAlpha = missed ? 0.25 : n.state === 'holding' ? 0.75 : 0.45;
          x.fillRect(hx, y - r * 0.45, tx - hx, r * 0.9);
          x.globalAlpha = 1;
        }
        x.globalAlpha = missed ? 0.4 : 1;
        if (n.type === 'def') diamond(x, hx, y, r + 3, col);
        else circle(x, hx, y, r, col);
        if (n.label) {
          x.fillStyle = C.ink; x.font = `bold ${this.lanes === 1 ? 20 : 17}px ${FONT_KEY}`; x.textAlign = 'center';
          x.fillText(n.label, hx, y + 7);
        } else {
          x.fillStyle = C.ink; x.fillRect(hx - 5, y - 5, 10, 10);
        }
        x.globalAlpha = 1;
      }
    }

    drawBottom(x) {
      x.textAlign = 'left';
      if (this.mode === 'spell') {
        const live = this.words.filter((w) => !w.done && w.notes.some((n) => n.state === 'pending' || n.state === 'holding'));
        const cur = live[0], nxt = live[1];
        x.font = `12px ${FONT_UI}`; x.fillStyle = C.dim;
        x.fillText(cur ? (cur.type === 'atk' ? 'CASTING' : 'WARDING') : 'SPELLBOOK', 24, 498);
        if (cur) {
          let px = 24;
          cur.notes.forEach((n) => {
            const done = n.state === 'hit' || n.state === 'holding';
            const col = n.state === 'miss' ? C.ember : done ? (cur.type === 'atk' ? C.hex : C.ember) : C.parch;
            letterTile(x, n.label, px, 506, col, done);
            px += 32;
          });
          if (nxt) {
            x.font = `bold 16px ${FONT_KEY}`; x.fillStyle = 'rgba(242,230,201,0.35)';
            x.fillText('THEN ' + nxt.text.toUpperCase(), px + 16, 527);
          }
        }
      } else {
        x.font = `14px ${FONT_UI}`; x.fillStyle = C.dim;
        x.fillText(this.W.hint, 24, 505);
      }
      x.textAlign = 'right'; x.font = `12px ${FONT_UI}`; x.fillStyle = C.dim;
      x.fillText('Cyan/violet = strike   Ember = enemy blow, hit to parry   Esc = pause', 936, 505);
      if (this.S.autoplay) { x.fillStyle = C.gold; x.fillText('AUTOPLAY DEMO', 936, 525); }
    }

    drawBanner(x, bar, now) {
      x.textAlign = 'center';
      if (bar && bar.type === 'rest' && bar.i === COUNT_IN - 1 && this.state === 'play') {
        const beat = Math.floor((now - bar.start) / bar.bd);
        const ph = ((now - bar.start) / bar.bd) % 1;
        x.font = `bold ${80 - ph * 20}px ${FONT_DISPLAY}`;
        x.globalAlpha = 1 - ph * 0.6;
        outlineText(x, String(bar.beats - beat), 480, 190, C.parch);
        x.globalAlpha = 1;
      }
      const b = this.banner;
      if (!b) return;
      const t = 1 - b.life / b.max;
      const scale = t < 0.12 ? 0.6 + t / 0.12 * 0.4 : 1;
      x.globalAlpha = Math.min(1, b.life * 3);
      x.save(); x.translate(480, 170); x.scale(scale, scale);
      x.font = `bold 64px ${FONT_DISPLAY}`;
      outlineText(x, b.text, 0, 0, b.color);
      if (b.sub) { x.font = `16px ${FONT_UI}`; outlineText(x, b.sub, 0, 28, C.parch); }
      x.restore();
      x.globalAlpha = 1;
    }
  }

  // ---- drawing primitives ---------------------------------------------------
  function drawActor(x, name, a, facing, pulse, glow) {
    const spr = BR.Sprites.get(name);
    const sc = BR.Sprites.SCALE[name];
    const w = spr.w * sc, h = spr.h * sc;
    const lungeP = a.lunge > 0 ? Math.sin((1 - a.lunge) * Math.PI) : 0;
    const px = a.x + facing * lungeP * 70 - facing * a.hurt * 14;
    const py = a.y + a.dead * 30;
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.beginPath(); x.ellipse(a.x, a.y + 2, w * 0.35, 7, 0, 0, Math.PI * 2); x.fill();
    x.save();
    x.globalAlpha = 1 - a.dead;
    x.translate(px, py);
    x.scale(facing * (1 + pulse * 0.04), 1 - pulse * 0.05);
    x.imageSmoothingEnabled = false;
    x.drawImage(spr.canvas, -w / 2, -h, w, h);
    if (a.flash > 0 || glow) {
      x.globalAlpha = (1 - a.dead) * (glow ? 0.35 : a.flash);
      x.drawImage(spr.white, -w / 2, -h, w, h);
    }
    x.restore();
    if (a.block > 0) {
      x.strokeStyle = `rgba(247,181,56,${a.block})`; x.lineWidth = 4;
      x.beginPath(); x.arc(a.x + 40, a.y - 55, 46, -1, 1); x.stroke();
    }
  }

  function hpBar(x, bx, by, w, hp, max, color, label, align) {
    x.font = `14px ${FONT_UI}`; x.textAlign = align; x.fillStyle = C.parch;
    x.fillText(label, align === 'left' ? bx : bx + w, by - 6);
    x.fillStyle = 'rgba(10,8,20,0.75)'; x.fillRect(bx - 2, by - 2, w + 4, 18);
    const fw = Math.max(0, w * hp / max);
    x.fillStyle = color;
    if (align === 'left') x.fillRect(bx, by, fw, 14); else x.fillRect(bx + w - fw, by, fw, 14);
    x.fillStyle = 'rgba(255,255,255,0.25)';
    if (align === 'left') x.fillRect(bx, by, fw, 3); else x.fillRect(bx + w - fw, by, fw, 3);
    x.font = `bold 10px ${FONT_KEY}`; x.fillStyle = C.ink; x.textAlign = align;
    x.fillText(`${Math.ceil(hp)} / ${max}`, align === 'left' ? bx + 6 : bx + w - 6, by + 12);
  }

  function circle(x, cx, cy, r, col) {
    x.fillStyle = C.ink; x.beginPath(); x.arc(cx, cy, r + 3, 0, Math.PI * 2); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.35, r * 0.35, 0, Math.PI * 2); x.fill();
  }
  function diamond(x, cx, cy, r, col) {
    const path = (rr) => { x.beginPath(); x.moveTo(cx, cy - rr); x.lineTo(cx + rr, cy); x.lineTo(cx, cy + rr); x.lineTo(cx - rr, cy); x.closePath(); };
    x.fillStyle = C.ink; path(r + 4); x.fill();
    x.fillStyle = col; path(r); x.fill();
  }
  function keycap(x, label, cx, cy, w) {
    x.fillStyle = '#2a2147'; x.fillRect(cx - w / 2, cy - 14, w, 30);
    x.fillStyle = '#3b3160'; x.fillRect(cx - w / 2, cy - 16, w, 26);
    x.font = `bold 12px ${FONT_KEY}`; x.fillStyle = C.parch; x.textAlign = 'center';
    x.fillText(label, cx, cy + 4);
  }
  function letterTile(x, ch, px, py, col, filled) {
    x.fillStyle = filled ? col : 'rgba(242,230,201,0.08)'; x.fillRect(px, py, 28, 30);
    x.strokeStyle = col; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, 26, 28);
    x.font = `bold 18px ${FONT_KEY}`; x.textAlign = 'center'; x.fillStyle = filled ? C.ink : col;
    x.fillText(ch, px + 14, py + 22);
    x.textAlign = 'left';
  }
  function outlineText(x, text, tx, ty, col) {
    x.lineWidth = 5; x.strokeStyle = C.ink; x.lineJoin = 'round';
    x.strokeText(text, tx, ty);
    x.fillStyle = col; x.fillText(text, tx, ty);
  }

  BR.Battle = Battle;
  BR.drawActor = drawActor;
})();
