// 验证 3DGS 传送门：点按钮后最多等 95 秒，记录控制台与加载层状态。
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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value ?? a.description).join(' ');
      logs.push(`${msg.params.type}: ${text}`.slice(0, 200));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('EXC: ' + (msg.params.exceptionDetails?.exception?.description || '').slice(0, 200));
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
  console.log('btn', await evaluate(`Boolean(document.getElementById('portalSplat'))`));
  console.log('splat', await evaluate(`Boolean(window.__SPLAT__)`));
  await evaluate(`document.getElementById('portalSplat').click()`);
  await sleep(500);
  console.log('stage hidden', await evaluate(`document.getElementById('splatStage').hidden`));

  for (let i = 0; i < 19; i += 1) {
    await sleep(5000);
    const hint = await evaluate(`document.getElementById('splatLoadingHint')?.textContent`);
    const hidden = await evaluate(`document.getElementById('splatLoading')?.hidden`);
    console.log(i * 5 + 5 + 's', hidden, hint);
    if (hidden) break;
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/smoke-splat2.png', Buffer.from(shot.data, 'base64'));
  console.log('LOGS', JSON.stringify(logs.slice(-8)));
  socket.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
