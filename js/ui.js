// DOM menus: title, loadout, pause and results.
(function () {
  const BR = window.BR;
  const $ = (id) => document.getElementById(id);
  const pips = (n, cls) => `<span class="pips ${cls}">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

  class UI {
    constructor(game) {
      this.g = game;
      this.build();
      this.refresh();
    }

    build() {
      const g = this.g;
      const wl = $('weapon-list');
      BR.WEAPONS.forEach((w, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card weapon'; b.dataset.kind = 'weapon'; b.dataset.id = w.id;
        b.innerHTML = `
          <div class="card-top"><span class="card-name">${w.name}<span class="card-role">${i + 1} · ${w.role}</span></span>
            <span class="keys">${w.keys.slice(0, 4).map((k) => `<kbd>${k}</kbd>`).join('')}${w.keys.length > 4 ? '<kbd>+</kbd>' : ''}</span></div>
          <div class="meters"><span>Damage${pips(w.damage, 'dmg')}</span><span>Difficulty${pips(w.difficulty, 'diff')}</span></div>
          <p>${w.blurb}</p>`;
        wl.appendChild(b);
      });
      const tl = $('trinket-list');
      BR.TRINKETS.forEach((t) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card trinket'; b.dataset.kind = 'trinket'; b.dataset.id = t.id;
        b.innerHTML = `<span class="card-name">${t.name}</span><p>${t.desc}</p>`;
        tl.appendChild(b);
      });
      const el = $('enemy-list');
      BR.ENEMIES.forEach((e, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card foe'; b.dataset.kind = 'enemy'; b.dataset.id = e.id;
        b.innerHTML = `<canvas width="56" height="56" aria-hidden="true"></canvas>
          <div><span class="card-name">${e.name}</span><span class="crown" data-crown="${e.id}"></span>
            <div class="meta">${e.title} · ${e.bpm} BPM · ${e.beats}/4</div>
            <div class="tags">${e.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div></div>`;
        el.appendChild(b);
        const c = b.querySelector('canvas').getContext('2d');
        const spr = BR.Sprites.get(e.sprite);
        const s = Math.floor(48 / Math.max(spr.w, spr.h) * 2) / 2;
        c.imageSmoothingEnabled = false;
        c.save(); c.translate(28, 0); c.scale(-1, 1);
        c.drawImage(spr.canvas, -spr.w * s / 2, 52 - spr.h * s, spr.w * s, spr.h * s);
        c.restore();
        b.title = `Foe ${i + 1}`;
      });
      document.querySelectorAll('.card').forEach((b) => {
        b.addEventListener('click', () => this.select(b.dataset.kind, b.dataset.id));
      });

      $('btn-start').onclick = () => { g.audio.init(); g.audio.sfxUi(); g.show('loadout'); };
      $('btn-fight').onclick = () => g.startBattle();
      $('btn-resume').onclick = () => g.resume();
      $('btn-quit').onclick = () => g.quitBattle();
      $('btn-retry').onclick = () => g.startBattle();
      $('btn-next').onclick = () => g.nextFoe();
      $('btn-loadout').onclick = () => g.quitBattle();

      const s = g.settings;
      const setOff = (v) => { s.offset = Math.max(-200, Math.min(200, v)); $('set-offset').textContent = `${s.offset > 0 ? '+' : ''}${s.offset} ms`; g.persist(); };
      $('off-minus').onclick = () => setOff(s.offset - 5);
      $('off-plus').onclick = () => setOff(s.offset + 5);
      setOff(s.offset);
      $('set-cues').checked = s.cues;
      $('set-cues').onchange = (e) => { s.cues = e.target.checked; g.persist(); };
      $('set-auto').checked = s.autoplay;
      $('set-auto').onchange = (e) => { s.autoplay = e.target.checked; };

      if (window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) {
        $('kbd-note').textContent = 'This prototype needs a physical keyboard. Try it on a laptop or desktop.';
      }
    }

    select(kind, id) {
      this.g.sel[kind] = id;
      this.g.persist();
      this.g.audio.sfxUi();
      this.refresh();
    }

    refresh() {
      const sel = this.g.sel;
      document.querySelectorAll('.card').forEach((b) => b.setAttribute('aria-pressed', String(sel[b.dataset.kind] === b.dataset.id)));
      document.querySelectorAll('[data-crown]').forEach((c) => { c.textContent = this.g.beaten.has(c.dataset.crown) ? '★ BEATEN' : ''; });
      const w = this.g.weapon(), t = this.g.trinket(), e = this.g.enemy();
      $('lo-summary').innerHTML = `<b>${w.name}</b> vs <b>${e.name}</b> (${e.bpm} BPM, ${e.beats}/4). ${w.hint}${t.id !== 'none' ? ` <b>${t.name}:</b> ${t.desc}` : ''}`;
    }

    show(screen) {
      for (const s of ['title', 'loadout', 'pause', 'results']) $('screen-' + s).hidden = s !== screen;
      if (screen === 'loadout') this.refresh();
    }

    fillResults(b) {
      const r = b.results();
      const card = document.querySelector('.results');
      card.classList.toggle('won', r.won);
      card.classList.toggle('lost', !r.won);
      $('res-foe').textContent = `${b.W.name} vs ${b.E.name} · ${b.E.title}`;
      $('res-title').textContent = r.won ? 'Victory' : 'Defeated';
      $('res-grade').textContent = r.grade;
      const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      const rows = [
        ['perfect', 'Perfect', r.perfect], ['great', 'Great', r.great], ['good', 'Good', r.good], ['miss', 'Miss', r.miss],
        ['', 'Accuracy', Math.round(r.acc * 100) + '%'], ['', 'Max combo', r.maxCombo], ['', 'Damage dealt', r.dealt], ['', 'Damage taken', r.taken],
      ];
      if (b.mode === 'spell') rows.push(['', 'Words cast', r.cast], ['', 'Fizzled', r.fizzled]);
      if (b.mode === 'twin') rows.push(['', 'Cross strikes', r.cross]);
      rows.push(['', 'Parries', r.parry], ['', 'Time', mmss(r.time)]);
      $('res-stats').innerHTML = rows.map(([cls, k, v]) => `<div class="${cls}"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      const idx = BR.ENEMIES.findIndex((e) => e.id === b.E.id);
      $('btn-next').hidden = !(r.won && idx < BR.ENEMIES.length - 1);
    }
  }

  BR.UI = UI;
})();
