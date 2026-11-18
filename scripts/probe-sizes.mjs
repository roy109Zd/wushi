// 打印街市里每个生成建筑的包围盒尺寸，判断归一化是否失真。
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
  await sleep(10000);

  console.log(await evaluate(`(() => {
    const THREE = window.__MATERIAL_MAGICIAN__.sceneContext.scene.constructor;
    const scene = window.__MATERIAL_MAGICIAN__.sceneContext.scene;
    const g = scene.getObjectByName('ChangAnStreet');
    const out = [];
    g.children.forEach((child) => {
      if (!child.isGroup) return;
      const box = new (child.constructor.prototype.constructor === Object ? Object : Object)();
      out.push(child.children.length);
    });
    return JSON.stringify(out.slice(0, 20));
  })()`));

  const sizes = await evaluate(`(() => {
    const scene = window.__MATERIAL_MAGICIAN__.sceneContext.scene;
    const box = new (scene.constructor.Box3 || Object)();
    return 'noop';
  })()`);
  console.log('sizes', sizes);
  socket.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
