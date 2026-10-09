# BeatsRPG

A browser prototype of a rhythm-typing RPG. **The enemy sets the rhythm; your gear decides how you play it.**

You fight pixel-art monsters by hitting notes in time with the music. Every enemy has its own tempo, meter and rhythmic style. Every weapon turns that same rhythm into a different kind of input: one key, letters, whole words, or two hands playing separate voices.

The design brainstorm, including future ideas, audience and roadmap, is in [DESIGN.md](DESIGN.md).

## Play

Open `index.html` in a desktop browser (Chrome, Edge, Firefox or Safari). No install and no build step. You need a physical keyboard; headphones help.

| Key | Action |
|---|---|
| `Enter` | Start / Fight / Retry |
| `1`–`4` | Pick a weapon on the loadout screen |
| `Space`, letters, `F` / `J` | Play notes (depends on weapon) |
| `Esc` | Pause |

- **Cyan/violet circles** are your strikes: hit them to deal damage.
- **Ember diamonds** are enemy blows: hit them to parry, or take damage.
- Long bars are **holds**: keep the key down until the end.

### Weapons

| Weapon | You press | Trade-off |
|---|---|---|
| War Drum | `Space` on every note | Easiest, wide timing, half damage taken, weak hits |
| Rune Blade | The letter on each note (home row) | Balanced; wrong letters are misses |
| Spellbook | Letters that spell words | Hardest to read, biggest damage when a word is cast clean |
| Twin Daggers | `F` (left lane) and `J` (right lane) | Each hand plays one voice, which makes polyrhythms readable; both together = cross strike |

### Foes

| Foe | Rhythm |
|---|---|
| Gloop, Meadow Slime | 84 BPM, 4/4, quarter notes and holds |
| Drumgut, Goblin Drummer | 104 BPM, 4/4, eighth notes and syncopation |
| Sir Rattles, Skeleton Knight | 116 BPM, 3/4 waltz, 3:2 polyrhythm |
| Cindermaw, Ember Dragon | 124 BPM, 4/4, 4:3 polyrhythm, enrages to 140 BPM at half HP |

### Settings

- **Input offset:** if your hits keep showing *LATE*, raise it; if they show *EARLY*, lower it. Bluetooth headphones usually need +100 ms or more.
- **Note cues:** the enemy "sings" each note so you can hear the rhythm.
- **Autoplay demo:** the game plays itself perfectly. Useful for recording pitch videos. You can also open the page with `#autoplay` on the URL.

## Run locally

Double-click `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

It is a static site, so any static host works.

- **GitHub Pages:** repo Settings → Pages → *Deploy from a branch* → pick the branch and `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages:** import the repo with no build command and the root as the publish directory, or drag the folder into Netlify Drop.
- **itch.io:** zip the folder (with `index.html` at the top level) and upload it as an HTML game.

## Project layout

```
index.html      page shell and menus
style.css       menu styling
js/data.js      weapons, trinkets, enemies (rhythm patterns), word lists  <- tune content here
js/chart.js     turns an enemy pattern into notes for the equipped weapon
js/battle.js    timing, judging, damage, battle rendering
js/audio.js     Web Audio synth: drums, bass, note cues, SFX, latency-aware clock
js/sprites.js   pixel-art sprites (as text) and painted backdrops
js/ui.js        loadout, pause and results screens
js/main.js      boot, screen flow, input routing, render loop
promo/          30-second promo video and the page/script that render it
```

### Adding an enemy

Add an entry to `BR.ENEMIES` in `js/data.js`. Patterns are one bar each, in beats from the downbeat:

```js
atk: [
  { a: [0, 1, 2, 3] },                  // four quarter notes
  { a: [0, 1, 2], b: [0, 1.5] },        // 3:2 polyrhythm (voice a vs voice b)
  { a: [2, 3], h: [[0, 2]] },           // a 2-beat hold, then two taps
],
```

Every weapon works with every enemy automatically.
