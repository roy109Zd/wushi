// 冒烟测试：过门后应留在漫游街市，不再弹出 3DGS 覆盖层。
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
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`)) break;
    await sleep(700);
  }
  await sleep(1200);

  await evaluate(`document.querySelector('[data-mode="roam"]').click()`);
  await sleep(1200);
  await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.x = 21.2`);
  await sleep(2500);

  console.log('mode', await evaluate(`document.body.dataset.mode`));
  console.log('splat hidden', await evaluate(`document.getElementById('splatStage').hidden`));
  console.log('position x', await evaluate(`window.__MATERIAL_MAGICIAN__.modelManager.stageRoot.position.x.toFixed(2)`));
  console.log('errors', JSON.stringify(errors.slice(0, 3)));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFile } = await import('node:fs/promises');
  await writeFile('report/video/smoke-street.png', Buffer.from(shot.data, 'base64'));
  socket.close();
  process.exit(0);
}

main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
