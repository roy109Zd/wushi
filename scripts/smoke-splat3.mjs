// 检查 3DGS canvas 是否存在、尺寸是否正常。
import { writeFile } from 'node:fs/promises';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((r) => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 1;
  await new Promise((res, rej) => { socket.addEventListener('open', res); socket.addEventListener('error', rej); });
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
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`)) break;
    await sleep(700);
  }
  await sleep(1000);
  await evaluate(`document.getElementById('portalSplat').click()`);
  await sleep(16000);
  console.log(await evaluate(`(() => {
    const stage = document.getElementById('splatStage');
    const canvas = stage.querySelector('canvas');
    const r = canvas ? canvas.getBoundingClientRect() : null;
    return JSON.stringify({
      stageHidden: stage.hidden,
      canvas: canvas ? { w: canvas.width, h: canvas.height, rect: [r.width, r.height] } : null,
      loadingHidden: document.getElementById('splatLoading').hidden
    });
  })()`));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/smoke-splat3.png', Buffer.from(shot.data, 'base64'));
  socket.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
