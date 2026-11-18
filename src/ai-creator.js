/**
 * 前端只与后端代理通信，不保存 API Key。
 * 后端应负责调用 Aholo Lux3D Material Transfer API，并返回任务 ID 或结果 GLB URL。
 * 环境变量：VITE_LUX3D_API_URL=https://your-backend.example/api/material-transfer
 */
export class MaterialCreatorClient {
  constructor(endpoint = import.meta.env.VITE_LUX3D_API_URL || '') {
    this.endpoint = endpoint;
  }

  get connected() {
    return Boolean(this.endpoint);
  }

  async generate({ file, name, prompt }) {
    if (!name.trim() && !prompt.trim()) {
      return {
        ok: false,
        code: 'VALIDATION',
        message: '请至少填写材质名称或材质描述。'
      };
    }

    if (!this.connected) {
      return {
        ok: false,
        code: 'NOT_CONNECTED',
        message: '创作界面已就绪。当前未配置 Lux3D 后端接口，因此不会伪造生成结果。'
      };
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('prompt', prompt);
    if (file) formData.append('reference', file, file.name);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        code: 'API_ERROR',
        message: data.message || `材质服务返回错误：HTTP ${response.status}`
      };
    }

    return {
      ok: true,
      code: 'QUEUED',
      taskId: data.taskId || null,
      previewUrl: data.previewUrl || null,
      modelUrl: data.modelUrl || null,
      message: data.message || '任务已提交至 Lux3D 后端。'
    };
  }
}
