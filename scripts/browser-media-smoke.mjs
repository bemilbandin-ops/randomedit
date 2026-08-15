import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  throw new Error('Chrome/Chromium was not found. Set CHROME_PATH or install a Chromium browser.');
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>MEDIA_SMOKE_PENDING</title>
<body>MEDIA_SMOKE_PENDING</body>
<script>
(() => {
  const finish = (message) => {
    document.title = message;
    document.body.textContent = message;
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 54;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');
    if (typeof canvas.captureStream !== 'function') throw new Error('canvas.captureStream unavailable');
    if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder unavailable');

    const mimeType = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((mime) => MediaRecorder.isTypeSupported(mime));
    if (!mimeType) throw new Error('No WebM MediaRecorder MIME type supported');

    const stream = canvas.captureStream(20);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      finish('MEDIA_SMOKE_FAIL:' + (event.error?.message || 'recorder error'));
    });
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      const bytes = chunks.reduce((total, chunk) => total + chunk.size, 0);
      finish(bytes > 0 ? 'MEDIA_SMOKE_OK:' + mimeType + ':' + bytes : 'MEDIA_SMOKE_FAIL:empty recording');
    });

    recorder.start(100);
    let frame = 0;
    const draw = () => {
      context.fillStyle = frame % 2 ? '#fff' : '#000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      frame += 1;
      if (frame >= 12) {
        recorder.requestData();
        recorder.stop();
        return;
      }
      setTimeout(draw, 50);
    };
    draw();
  } catch (error) {
    finish('MEDIA_SMOKE_FAIL:' + (error instanceof Error ? error.message : String(error)));
  }
})();
</script>`;

const directory = mkdtempSync(join(tmpdir(), 'randomedit-media-smoke-'));
const htmlPath = join(directory, 'smoke.html');
writeFileSync(htmlPath, html);

try {
  const chrome = findChrome();
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    '--virtual-time-budget=5000',
    '--dump-dom',
    pathToFileURL(htmlPath).href,
  ], {
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024,
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const success = output.match(/MEDIA_SMOKE_OK:[^<\s]+:\d+/)?.[0];
  if (result.error) throw result.error;
  if (result.status !== 0 || !success) {
    const failure = output.match(/MEDIA_SMOKE_FAIL:[^<\n]+/)?.[0] ?? 'Chrome did not report a completed recording.';
    throw new Error(`${failure}\n${output.slice(-2000)}`);
  }
  console.log(success);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
