# AI 图像探测器（前后端分离）

这是基于你现有页面改造的 Node.js + Express 版本：

- 前端：`client/index.html`
- 后端：`server/index.js`
- 浏览器只请求你的后端，不再暴露 API Key

## 1) 安装依赖

```bash
npm install
```

## 2) 配置环境变量

复制 `.env.example` 为 `.env`，并填入真实配置：

```bash
cp .env.example .env
```

`.env` 示例：

```env
PORT=3000
VOLC_API_KEY=你的火山API_KEY
VOLC_MODEL_ID=ep-你的多模态模型接入点ID
```

## 3) 启动项目

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

浏览器打开：`http://localhost:3000`

## Vercel 部署

- 本项目已包含 Vercel 所需文件：`api/detect.js` 和 `vercel.json`
- 在 Vercel 导入 GitHub 仓库后，保持默认即可（无需额外 Build Command）
- 在 Vercel 项目环境变量中添加：
  - `VOLC_API_KEY`
  - `VOLC_MODEL_ID`
- 重新部署后直接访问分配的域名即可

## 4) 接口说明

- `POST /api/detect`
- Body:

```json
{
  "imageBase64": "data:image/png;base64,..."
}
```

- Response:

```json
{
  "probability": 72,
  "reason": "检测到..."
}
```

## 5) 常见问题

- `服务端缺少 VOLC_API_KEY 配置`：检查 `.env`
- `请上传有效的图片`：确保是 `data:image/...;base64,...` 格式
- `fetch failed`：通常是服务进程所在环境网络受限，重启服务并确保可访问 `ark.cn-beijing.volces.com`
- `InvalidEndpointOrModel.NotFound`：`VOLC_MODEL_ID` 填错了，必须是你控制台创建的接入点 ID（`ep-...`），不是 `doubao-vision-pro-32k` 这种模型名
- Vercel `404: NOT_FOUND`：确认仓库里包含 `vercel.json`，并且已重新部署最新 commit
