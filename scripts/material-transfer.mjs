/**
 * 把一张参考图变成醒狮的新皮肤（Lux3D material-transfer）。
 *
 * 用法：
 *   node scripts/material-transfer.mjs <参考图路径> [输出名]
 * 例：
 *   node scripts/material-transfer.mjs 白瓷.png ai-porcelain
 *
 * 流程：上传参考图 → 用已上传的模型 URL 建任务 → 轮询 → 下载 GLB 到 public/models。
 * API Key 从 api.txt 读取，不写入任何源码。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const API = 'https://api.aholo3d.cn';
const MESH_CACHE = '.secrets/mesh-cache.json';

const [, , imagePath, name = 'ai-custom'] = process.argv;
if (!imagePath) {
  console.error('用法：node scripts/material-transfer.mjs <参考图路径> [输出名]');
  process.exit(1);
}

async function readKey() {
  for (const candidate of ['.secrets/api.txt', 'api.txt']) {
    try {
      return (await fs.readFile(candidate, 'utf8')).trim();
    } catch {
      // 继续尝试下一个位置
    }
  }
  throw new Error('找不到 API Key：请放到 .secrets/api.txt');
}

const key = await readKey();

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: key, 'User-Agent': 'Mozilla/5.0', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function uploadImage(buffer, filename) {
  const token = (await jsonFetch(`${API}/asset/v1/token`));
  const { globalDomain, ousToken } = token;

  const form = new FormData();
  form.append('md5', crypto.createHash('md5').update(buffer).digest('hex'));
  form.append('file', new Blob([buffer]), filename);

  const upload = await fetch(`${globalDomain}/ous/api/v2/single/upload`, {
    method: 'POST',
    headers: { 'ous-token-v2': ousToken },
    body: form
  }).then((r) => r.json());
  if (upload.c !== '0') throw new Error(`上传失败：${JSON.stringify(upload)}`);

  const taskId = upload.d.obsTaskId;
  for (let i = 0; i < 30; i += 1) {
    const status = await fetch(
      `${globalDomain}/ous/api/v2/upload/status?taskId=${taskId}`,
      { headers: { 'ous-token-v2': ousToken } }
    ).then((r) => r.json());
    if (status.c === '0' && status.d?.url) return status.d.url;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('上传超时');
}

async function readMeshCache() {
  try {
    const data = JSON.parse(await fs.readFile(MESH_CACHE, 'utf8'));
    if (data.url && Date.now() - data.savedAt < 6 * 3600 * 1000) return data.url;
  } catch {
    // 没有缓存就走上传
  }
  return null;
}

async function uploadModel() {
  const buffer = await fs.readFile('public/models/醒狮.glb');
  const md5 = crypto.createHash('md5').update(buffer).digest('hex');
  const token = await jsonFetch(`${API}/asset/v1/token`);
  const { globalDomain, ousToken, blockSize } = token;
  const blocks = Math.ceil(buffer.length / blockSize);

  const init = await fetch(
    `${globalDomain}/ous/api/v2/block/upload/init?md5=${md5}&blocks=${blocks}&size=${buffer.length}&name=lion.glb`,
    { method: 'POST', headers: { 'ous-token-v2': ousToken } }
  ).then((r) => r.json());
  if (init.c !== '0') throw new Error(`模型上传初始化失败：${JSON.stringify(init)}`);

  const taskId = init.d.obsTaskId;
  for (let i = 1; i <= blocks; i += 1) {
    const chunk = buffer.subarray((i - 1) * blockSize, i * blockSize);
    const form = new FormData();
    form.append('block', String(i));
    form.append('file', new Blob([chunk]), `part${i}.bin`);
    const res = await fetch(
      `${globalDomain}/ous/api/v2/block/upload/part?taskId=${taskId}`,
      { method: 'POST', headers: { 'ous-token-v2': ousToken }, body: form }
    ).then((r) => r.json());
    if (res.c !== '0') throw new Error(`分片上传失败：${JSON.stringify(res)}`);
  }

  for (let i = 0; i < 40; i += 1) {
    const status = await fetch(
      `${globalDomain}/ous/api/v2/upload/status?taskId=${taskId}`,
      { headers: { 'ous-token-v2': ousToken } }
    ).then((r) => r.json());
    if (status.c === '0' && status.d?.url) {
      await fs.writeFile(MESH_CACHE, JSON.stringify({ url: status.d.url, savedAt: Date.now() }), 'utf8');
      return status.d.url;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('模型上传超时');
}

async function resolveMeshUrl() {
  if (process.env.LION_MESH_URL) return process.env.LION_MESH_URL;
  const cached = await readMeshCache();
  if (cached) {
    console.log('复用已上传的模型');
    return cached;
  }
  console.log('首次运行：分片上传醒狮模型…');
  return uploadModel();
}

async function main() {
  const buffer = await fs.readFile(imagePath);
  console.log('上传参考图…');
  const imgUrl = await uploadImage(buffer, path.basename(imagePath));
  console.log('图片 URL:', imgUrl);

  const meshUrl = await resolveMeshUrl();
  console.log('模型 URL:', meshUrl);

  console.log('提交材质迁移任务…');
  const created = await jsonFetch(`${API}/lux3d/v1/generate/material-transfer/task/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      img: imgUrl,
      meshUrl,
      version: 'v3.0-standard',
      outputFormat: ['glb']
    })
  });
  const taskId = created.d;
  console.log('taskId:', taskId);

  for (let i = 0; i < 120; i += 1) {
    const detail = await jsonFetch(`${API}/lux3d/v1/generate/task/get?taskid=${taskId}`);
    const status = detail.d?.status;
    if (status === 3) {
      const url = detail.d.outputs?.[0]?.content;
      console.log('完成:', url);
      const glb = Buffer.from(await (await fetch(url)).arrayBuffer());
      const out = path.join('public/models', `${name}.glb`);
      await fs.writeFile(out, glb);
      console.log('已保存', out, `${(glb.length / 1024 / 1024).toFixed(1)}MB`);
      return;
    }
    if (status === 4) throw new Error('任务失败（status=4），检查参考图是否为材质特写、模型 URL 是否可访问');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('轮询超时');
}

main().catch((error) => {
  console.error('失败：', error.message);
  process.exit(1);
});
