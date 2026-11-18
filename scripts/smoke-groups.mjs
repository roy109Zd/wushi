// 冒烟测试：动作分组（跳跃/滑铲/蹲伏）与漫游按键。
import { writeFile } from 'node:fs/promises';

const PORT = '9333';
const URL = 'http://127.0.0.1:4173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let id = 1;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description || 'exception');
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
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
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`)) break;
    await sleep(700);
  }
  await sleep(800);

  console.log('actions', await evaluate(`document.querySelectorAll('[data-action]').length`));

  await evaluate(`document.querySelector('[data-action="slide"]').click()`);
  await sleep(2500);
  console.log('slide status', await evaluate(`document.getElementById('skeletonStatus').textContent`));

  await evaluate(`document.querySelector('[data-action="crouch"]').click()`);
  await sleep(1500);
  console.log('crouch status', await evaluate(`document.getElementById('skeletonStatus').textContent`));

  await evaluate(`document.querySelector('[data-mode="roam"]').click()`);
  await sleep(1500);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC'})); window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}))`);
  await sleep(1800);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyC'})); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))`);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyX'}))`);
  await sleep(1600);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('report/video/smoke-groups.png', Buffer.from(shot.data, 'base64'));

  console.log('errors', JSON.stringify(errors.slice(0, 4)));
  socket.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('FAILED', error.message);
  process.exit(1);
});
