import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Use real elapsed time for media decoding; virtual-time screenshots can stop before seek completes.
const directory = path.dirname(fileURLToPath(import.meta.url));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wellisha-media-review-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket; let sequence = 0; const pending = new Map();
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(200);
  if (!fs.existsSync(portFile)) throw new Error('Chrome did not expose its local debugging endpoint');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data); const handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result); }
  };
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  await call('Page.enable', {}, sessionId);
  await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1160, deviceScaleFactor: 1, mobile: false }, sessionId);
  await call('Page.navigate', { url: pathToFileURL(path.join(directory, 'video-review.html')).href }, sessionId);
  let report;
  for (let i = 0; i < 80; i++) {
    await pause(500);
    const response = await call('Runtime.evaluate', { expression: '({frames: document.querySelectorAll("canvas").length, status: document.getElementById("status")?.textContent})', returnByValue: true }, sessionId);
    report = response.result.value;
    if (report?.frames === 4) break;
  }
  const capture = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
  fs.writeFileSync(path.join(directory, 'video-review.png'), Buffer.from(capture.data, 'base64'));
  console.log(JSON.stringify(report));
  await call('Browser.close');
  if (report?.frames !== 4) throw new Error('Not all video sample frames decoded');
} finally {
  socket?.close();
  if (chrome.exitCode === null) chrome.kill();
}
