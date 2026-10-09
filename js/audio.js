// Web Audio engine: a synth drum kit, bass, pads, note cues and sound effects,
// all generated in code (no audio files), plus the clock the battle judges against.
(function () {
  const BR = window.BR;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const PENT = [0, 3, 5, 7, 10, 12, 15, 17];

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.offset = null; // seconds: heardContextTime - performance.now()/1000
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended' && !this.holdSuspended) this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC({ latencyHint: 'interactive' }));
      this.master = c.createGain();
      this.master.gain.value = 0.8;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.75;
      this.sfx.connect(this.master);
      const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }

    // ---- clock -------------------------------------------------------------
    // Maps performance.now() (the clock key events are stamped with) onto the
    // audio context time that is reaching the speakers at that instant, so
    // judging accounts for output latency.
    sync() {
      const c = this.ctx;
      if (!c || c.state !== 'running') return;
      const pn = performance.now() / 1000;
      const fallback = c.currentTime - (c.outputLatency || c.baseLatency || 0) - pn;
      let raw = fallback;
      if (c.getOutputTimestamp) {
        const ts = c.getOutputTimestamp();
        if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
          const cand = ts.contextTime - ts.performanceTime / 1000;
          const heardNow = cand + pn;
          if (heardNow <= c.currentTime + 0.01 && heardNow > c.currentTime - 0.5) raw = cand;
        }
      }
      if (this.offset === null || Math.abs(raw - this.offset) > 0.05) this.offset = raw;
      else this.offset += (raw - this.offset) * 0.05;
    }
    heard(perfMs) {
      if (this.offset === null) this.sync();
      if (this.offset === null) return this.ctx ? this.ctx.currentTime : 0;
      return (perfMs === undefined ? performance.now() : perfMs) / 1000 + this.offset;
    }

    newBus(vol = 0.7) {
      const g = this.ctx.createGain();
      g.gain.value = vol;
      g.connect(this.master);
      return g;
    }
    killBus(bus, fade = 0.5) {
      if (!bus) return;
      const t = this.ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { try { bus.disconnect(); } catch (e) { /* already gone */ } }, fade * 1000 + 200);
    }

    // ---- primitives ----------------------------------------------------------
    tone(t, freq, dest, { type = 'triangle', vol = 0.2, attack = 0.004, decay = 0.2, filter = 0, q = 1, sustain = 0 } = {}) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      if (sustain > 0) g.gain.setValueAtTime(vol, t + attack + sustain);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + sustain + decay);
      let node = o;
      if (filter) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = filter; f.Q.value = q;
        o.connect(f); node = f;
      }
      node.connect(g); g.connect(dest);
      o.start(t); o.stop(t + attack + sustain + decay + 0.05);
      return o;
    }
    noise(t, dest, { type = 'highpass', freq = 6000, q = 0.7, vol = 0.2, decay = 0.05 } = {}) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      s.connect(f); f.connect(g); g.connect(dest);
      s.start(t, Math.random() * 0.5);
      s.stop(t + decay + 0.02);
    }

    // ---- instruments (scheduled) -------------------------------------------
    kick(t, dest, vol = 0.9) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.32);
    }
    snare(t, dest, vol = 0.45) {
      this.noise(t, dest, { type: 'bandpass', freq: 1900, q: 0.6, vol, decay: 0.16 });
      this.tone(t, 185, dest, { vol: vol * 0.5, decay: 0.08 });
    }
    hat(t, dest, vol = 0.1) { this.noise(t, dest, { freq: 7500, vol, decay: 0.035 }); }
    bass(t, midi, dur, dest, aggressive) {
      this.tone(t, mtof(midi), dest, {
        type: aggressive ? 'sawtooth' : 'triangle', vol: aggressive ? 0.16 : 0.3,
        decay: dur, filter: aggressive ? 900 : 700, q: aggressive ? 6 : 1,
      });
    }
    pad(t, midis, dur, dest) {
      midis.forEach((m) => this.tone(t, mtof(m), dest, { type: 'triangle', vol: 0.035, attack: 0.15, sustain: Math.max(0, dur - 0.4), decay: 0.25 }));
    }
    click(t, accent, dest) { this.tone(t, accent ? 1760 : 1175, dest, { type: 'sine', vol: 0.22, decay: 0.05 }); }
    // The enemy "voice": a soft pitched cue on every chart note so the rhythm is audible.
    cue(t, midi, isDef, dest, holdDur) {
      if (isDef) {
        this.tone(t, mtof(midi), dest, { type: 'square', vol: 0.05, decay: 0.14, filter: 2400, q: 4 });
        this.tone(t, mtof(midi) * 1.414, dest, { type: 'square', vol: 0.03, decay: 0.1, filter: 3000, q: 4 });
      } else {
        this.tone(t, mtof(midi), dest, { type: 'sine', vol: 0.15, decay: 0.12 });
        this.tone(t, mtof(midi) * 2, dest, { type: 'triangle', vol: 0.04, decay: 0.03 });
      }
      if (holdDur > 0) this.tone(t, mtof(midi), dest, { type: 'triangle', vol: 0.05, attack: 0.05, sustain: holdDur, decay: 0.1 });
    }

    // ---- sound effects (immediate) -------------------------------------------
    get now() { return this.ctx.currentTime + 0.003; }
    sfxHit(judge, midi) {
      const t = this.now;
      this.noise(t, this.sfx, { type: 'bandpass', freq: judge === 'perfect' ? 4200 : 3000, q: 1.2, vol: 0.22, decay: 0.07 });
      this.tone(t, mtof(midi + 12), this.sfx, { vol: judge === 'perfect' ? 0.12 : 0.07, decay: 0.12 });
    }
    sfxParry() {
      const t = this.now;
      this.tone(t, 1568, this.sfx, { type: 'square', vol: 0.06, decay: 0.12, filter: 4000, q: 3 });
      this.tone(t, 2349, this.sfx, { type: 'square', vol: 0.04, decay: 0.16, filter: 5000, q: 3 });
    }
    sfxHurt() {
      const t = this.now;
      const o = this.tone(t, 220, this.sfx, { type: 'sawtooth', vol: 0.16, decay: 0.25, filter: 1200 });
      o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
      this.noise(t, this.sfx, { type: 'lowpass', freq: 900, vol: 0.35, decay: 0.2 });
    }
    sfxMiss() { this.tone(this.now, 130, this.sfx, { vol: 0.12, decay: 0.1 }); }
    sfxWhiff() { this.noise(this.now, this.sfx, { freq: 2500, vol: 0.04, decay: 0.04 }); }
    sfxSpell(len) {
      const t = this.now;
      for (let i = 0; i < Math.min(len, 8); i++) {
        this.tone(t + i * 0.035, mtof(67 + PENT[i]), this.sfx, { type: 'square', vol: 0.05, decay: 0.18, filter: 3500 });
      }
      this.noise(t, this.sfx, { type: 'bandpass', freq: 1200, q: 0.5, vol: 0.2, decay: 0.4 });
    }
    sfxHold() { this.tone(this.now, mtof(84), this.sfx, { type: 'triangle', vol: 0.1, decay: 0.2 }); }
    sfxHeal() { const t = this.now; [76, 83].forEach((m, i) => this.tone(t + i * 0.06, mtof(m), this.sfx, { type: 'sine', vol: 0.08, decay: 0.15 })); }
    sfxUi() { if (this.ctx) this.tone(this.now, 880, this.sfx, { vol: 0.06, decay: 0.05 }); }
    sfxWin() {
      const t = this.now;
      [72, 76, 79, 84, 88].forEach((m, i) => this.tone(t + i * 0.09, mtof(m), this.sfx, { type: 'square', vol: 0.06, decay: i === 4 ? 0.6 : 0.15, filter: 3000 }));
    }
    sfxLose() {
      const t = this.now;
      [64, 60, 57, 52].forEach((m, i) => this.tone(t + i * 0.16, mtof(m), this.sfx, { type: 'sawtooth', vol: 0.08, decay: i === 3 ? 0.7 : 0.2, filter: 1200 }));
    }
  }

  BR.AudioEngine = AudioEngine;
  BR.mtof = mtof;
})();
