// Turns an enemy's bar pattern into playable notes for the equipped weapon.
// The enemy decides WHEN notes happen; this file decides WHAT you press.
(function () {
  const BR = window.BR;
  const EPS = 1e-4;

  // Pattern {a, b, h} -> flat list of {beat, voice, len}
  function rawNotes(p) {
    const out = [];
    (p.a || []).forEach((beat) => out.push({ beat, voice: 0, len: 0 }));
    (p.b || []).forEach((beat) => out.push({ beat, voice: 1, len: 0 }));
    (p.h || []).forEach((h) => out.push({ beat: h[0], len: h[1], voice: h[2] || 0 }));
    out.sort((x, y) => x.beat - y.beat || x.voice - y.voice);
    return out;
  }

  // One-lane weapons hear both voices merged into a single composite rhythm.
  // Twin Daggers keeps the voices apart, one per hand; single-voice charts
  // are split by alternating hands.
  function assignLanes(raw, lanes) {
    let out;
    if (lanes === 1) {
      out = [];
      for (const n of raw) {
        const prev = out[out.length - 1];
        if (prev && Math.abs(prev.beat - n.beat) < EPS) { prev.len = Math.max(prev.len, n.len); continue; }
        out.push({ ...n, lane: 0 });
      }
    } else if (raw.some((n) => n.voice === 1)) {
      out = raw.map((n) => ({ ...n, lane: n.voice }));
    } else {
      let i = -1, last = null;
      out = raw.map((n) => {
        if (last === null || Math.abs(n.beat - last) > EPS) { i++; last = n.beat; }
        return { ...n, lane: i % 2 };
      });
    }
    // Drop duplicates and notes that would start inside a hold on the same lane.
    const res = [];
    const holdEnd = [-1, -1];
    const seen = new Set();
    for (const n of out) {
      const key = n.lane + ':' + n.beat.toFixed(3);
      if (seen.has(key) || n.beat < holdEnd[n.lane] - EPS) continue;
      seen.add(key);
      res.push(n);
      if (n.len > 0) holdEnd[n.lane] = n.beat + n.len;
    }
    // Simultaneous notes on both lanes form a chord (cross strike for daggers).
    for (const n of res) {
      if (n.lane !== 0) continue;
      const partner = res.find((m) => m.lane === 1 && Math.abs(m.beat - n.beat) < EPS);
      if (partner) { n.partner = partner; partner.partner = n; }
    }
    return res;
  }

  // Split N notes into words of at most 8 letters.
  function chunk(n) {
    if (n <= 0) return [];
    const k = Math.ceil(n / 8);
    const base = Math.floor(n / k), extra = n % k;
    const out = [];
    for (let i = 0; i < k; i++) out.push(base + (i < extra ? 1 : 0));
    return out;
  }

  function assignKeys(notes, battle, bar) {
    const mode = battle.mode;
    if (mode === 'drum') {
      notes.forEach((n) => { n.key = ' '; n.label = ''; });
    } else if (mode === 'twin') {
      notes.forEach((n) => { n.key = n.lane === 0 ? 'f' : 'j'; n.label = n.key.toUpperCase(); });
    } else if (mode === 'rune') {
      const pool = battle.W.pool;
      notes.forEach((n) => {
        let k;
        do { k = pool[Math.floor(Math.random() * pool.length)]; } while (k === battle.lastRune && pool.length > 1);
        battle.lastRune = k;
        n.key = k; n.label = k.toUpperCase();
      });
    } else if (mode === 'spell') {
      let idx = 0;
      for (const size of chunk(notes.length)) {
        const text = battle.pickWord(size, bar.type);
        const word = { text, notes: [], misses: 0, type: bar.type, done: false, result: null };
        battle.words.push(word);
        for (let i = 0; i < size; i++) {
          const n = notes[idx++];
          n.key = text[i]; n.label = text[i].toUpperCase(); n.word = word;
          word.notes.push(n);
        }
      }
    }
  }

  BR.Chart = { rawNotes, assignLanes, assignKeys, chunk };
})();
