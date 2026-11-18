// 用真实漫游按键走一段，截两张图看街市实际观感。
import { writeFile } from 'node:fs/promises';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' }).then((r) => r.json());
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
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'warning') {
      logs.push(msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 160));
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
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`report/video/${name}.png`, Buffer.from(data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`)) break;
    await sleep(700);
  }
  await sleep(1000);
  await evaluate(`document.getElementById('portalStreet').click()`);
  await sleep(8000);
  await shot('walk-1');

  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
  await sleep(2600);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))`);
  await shot('walk-2');

  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}))`);
  await sleep(900);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}))`);
  await sleep(400);
  await shot('walk-3');

  console.log('pos', await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.toArray().map(v=>v.toFixed(1)).join(',')`));
  console.log('warnings', JSON.stringify(logs.slice(-6)));
  socket.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
