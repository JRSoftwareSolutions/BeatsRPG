// Renders promo/ad.html to an MP4, frame by frame, with the game's own audio.
//
//   node promo/render.js                       -> promo/beatsrpg-ad.mp4 (1920x1080, 60 fps)
//   node promo/render.js --out my.mp4 --fps 30
//   node promo/render.js --stills 1.5,4,12     -> PNG stills at those times, no video
//
// Needs Playwright (npm i -g playwright, or NODE_PATH pointing at it) and ffmpeg.
// Time is virtual: an OfflineAudioContext is the clock, so the result is identical
// on every run and never drops frames, however slow the machine.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const fps = +arg('fps', 60);
const outFile = path.resolve(arg('out', path.join(__dirname, 'beatsrpg-ad.mp4')));
const stills = arg('stills', null);

function run(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'inherit'], ...opts });
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`)))));
  return { p, done };
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('file://' + path.join(__dirname, 'ad.html') + '?render');
  await page.evaluate((f) => window.AD.init({ fps: f }), fps);

  const shot = () => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });

  if (stills) {
    const want = stills.split(',').map(Number).sort((a, b) => a - b);
    let t = 0;
    for (const w of want) {
      while (t < w) ({ t } = await page.evaluate(() => window.AD.step()));
      const f = path.join(path.dirname(outFile), `still-${w.toFixed(2)}.png`);
      fs.writeFileSync(f, await shot());
      console.log('wrote', f);
    }
    await browser.close();
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beatsrpg-ad-'));
  const video = path.join(tmp, 'video.mp4');
  const enc = run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', video]);
  enc.p.stdin.write(await shot());
  let n = 1;
  for (;;) {
    const { t, end } = await page.evaluate(() => window.AD.step());
    enc.p.stdin.write(await shot());
    n++;
    if (n % fps === 0) process.stdout.write(`\r${t.toFixed(1)} s`);
    if (end) break;
  }
  enc.p.stdin.end();
  await enc.done;
  const wav = path.join(tmp, 'audio.wav');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.AD.finish()), 'base64'));
  await browser.close();

  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a',
    // Limit the drum transients, normalise to -14 LUFS (what most video platforms play at), fade the tail.
    '-af', `alimiter=level_in=3:limit=0.7:attack=3:release=60:level=disabled,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${(n / fps - 0.8).toFixed(2)}:d=0.8`, '-ar', '48000',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile]).done;
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nwrote ${outFile} (${n} frames)`);
})().catch((e) => { console.error(e); process.exit(1); });
