// 冒烟测试：侧栏传送门 → 街市（含生成建筑）。
import { writeFile } from 'node:fs/promises';

const PORT = '9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let id = 1;
  await new Promise((res, rej) => { socket.addEventListener('open', res); socket.addEventListener('error', rej); });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description || 'exception');
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      errors.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
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
  await sleep(1500);
  await evaluate(`document.getElementById('portalStreet').click()`);
  await sleep(9000);
  await evaluate(`window.__MATERIAL_MAGICIAN__.roamController.teleport({x: 36, z: 0, heading: Math.PI})`);
  await sleep(3000);
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  await (await import('node:fs/promises')).writeFile('report/video/smoke-portal2.png', Buffer.from(shot2.data, 'base64'));

  console.log('mode', await evaluate(`document.body.dataset.mode`));
  console.log('x', await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.x.toFixed(1)`));
  console.log('street', await evaluate(`(() => {
    const scene = window.__MATERIAL_MAGICIAN__.sceneContext.scene;
    const g = scene.getObjectByName('ChangAnStreet');
    if (!g) return 'no-street';
    let meshes = 0;
    g.traverse((o) => { if (o.isMesh) meshes += 1; });
    return JSON.stringify({ children: g.children.length, meshes, visible: g.visible, pos: g.position.toArray() });
  })()`));
  console.log('errors', JSON.stringify(errors.slice(0, 4)));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/smoke-portal.png', Buffer.from(shot.data, 'base64'));
  socket.close();
  process.exit(0);
}

main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
