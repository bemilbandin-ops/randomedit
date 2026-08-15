import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

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

async function waitForDebugger(port) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const pages = await response.json();
        const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Chrome DevTools endpoint did not become ready.${lastError ? ` ${String(lastError)}` : ''}`);
}

async function connectDebugger(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out connecting to Chrome DevTools.')), 5000);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Chrome DevTools WebSocket connection failed.'));
    }, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });

  return {
    socket,
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timed out waiting for DevTools method ${method}.`));
        }, 12000);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function stopChrome(processHandle) {
  if (processHandle.exitCode !== null) return;
  processHandle.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    delay(2000),
  ]);
  if (processHandle.exitCode !== null) return;
  processHandle.kill('SIGKILL');
  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    delay(2000),
  ]);
}

const expression = String.raw`(async () => {
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
  const stopped = new Promise((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      reject(event.error || new Error('MediaRecorder error'));
    }, { once: true });
    recorder.addEventListener('stop', resolve, { once: true });
  });

  recorder.start(100);
  for (let frame = 0; frame < 20; frame += 1) {
    context.fillStyle = frame % 2 ? '#ffffff' : '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ff00ff';
    context.fillRect(frame % canvas.width, 0, 8, canvas.height);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  recorder.requestData();
  await new Promise((resolve) => setTimeout(resolve, 150));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  return {
    mimeType,
    bytes: chunks.reduce((total, chunk) => total + chunk.size, 0),
    hasCanvasCapture: typeof canvas.captureStream === 'function',
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
  };
})()`;

const chrome = findChrome();
const directory = mkdtempSync(join(tmpdir(), 'randomedit-chrome-profile-'));
const port = 9222;
let stderr = '';
const processHandle = spawn(chrome, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-timer-throttling',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${directory}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
processHandle.stderr.setEncoding('utf8');
processHandle.stderr.on('data', (chunk) => {
  stderr = `${stderr}${chunk}`.slice(-4000);
});

try {
  const debuggerUrl = await waitForDebugger(port);
  const debuggerClient = await connectDebugger(debuggerUrl);
  try {
    await debuggerClient.send('Runtime.enable');
    const result = await debuggerClient.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed.');
    }
    const value = result.result?.value;
    if (!value?.hasCanvasCapture || !value?.hasMediaRecorder || !(value.bytes > 0)) {
      throw new Error(`Browser media smoke failed: ${JSON.stringify(value)}`);
    }
    console.log(`MEDIA_SMOKE_OK:${value.mimeType}:${value.bytes}`);
  } finally {
    debuggerClient.socket.close();
  }
} catch (error) {
  throw new Error(`${error instanceof Error ? error.message : String(error)}\n${stderr}`);
} finally {
  await stopChrome(processHandle);
  try {
    rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch (error) {
    console.warn(`Could not fully remove temporary Chrome profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}
