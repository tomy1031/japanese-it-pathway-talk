// Renders highlights.html frame by frame and encodes ../jitp_highlights.mp4 (+ a poster image).
//   node build.js                       # music made by music.py
//   node build.js --music my-track.mp3  # use your own track instead
// Needs: Playwright (Chromium), ffmpeg, python3 with numpy.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const here = __dirname;
const out = path.join(here, '..', 'jitp_highlights.mp4');
const poster = path.join(here, '..', 'jitp_poster.jpg');
const mi = process.argv.indexOf('--music');
const ownMusic = mi > 0 ? path.resolve(process.argv[mi + 1]) : null;
const FPS = 30;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(here, 'highlights.html') + '?render');
  await page.evaluate(() => FILM.ready());
  const total = await page.evaluate(() => FILM.total);
  const frames = Math.round(total * FPS);

  let music = ownMusic;
  if (!music) {
    music = path.join(os.tmpdir(), 'jitp_music.wav');
    execFileSync('python3', [path.join(here, 'music.py'), String(total), music], { stdio: 'inherit' });
  }

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', music,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-af', `afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5`,
    '-t', total.toFixed(3), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

  // several pages render frames side by side; frames are written to ffmpeg in order
  const WORKERS = 3;
  const pages = [page];
  for (let w = 1; w < WORKERS; w++) {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto('file://' + path.join(here, 'highlights.html') + '?render');
    await p.evaluate(() => FILM.ready());
    pages.push(p);
  }
  const ready = new Map();
  let nextWrite = 0, waiting = null;
  const flush = async () => {
    while (ready.has(nextWrite)) {
      const buf = ready.get(nextWrite); ready.delete(nextWrite);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (nextWrite % 150 === 0) console.log(`frame ${nextWrite} / ${frames}`);
      nextWrite++;
    }
  };
  const kick = () => { if (!waiting && ready.has(nextWrite)) waiting = flush().finally(() => { waiting = null; }); };
  await Promise.all(pages.map(async (p, w) => {
    for (let i = w; i < frames; i += WORKERS) {
      while (i - nextWrite > 60) { kick(); await new Promise(r => setTimeout(r, 20)); } // keep memory small
      await p.evaluate(t => FILM.seek(t), i / FPS);
      ready.set(i, await p.screenshot({ type: 'jpeg', quality: 93 }));
      kick();
    }
  }));
  while (waiting || ready.size) { if (waiting) await waiting; else await flush(); }
  ff.stdin.end();
  await done;

  await page.evaluate(() => FILM.seek(2.6));
  await page.screenshot({ path: poster, type: 'jpeg', quality: 85 });
  await browser.close();
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB', 'and', poster);
})().catch(e => { console.error(e); process.exit(1); });
