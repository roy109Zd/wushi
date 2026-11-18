// 俯视调试：确认街市建筑的实际布局。
import { writeFile } from 'node:fs/promises';

const PORT = '9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
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
  await sleep(6000);

  await evaluate(`(() => {
    const m = window.__MATERIAL_MAGICIAN__;
    m.roamController.exit();
    m.viewerControls.setSuspended(true);
    const hall = m.sceneContext.scene.getObjectByName('ProceduralOrientalHall'); if (hall) hall.visible = false;
    m.sceneContext.camera.position.set(24, 6, 4);
    m.sceneContext.camera.lookAt(38, 4, 0);
    m.sceneContext.render();
  })()`);
  await sleep(1500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/debug-top.png', Buffer.from(shot.data, 'base64'));
  socket.close();
  process.exit(0);
}

main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
