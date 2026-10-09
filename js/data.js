// Game content: weapons (how you play the rhythm), trinkets (modifiers),
// enemies (the rhythm itself) and the word lists the Spellbook draws from.
window.BR = window.BR || {};

// A weapon is an input mode. The enemy's chart is the same for every weapon;
// the weapon decides which key each note asks for and what a hit is worth.
BR.WEAPONS = [
  {
    id: 'drum', name: 'War Drum', mode: 'drum', role: 'Tank',
    keys: ['Space'], base: 4, windowMul: 1.35, defMul: 0.5,
    damage: 1, difficulty: 1,
    blurb: 'Tap SPACE on every note. Wide timing, blocks take half damage, but hits are weak.',
    hint: 'Press SPACE as each note reaches the line.',
  },
  {
    id: 'rune', name: 'Rune Blade', mode: 'rune', role: 'Duelist',
    keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L'], base: 6, windowMul: 1.0, defMul: 1,
    pool: 'asdfjkl', damage: 2, difficulty: 2,
    blurb: 'Each note carries a home-row letter. Press it on the beat. Wrong letters count as misses.',
    hint: 'Press the letter on each note as it reaches the line.',
  },
  {
    id: 'spell', name: 'Spellbook', mode: 'spell', role: 'Caster',
    keys: ['W', 'O', 'R', 'D'], base: 3, wordBonus: 5, windowMul: 1.0, defMul: 1,
    damage: 4, difficulty: 3,
    blurb: 'Notes spell real words. Type them in rhythm; a clean word is cast as a spell.',
    hint: 'Type the word, one letter per note, on the beat.',
  },
  {
    id: 'twin', name: 'Twin Daggers', mode: 'twin', role: 'Rogue',
    keys: ['F', 'J'], base: 5, crossMul: 1, windowMul: 0.9, defMul: 1,
    damage: 3, difficulty: 3,
    blurb: 'Left hand F, right hand J, one voice each, so polyrhythms split cleanly. Both at once: cross strike.',
    hint: 'Top lane is F (left hand). Bottom lane is J (right hand).',
  },
];

BR.TRINKETS = [
  { id: 'none', name: 'No trinket', desc: 'Nothing equipped.' },
  { id: 'metronome', name: 'Metronome Charm', desc: 'Timing windows +25%. Damage dealt -15%.', windowMul: 1.25, dmgMul: 0.85 },
  { id: 'fang', name: 'Vampire Fang', desc: 'Every PERFECT heals 1 HP.', healOnPerfect: 1 },
  { id: 'berserk', name: 'Berserker Band', desc: 'Damage dealt +50%. Damage taken +50%.', dmgMul: 1.5, takenMul: 1.5 },
  { id: 'echo', name: 'Echo Stone', desc: 'Combo bonus caps at x3 instead of x2. Missed strikes cost 2 HP.', comboCap: 3, missPenalty: 2 },
];

