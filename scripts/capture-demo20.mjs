// 抓 20 秒 demo 的静帧：片头、素模、鎏金、街市、全景、片尾。
import { writeFile, mkdir, rm } from 'node:fs/promises';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'report/demo20';

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
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
    console.log('saved', name);
  };
  const waitReady = async () => {
    for (let i = 0; i < 120; i += 1) {
      if (await evaluate(`document.getElementById('loadingOverlay')?.classList.contains('hidden')`)) return;
      await sleep(700);
    }
  };
  const card = (title, sub) => `(() => {
    document.getElementById('demo-card')?.remove();
    const el = document.createElement('div');
    el.id = 'demo-card';
    el.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at 50% 45%,rgba(24,9,6,.8),rgba(4,2,2,.96));color:#f4e6cf;';
    el.innerHTML = '<div><h1 style="margin:0;font:600 76px/1.2 Songti SC,STSong,serif;letter-spacing:.26em">' + title + '</h1><p style="margin:22px 0 0;color:rgba(226,188,123,.85);font:400 20px/1 Georgia,serif;letter-spacing:.42em">' + sub + '</p></div>';
    document.body.appendChild(el);
  })()`;

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__)`)) break;
    await sleep(700);
  }
  await waitReady();
  await sleep(1200);

  await evaluate(card('东方醒狮', 'MATERIAL MAGICIAN'));
  await sleep(700);
  await shot('00-title');
  await evaluate(`document.getElementById('demo-card')?.remove()`);
  await sleep(400);
  await shot('01-clay');

  await evaluate(`document.querySelector('[data-material="metal"]').click()`);
  await waitReady();
  await sleep(1600);
  await shot('02-metal');

  await evaluate(`document.getElementById('portalStreet').click()`);
  await sleep(9000);
  await shot('03-street');

  await evaluate(`document.getElementById('splatBack')?.click()`);
  await sleep(800);
  await evaluate(`document.getElementById('portalSplat').click()`);
  await sleep(6000);
  await shot('04-pano');

  await evaluate(`document.getElementById('splatBack')?.click()`);
  await sleep(600);
  await evaluate(card('材质生辉', 'MATERIAL MAGICIAN 2026'));
  await sleep(700);
  await shot('05-end');

  socket.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
