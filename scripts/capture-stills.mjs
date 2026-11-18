// 抓取宣传片用的高清静帧（CPU 渲染下比录制视频可靠）。
import { writeFile, mkdir, rm } from 'node:fs/promises';

const PORT = '9333';
const URL = 'http://127.0.0.1:4173/';
const OUT = 'report/video/stills';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  return res.json();
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 1;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = id++;
    pending.set(mid, { resolve, reject });
    socket.send(JSON.stringify({ id: mid, method, params }));
  });
  return { ready, send, socket };
}

const CARD = (title, sub) => `
(() => {
  const old = document.getElementById('still-card');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'still-card';
  el.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;text-align:center;' +
    'background:radial-gradient(circle at 50% 45%,rgba(24,9,6,.78),rgba(4,2,2,.95));color:#f4e6cf;';
  el.innerHTML = '<div><h1 style="margin:0;font:600 72px/1.2 Songti SC,STSong,serif;letter-spacing:.26em">' + title +
    '</h1><p style="margin:20px 0 0;color:rgba(226,188,123,.85);font:400 20px/1 Georgia,serif;letter-spacing:.42em">' + sub + '</p></div>';
  document.body.appendChild(el);
})();
`;

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const target = await openTarget();
  const { ready, send, socket } = connect(target.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
    console.log('saved', name);
  };
  const waitHidden = async () => {
    for (let i = 0; i < 120; i += 1) {
      if (await evaluate(`document.getElementById('loadingOverlay').classList.contains('hidden')`)) return;
      await sleep(600);
    }
  };

  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__)`)) break;
    await sleep(700);
  }
  await waitHidden();
  await sleep(1500);

  await evaluate(CARD('东方醒狮', 'MATERIAL MAGICIAN'));
  await sleep(800);
  await shot('00-title');
  await evaluate(`document.getElementById('still-card')?.remove()`);

  await sleep(600);
  await shot('01-original');

  await evaluate(`document.querySelector('[data-material="ceramic"]').click()`);
  await waitHidden();
  await sleep(1500);
  await shot('02-ceramic');

  await evaluate(`document.querySelector('[data-material="metal"]').click()`);
  await waitHidden();
  await sleep(1500);
  await shot('03-ai-metal');

  await evaluate(`document.querySelector('[data-view="head"]').click()`);
  await sleep(1800);
  await shot('04-head');

  await evaluate(`document.querySelector('[data-view="side"]').click()`);
  await sleep(1800);
  await shot('05-side');

  await evaluate(CARD('材质生辉', 'MATERIAL MAGICIAN 2026'));
  await sleep(800);
  await shot('06-end');

  socket.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('FAILED', error.message);
  process.exit(1);
});
