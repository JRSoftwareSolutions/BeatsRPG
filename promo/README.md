# Promo video

`beatsrpg-ad.mp4` is a 31-second ad for BeatsRPG (1920×1080, 60 fps, stereo, normalised to about -14 LUFS for video platforms). `beatsrpg-ad-poster.png` is its end card, for use as a thumbnail.

It deliberately names no website or host, so it stays valid if the game moves. Put the link in the post text or description instead.

## What's in it

| Time | Shot |
|---|---|
| 0:00 | Cold open on the slime's count-in: "EVERY FIGHT IS A SONG." |
| 0:03 | War Drum vs Gloop: "ONE KEY." |
| 0:06 | Rune Blade vs Drumgut: "LETTERS." |
| 0:10 | Spellbook vs Sir Rattles: "WHOLE WORDS." |
| 0:15 | Twin Daggers vs Cindermaw (enraged): "TWO HANDS." |
| 0:19 | "THE FOE SETS THE RHYTHM. YOUR GEAR DECIDES HOW YOU PLAY IT." |
| 0:24 | Victory |
| 0:26 | End card: BeatsRPG, FREE TO PLAY, right in your browser, no download, no sign-up |

All footage and sound are the real game, played by its autoplay. The tempo climbs from 84 to 140 BPM across the cut.

## Re-rendering

`ad.html` is the ad itself. Open it in a browser and press Play to watch it live. `ad.js` directs it: which fight is on screen, when to cut, and the captions.

To render the MP4 again (after changing the game or the captions), you need Node, Playwright and ffmpeg:

```sh
npm i -g playwright         # or set NODE_PATH to an existing install
node promo/render.js        # writes promo/beatsrpg-ad.mp4 (about 5 minutes)
node promo/render.js --stills 3,12,20   # quick PNG stills at those seconds
```

The renderer runs on virtual time (an OfflineAudioContext is the clock) and seeds the game's randomness, so every render comes out the same and never drops frames.
