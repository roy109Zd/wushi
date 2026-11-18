// 录制 33 秒演示短片：材质序列（素模 / 彩釉 / AI 鎏金）+ 字幕。
// 依赖 Edge 以 9333 调试端口启动，页面服务在 4173。
import { writeFile, mkdir, rm } from 'node:fs/promises';

const PORT = '9333';
const URL = 'http://127.0.0.1:4173/';
const OUT = 'report/video/frames';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OVERLAY = `
(() => {
  const style = document.createElement('style');
  style.textContent = \`
    #demo-caption{position:fixed;left:50%;bottom:190px;transform:translateX(-50%);z-index:80;
      padding:14px 26px;background:rgba(12,5,4,.72);border:1px solid rgba(196,154,93,.35);
      color:#f3e4cb;font:500 26px/1.5 "Songti SC","STSong",serif;letter-spacing:.08em;
      opacity:0;transition:opacity .6s ease;backdrop-filter:blur(10px);white-space:nowrap}
    #demo-caption.show{opacity:1}
    #demo-title{position:fixed;inset:0;z-index:81;display:grid;place-items:center;
      background:radial-gradient(circle at 50% 45%,rgba(20,7,5,.72),rgba(5,2,2,.92));
      color:#f4e6cf;opacity:0;transition:opacity .8s ease;text-align:center}
    #demo-title.show{opacity:1}
    #demo-title h1{font:600 64px/1.2 "Songti SC","STSong",serif;letter-spacing:.24em;margin:0}
    #demo-title p{margin:18px 0 0;color:rgba(226,188,123,.85);font:400 20px/1 Georgia,serif;letter-spacing:.4em}
  \`;
  document.head.appendChild(style);
  const caption = document.createElement('div');
  caption.id = 'demo-caption';
  document.body.appendChild(caption);
  const title = document.createElement('div');
  title.id = 'demo-title';
  title.innerHTML = '<div><h1>东方醒狮</h1><p>MATERIAL MAGICIAN</p></div>';
  document.body.appendChild(title);
  window.__demo = {
    caption(text) {
      const el = document.getElementById('demo-caption');
      el.textContent = text;
      el.classList.toggle('show', Boolean(text));
    },
    title(on) {
      document.getElementById('demo-title').classList.toggle('show', on);
    }
  };
})();
`;

async function openTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  return res.json();
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = [];
  let id = 1;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', reject);
  });
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = id++;
    pending.set(mid, { resolve, reject });
    socket.send(JSON.stringify({ id: mid, method, params }));
  });
  const on = (fn) => listeners.push(fn);
  return { ready, send, on, socket };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const target = await openTarget();
  const { ready, send, on, socket } = connect(target.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');

  let frameIndex = 0;
  let recording = false;
  on(async (msg) => {
    if (msg.method === 'Page.screencastFrame' && recording) {
      const { data, sessionId } = msg.params;
      frameIndex += 1;
      const name = String(frameIndex).padStart(5, '0');
      await writeFile(`${OUT}/${name}.jpg`, Buffer.from(data, 'base64'));
      send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    }
  });

  await send('Page.navigate', { url: URL });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  for (let i = 0; i < 120; i += 1) {
    if (await evaluate(`Boolean(window.__MATERIAL_MAGICIAN__) && document.getElementById('loadingOverlay').classList.contains('hidden')`)) break;
    await sleep(700);
  }
  await evaluate(OVERLAY);
  await sleep(500);

  await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  recording = true;
  const start = Date.now();
  const at = async (ms) => {
    const wait = ms - (Date.now() - start);
    if (wait > 0) await sleep(wait);
  };

  // 0-5s 片头
  await evaluate(`window.__demo.title(true)`);
  await at(4200);
  await evaluate(`window.__demo.title(false)`);

  // 5-13s 素模
  await evaluate(`window.__demo.caption('素模｜先看形')`);
  await at(13200);

  // 13-21s 彩釉
  await evaluate(`document.querySelector('[data-material="ceramic"]').click()`);
  await sleep(400);
  await evaluate(`window.__demo.caption('彩釉｜庙会的颜色')`);
  await at(21200);

  // 21-29s AI 鎏金
  await evaluate(`document.querySelector('[data-material="aiMetal"]').click()`);
  await sleep(400);
  await evaluate(`window.__demo.caption('AI 鎏金｜一张参考图生成的新皮肤')`);
  await at(29200);

  // 29-33s 收尾
  await evaluate(`window.__demo.caption('')`);
  await evaluate(`window.__demo.title(true)`);
  await at(32800);

  recording = false;
  await send('Page.stopScreencast');
  console.log('frames', frameIndex);
  socket.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('FAILED', error.message);
  process.exit(1);
});
