// 测试 3DGS 街景打开耗时与状态。
import { writeFile } from 'node:fs/promises';

const PORT = '9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const logs = [];
  let id = 1;
  await new Promise((res, rej) => { socket.addEventListener('open', res); socket.addEventListener('error', rej); });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value ?? a.description).join(' ');
      if (text.includes('Splat') || text.includes('街景')) logs.push(text);
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
  await evaluate(`document.querySelector('[data-mode="roam"]').click()`);
  await sleep(1200);
  await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.x = 21.3`);
  await sleep(25000);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/smoke-splat.png', Buffer.from(shot.data, 'base64'));
  console.log('LOGS', JSON.stringify(logs));
  console.log('loading hidden', await evaluate(`document.getElementById('splatLoading')?.hidden`));
  socket.close();
  process.exit(0);
}

main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
