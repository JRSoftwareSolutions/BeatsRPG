# BeatsRPG: design brainstorm

**One line:** a fantasy RPG where every fight is a song. The enemy sets the rhythm. Your gear decides what your hands do with it.

**Reference points:** *Typing of the Dead* (typing as combat), *Crypt of the NecroDancer* (an RPG locked to the beat), *Rhythm Heaven* (readable, funny rhythm patterns), *Slay the Spire* (build-crafting between fights), typing trainers like TypingClub and Nitro Type (an audience that already types for fun).

---

## 1. The core rule: rhythm and verb are separate

Most rhythm games bake input into the chart: a note *is* a key. BeatsRPG splits these apart:

| Layer | Owned by | Decides |
|---|---|---|
| **Rhythm** | Enemy | When things happen: tempo, meter, subdivision, syncopation, polyrhythm, holds, attack/defend phrasing |
| **Verb** | Gear | What you press: one key, a letter, a word, two hands, a chord, a hold |
| **Twist** | Trinkets | Rules on top: wider windows, lifesteal, bigger combos, risk/reward |

Why it matters:

- **Content multiplies.** 10 enemies × 6 weapons gives 60 distinct fights from 16 pieces of content. The prototype already does this: the four weapons play the same enemy chart in four different ways.
- **Difficulty is player-owned.** The same boss can be fought on the War Drum (one key, forgiving) or the Spellbook (full words, high damage). Players pick their challenge through loot, not a menu.
- **Gear can solve rhythm problems.** Twin Daggers give each hand one voice of a polyrhythm, so a 3:2 that is hard on one key becomes two simple pulses. This is a "the right tool for this enemy" decision, which is the RPG part.

---

## 2. Verbs (input modes)

Built in the prototype:

| Weapon | Input | Damage | Difficulty | Feel |
|---|---|---|---|---|
| **War Drum** | SPACE on every note | Low | Very easy | Tank. Wide windows, half damage from missed blocks |
| **Rune Blade** | The letter shown on each note (home row) | Medium | Medium | Sight-reading. Wrong letters count as misses |
| **Spellbook** | Notes spell real words, one letter per note | High | Hard | Typing as spellcasting. A clean word is *cast*, with bonus damage |
| **Twin Daggers** | F lane (left hand) + J lane (right hand) | Medium-high | Hard on polyrhythms | Each hand owns one voice. Simultaneous hits give a cross strike |

