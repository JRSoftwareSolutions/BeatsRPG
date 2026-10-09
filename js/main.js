// Boot, screen flow, keyboard routing and the render loop.
(function () {
  const BR = window.BR;
  const STORE = 'beatsrpg.v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
  const save = (d) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* storage unavailable */ } };
  const byId = (list, id) => list.find((x) => x.id === id) || list[0];

  class Game {
    constructor() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.stage = document.getElementById('stage');
      this.audio = new BR.AudioEngine();
      const saved = load();
      this.settings = { offset: 0, cues: true, ...(saved.settings || {}), autoplay: false };
      if (/[?&#]autoplay\b/.test(location.search + location.hash)) this.settings.autoplay = true;
      this.sel = { weapon: 'rune', trinket: 'none', enemy: 'slime', ...(saved.sel || {}) };
      this.beaten = new Set(saved.beaten || []);
      this.screen = 'title';
      this.battle = null;
      this.ui = new BR.UI(this);
      this.ui.show('title');

      addEventListener('resize', () => this.fit());
      this.fit();
      addEventListener('keydown', (e) => this.onKeyDown(e));
      addEventListener('keyup', (e) => { if (this.battle && this.screen === 'battle') this.battle.onKeyUp(e); });
      addEventListener('blur', () => this.pause());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });

      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    weapon() { return byId(BR.WEAPONS, this.sel.weapon); }
    trinket() { return byId(BR.TRINKETS, this.sel.trinket); }
    enemy() { return byId(BR.ENEMIES, this.sel.enemy); }
    persist() { save({ settings: { offset: this.settings.offset, cues: this.settings.cues }, sel: this.sel, beaten: [...this.beaten] }); }

    fit() {
      const s = Math.min(innerWidth / 960, innerHeight / 540);
      this.stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    }

    show(screen) {
      this.screen = screen;
      this.ui.show(screen === 'battle' ? null : screen);
    }

    startBattle() {
      this.audio.init();
      if (!this.audio.ctx) return;
      if (this.battle) this.audio.killBus(this.battle.bus, 0.1);
      const go = () => {
        this.battle = new BR.Battle(this, { enemy: this.enemy(), weapon: this.weapon(), trinket: this.trinket(), settings: this.settings });
        this.battle.start();
        this.show('battle');
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      };
      if (this.audio.ctx.state !== 'running') this.audio.ctx.resume().then(() => { this.audio.offset = null; go(); });
      else go();
    }

    nextFoe() {
      const i = BR.ENEMIES.findIndex((e) => e.id === this.sel.enemy);
      this.sel.enemy = BR.ENEMIES[Math.min(BR.ENEMIES.length - 1, i + 1)].id;
      this.persist();
      this.startBattle();
    }

    pause() {
      const b = this.battle;
      if (this.screen !== 'battle' || !b || b.state !== 'play' || b.paused) return;
      b.paused = true;
      this.audio.holdSuspended = true;
      this.audio.ctx.suspend();
      this.show('pause');
    }

    resume() {
      const b = this.battle;
      if (!b || !b.paused) return;
      this.show('battle');
      this.audio.holdSuspended = false;
      this.audio.ctx.resume().then(() => {
        this.audio.offset = null;
        b.paused = false;
      });
    }

    quitBattle() {
      if (this.battle) this.audio.killBus(this.battle.bus, 0.15);
      this.audio.holdSuspended = false;
      if (this.audio.ctx && this.audio.ctx.state === 'suspended') this.audio.ctx.resume();
      this.battle = null;
      this.show('loadout');
    }

    showResults(b) {
      if (b !== this.battle) return;
      if (b.won) { this.beaten.add(b.E.id); this.persist(); }
      this.ui.fillResults(b);
      this.show('results');
    }

    onKeyDown(e) {
      // Enter on a focused menu button activates that button, except selection cards.
      const onButton = e.target && e.target.tagName === 'BUTTON' && !e.target.classList.contains('card');
      const k = e.key;
      if (this.screen === 'battle' && this.battle) {
        if (k === 'Escape') { e.preventDefault(); this.pause(); return; }
        this.battle.onKeyDown(e);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (this.screen === 'title') {
        if (k === 'Enter' && !onButton) { e.preventDefault(); document.getElementById('btn-start').click(); }
      } else if (this.screen === 'loadout') {
        if (k === 'Enter' && !onButton) { e.preventDefault(); this.startBattle(); }
        else if (/^[1-4]$/.test(k)) this.ui.select('weapon', BR.WEAPONS[+k - 1].id);
        else if (k === 'Escape') this.show('title');
      } else if (this.screen === 'pause') {
        if (k === 'Escape' || (k === 'Enter' && !onButton)) { e.preventDefault(); this.resume(); }
        else if (k === 'q' || k === 'Q') this.quitBattle();
      } else if (this.screen === 'results') {
        if (k === 'r' || k === 'R' || (k === 'Enter' && !onButton)) { e.preventDefault(); this.startBattle(); }
        else if ((k === 'n' || k === 'N') && !document.getElementById('btn-next').hidden) this.nextFoe();
        else if (k === 'l' || k === 'L' || k === 'Escape') this.quitBattle();
      }
    }

    loop(t) {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.audio.sync();
      const x = this.ctx;
      x.setTransform(2, 0, 0, 2, 0, 0);
      x.imageSmoothingEnabled = false;
      if (this.battle) {
        this.battle.update(dt);
        this.battle.render(x);
      } else {
        this.renderDiorama(x, t / 1000);
      }
      requestAnimationFrame((tt) => this.loop(tt));
    }

    // Idle scene behind the menus: hero and the selected foe bobbing at 90 BPM.
    renderDiorama(x, secs) {
      const e = this.enemy();
      x.fillStyle = '#130f22'; x.fillRect(0, 0, 960, 540);
      x.drawImage(BR.Scenes.get(e.scene), 0, 0, 960, 300);
      const pulse = Math.exp(-((secs * 1.5) % 1) * 7);
      BR.drawActor(x, 'hero', { x: 600, y: 262, lunge: 0, hurt: 0, flash: 0, dead: 0 }, 1, pulse, false);
      BR.drawActor(x, e.sprite, { x: 820, y: 262, lunge: 0, hurt: 0, flash: 0, dead: 0 }, -1, pulse, false);
    }
  }

  const boot = () => { window.game = new Game(); };
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all(['20px "Jersey 10"', '20px "Pixelify Sans"', 'bold 20px Silkscreen'].map((f) => document.fonts.load(f))).catch(() => {})
    : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(boot);
})();
