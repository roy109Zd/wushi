// 用 CDP 驱动无头 Edge 截图：首屏、材质、故事、练功、漫游、3DGS。
import { writeFile, mkdir } from 'node:fs/promises';

const PORT = process.env.CDP_PORT || '9333';
const URL = 'http://127.0.0.1:4173/';
const OUT = 'report/figures';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = id++;
    pending.set(mid, { resolve, reject });
    socket.send(JSON.stringify({ id: mid, method, params }));
  });
  return { ready, send, socket };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const target = await openTarget();
  const { ready, send, socket } = connect(target.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return result.result?.value;
  };

  const waitFor = async (expression, timeout = 90000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return true;
      await sleep(600);
    }
    return false;
  };

  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
    console.log('saved', name);
  };

  await waitFor(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`);
  await sleep(1200);
  await shot('01-exhibition');

  await evaluate(`document.querySelector('[data-material="ceramic"]').click()`);
  await waitFor(`document.getElementById('loadingOverlay').classList.contains('hidden')`);
  await sleep(900);
  await shot('02-ceramic');

  await evaluate(`document.querySelector('[data-material="aiMetal"]').click()`);
  await waitFor(`document.getElementById('loadingOverlay').classList.contains('hidden')`);
  await sleep(900);
  await shot('03-ai-metal');

  await evaluate(`document.querySelector('[data-story="green"]').click()`);
  await sleep(1600);
  await shot('04-story');

  await evaluate(`document.querySelector('[data-training="poles"]').click()`);
  await sleep(1600);
  await shot('05-training');

  await evaluate(`document.querySelector('[data-mode="roam"]').click()`);
  await sleep(2200);
  await shot('06-roam');

  await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.x = 21.3`);
  await sleep(16000);
  await shot('07-splat-street');

  socket.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('FAILED', error.message);
  process.exit(1);
});