Holds already exist in enemy charts (hold the key for the note's length). They mean different things per weapon: sustaining a drum roll, holding a rune, holding a guard.

Brainstormed and not built yet:

- **Longbow (hold and release).** Hold to draw, release *on* the beat. Rewards releases, which most rhythm games ignore.
- **Chord Gauntlets.** Notes ask for 2–3 keys at once (`D+K`, `S+L`). Close to piano chords; very readable on a QWERTY layout.
- **Lute.** Keyboard rows are pitches. The enemy hums a melody and you play it back. A natural bridge to music-education partners.
- **Morse Staff.** Short and long presses spell letters as dots and dashes. Slow and cryptic: a puzzle weapon.
- **Incantation Tome.** Whole phrases across several bars ("by fire and frost"), typed on eighth notes, including spaces. The endgame version of the Spellbook.
- **Echo Mirror (call and response).** The enemy plays a bar you only *hear*, then you repeat it from memory. Built on the existing chart format by hiding notes in the "call" bar.
- **Whip.** Strict left/right alternation (left hand row, right hand row). Trains alternating hands, like a drummer's sticking.
- **Shield-only off-hand.** Defend bars use a separate key set from attack bars, so you can mix two weapons in one loadout.

**Semantic words:** in Spellbook mode the word itself could matter. Casting `FROST` slows the enemy's tempo for a bar, `FIRE` burns, `HEAL` restores HP. Typing becomes vocabulary-driven tactics, and word packs become collectible loot.

---

## 3. Enemy rhythm language

Each enemy is a small rhythm "personality", built from these knobs (all of them exist in the prototype's data format):

- **Tempo:** a slow slime at 84 BPM, a goblin at 104, an enraged dragon at 140.
- **Meter:** a skeleton knight that fights in 3/4 waltz time. Later: 5/4 and 7/8 for late-game fae creatures.
- **Subdivision and syncopation:** off-beats and pickup notes.
- **Polyrhythm:** 3:2 (Skeleton) and 4:3 (Dragon) as two voices.
- **Phrasing:** an Attack/Defend sequence per enemy (`AADAD`). An aggressive enemy has more D bars.
- **Telegraphs:** a "!" and a flashing wind-up one bar before a Defend bar.
- **Phases:** the Dragon enrages at half HP, with a faster tempo and a more aggressive sequence.

More enemy ideas:

- **Bard Mimic:** copies *your* last bar and plays it back as its attack.
- **Clockwork Golem:** perfectly metronomic, but speeds up every bar until you stagger it.
- **Drunk Ogre:** swing rhythm with lazy, late beats.
- **Wraith:** notes fade out before reaching the line, so you have to feel the pulse.
- **Twin Harpies:** two enemies, two voices; kill one and the polyrhythm simplifies.
- **Lich conductor:** changes tempo mid-bar (ritardando and accelerando).

---

## 4. Combat loop

The current prototype loop:

1. Count-in (2 bars) so the player locks onto the tempo.
2. **Attack bars:** hit notes to deal damage. Damage = weapon base × timing (Perfect 1.0 / Great 0.75 / Good 0.45) × combo multiplier (up to ×2).
3. **Defend bars:** ember notes are enemy blows. Hit them to parry (a Perfect parry counter-attacks); miss and you take the enemy's power as damage.
4. The fight ends when either HP bar empties. Results show a grade and timing stats.

Ideas to deepen it:

- **Stamina/Focus meter:** filled by perfects and spent on a weapon special (Spellbook: a free word; Drum: a shield bar).
- **Status effects on the tempo itself:** Slow (−10 BPM), Haste (+10), Stagger (enemy skips a bar).
- **Weak points:** certain notes (gold) deal triple damage but have a tight window.
- **Parry chains:** a perfect Defend bar triggers a counter bar with bonus damage.

---

## 5. Build and progression

- **Loadout = weapon + trinket(s) + armor.** Armor could own the defence verb, separate from the attack verb.
- **Trinkets (prototype):** Metronome Charm (+25% window, −15% damage), Vampire Fang (heal on Perfect), Berserker Band (+50% dealt and taken), Echo Stone (×3 combo cap, misses hurt).
- **Run structure:** a Slay-the-Spire-style map. Pick a path of fights, shops and events; loot changes your verbs and playstyle mid-run. Unlocks carry between runs.
- **Mastery:** per-enemy grades, per-weapon mastery tracks, daily seeded runs with leaderboards.
- **Word packs:** themed or language-specific vocabularies (Spanish, German, coding keywords, SAT vocab). This is the main hook for an education partner.

---

## 6. Audience and positioning

Three overlapping audiences:

1. **Rhythm game players:** want tight timing, good music, mastery.
2. **Typing-game and typing-trainer players:** a large, often younger audience that already types for fun and score; classrooms included.
3. **Roguelike and RPG players:** want builds, loot and runs.

The gear-defines-verb idea is the bridge between them: a typist picks the Spellbook, a rhythm player picks Twin Daggers, a casual player picks the War Drum, and all three fight the same dragon.

Possible partner angles: an indie publisher (rhythm/roguelike), a music label or composer (one enemy per track), an ed-tech typing platform (word packs, classroom mode), streamers (spectator-friendly fights, a "chat picks the word pack" mode).

---

## 7. Accessibility

- Input/audio latency offset (in the prototype) plus a tap-to-calibrate screen.
- Shape coding as well as colour (circles strike, diamonds defend; already in place).
- Assist trinkets as a design tool (the Metronome Charm is one).
- Remappable keys and non-QWERTY layouts (AZERTY, Dvorak). Rune pools should follow the active layout's home row.
- A one-hand mode (War Drum already works this way).

---

## 8. Tech notes (prototype)

- **Zero dependencies, no build step.** Plain HTML/CSS/JS. It deploys to any static host and opens straight from disk.
- **The audio clock is the source of truth.** Notes are scheduled on the Web Audio clock. Key presses are converted from `event.timeStamp` to "audio being heard right now" using `AudioContext.getOutputTimestamp()`, so output latency is accounted for. A user offset handles input latency.
- **Procedural everything.** Music, sound effects, sprites and backdrops are generated in code, so there are no asset licences to clear for the pitch.
- **Data-driven content.** Enemies, weapons, trinkets and word lists live in `js/data.js`. A new enemy is roughly 20 lines.

Next technical steps for a vertical slice:

- Real composed tracks with beat-mapped charts, and a small chart editor (tap along to a track to record a pattern).
- Moving the chart format to MIDI import, so composers can author enemy rhythms in a DAW.
- Proper sprite sheets and animation, hit-stop, and camera work.
- Telemetry on timing error per player for automatic calibration and difficulty tuning.

---

## 9. What the prototype proves, and what it doesn't

**Proves:**
- The same enemy chart plays very differently across four verbs.
- Typing real words on a beat is readable and satisfying once words fit the rhythm.
- Polyrhythms become approachable when gear splits voices across hands.
- Attack/Defend phrasing creates tension without extra systems.

**Doesn't prove yet:**
- Long-term retention (needs the run/meta layer).
- Music quality (the procedural soundtrack is a placeholder).
- Balance across a full roster.
- Feel on high-latency setups (Bluetooth audio needs calibration).

## 10. Open questions

- Should Defend bars use the same verb as Attack bars, or should armor own its own verb?
- How far should words matter (cosmetic → damage → tactical effects)?
- Fixed hand-authored charts per enemy, or generated variations within an enemy's "style"?
- Is the core loop a run-based roguelike, a story campaign, or a level-select arcade?