// Enemy charts. Each pattern is one bar, in beats from the bar's downbeat:
//   a: voice A taps   b: voice B taps   h: holds as [beat, lengthInBeats, voice]
// `seq` decides the order of Attack (A) and Defend (D) bars, and loops.
// `power` is the damage each missed Defend note deals to you.
BR.ENEMIES = [
  {
    id: 'slime', name: 'Gloop', title: 'Meadow Slime', sprite: 'slime', scene: 'meadow',
    bpm: 84, beats: 4, hp: 260, power: 6, seq: 'AAD',
    tags: ['Quarter notes', 'Holds'],
    music: { root: 40, prog: [0, 0, 5, 3] },
    atk: [
      { a: [0, 1, 2, 3] },
      { a: [0, 2, 3] },
      { a: [0, 1, 2] },
      { a: [2, 3], h: [[0, 2]] },
      { a: [0, 1, 2, 2.5] },
    ],
    def: [
      { a: [0, 2] },
      { a: [1, 3] },
      { a: [0, 1, 2, 3] },
      { a: [3], h: [[0, 2]] },
    ],
  },
  {
    id: 'goblin', name: 'Drumgut', title: 'Goblin Drummer', sprite: 'goblin', scene: 'forest',
    bpm: 104, beats: 4, hp: 480, power: 9, seq: 'AADAD',
    tags: ['Eighth notes', 'Syncopation'],
    music: { root: 45, prog: [0, 3, 5, 3] },
    atk: [
      { a: [0, 0.5, 1, 2, 2.5, 3] },
      { a: [0, 1, 1.5, 2.5, 3] },
      { a: [0, 1.5, 2, 3, 3.5] },
      { a: [0, 1, 2, 3], b: [0.5, 1.5, 2.5, 3.5] },
      { a: [0.5, 1, 1.5, 2.5, 3] },
    ],
    def: [
      { a: [0, 0.5, 1, 2, 3] },
      { a: [0, 1.5, 3] },
      { a: [0, 1, 2, 2.5, 3] },
      { a: [0, 2], b: [1, 1.5, 3] },
    ],
  },
  {
    id: 'skeleton', name: 'Sir Rattles', title: 'Skeleton Knight', sprite: 'skeleton', scene: 'crypt',
    bpm: 116, beats: 3, hp: 600, power: 11, seq: 'AADAAD',
    tags: ['3/4 waltz', '3:2 polyrhythm'],
    music: { root: 38, prog: [0, 5, 3, 7] },
    atk: [
      { a: [0, 1, 2], b: [0, 1.5] },
      { a: [0, 1, 2] },
      { a: [0, 1, 2], b: [0, 1.5] },
      { a: [0, 0.5, 1, 2] },
      { a: [0, 1, 2], b: [0.5, 1.5, 2.5] },
    ],
    def: [
      { a: [0, 1, 2] },
      { b: [0, 1.5] },
      { a: [0, 2], b: [0, 1.5] },
      { a: [2], h: [[0, 1.5, 1]] },
    ],
  },
  {
    id: 'dragon', name: 'Cindermaw', title: 'Ember Dragon', sprite: 'dragon', scene: 'volcano',
    bpm: 124, beats: 4, hp: 1000, power: 13, seq: 'AADAD',
    enrage: { bpm: 140, seq: 'ADAD' },
    tags: ['4:3 polyrhythm', 'Enrages at half HP'],
    music: { root: 41, prog: [0, 1, 0, 7] },
    atk: [
      { a: [0, 1, 2, 3], b: [0, 4 / 3, 8 / 3] },
      { a: [0, 0.5, 1, 2, 2.5, 3] },
      { a: [0, 1, 1.5, 2, 3, 3.5] },
      { a: [2, 2.5, 3], b: [3.5], h: [[0, 1.5, 0]] },
      { a: [0, 1, 2, 3], b: [0.5, 1.5, 2.5, 3.5] },
    ],
    def: [
      { a: [0, 0.5, 1, 1.5, 2, 3] },
      { a: [0, 2], b: [0, 4 / 3, 8 / 3] },
      { a: [0, 1, 2, 3] },
      { h: [[0, 1.5, 0], [2, 1.5, 1]] },
    ],
  },
];

// Spellbook vocabulary, bucketed by length so a phrase of N notes gets an N-letter word.
BR.WORDS = {
  atk: [
    'a o i',
    'go up ax ox oh yo',
    'axe orb hex ice zap bow sun ash cut jab fog imp rot war',
    'fire bolt rune gale mist fang doom glow star wind claw rage void moon burn gust hail wave',
    'frost storm flame blaze spark stone thorn quake light smite curse ember shock blade venom comet surge',
    'shadow meteor cinder frenzy vortex strike banish spirit blight aurora plasma tremor lancer scorch',
    'thunder inferno glacier tempest cyclone phoenix eclipse radiant typhoon torrent javelin',
    'blizzard starfall moonbeam sunburst hellfire rockfall firewall overload',
  ],
  def: [
    'o',
    'no up',
    'bar dip nix hug end',
    'ward duck halt hold wall hide stop dash',
    'block guard parry dodge brace cover evade stand repel',
    'shield defend resist escape harden buffer',
    'bulwark bastion rampart deflect protect barrier',
    'fortress sentinel unbroken stalwart',
  ],
};
for (const kind of ['atk', 'def']) {
  const byLen = {};
  BR.WORDS[kind].join(' ').split(/\s+/).forEach((w) => {
    (byLen[w.length] = byLen[w.length] || []).push(w);
  });
  BR.WORDS[kind] = byLen;
}
