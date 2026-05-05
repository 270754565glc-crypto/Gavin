import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "../client");
const envPath = path.resolve(__dirname, "../.env");

// Always prefer project-local .env over inherited shell variables.
dotenv.config({ path: envPath, override: true });

const VOLC_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

app.use(express.json({ limit: "8mb" }));
app.use(express.static(clientDir));

function buildPrompt() {
  return `你是一个专业的数字图像取证专家。请仔细分析用户上传的图片是否由AI生成（如Midjourney, Stable Diffusion等）。
重点观察：手指与肢体结构、背景空间逻辑、文字和招牌是否乱码、光影与反光是否一致、物体边缘是否过度平滑。

【重要】你必须严格只返回如下格式的 JSON 对象，不要包含任何额外的 Markdown 标记或文字：
{
  "probability": <AI生成的概率，仅填0到100的整数数字>,
  "reason": "<详细说明判断理由，指出具体疑点或真实细节>"
}`;
}

function isValidDataUrl(value) {
  return /^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
}

function parseModelJson(rawText) {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const probability = Math.max(0, Math.min(100, Number.parseInt(parsed.probability, 10) || 0));
  const reason = typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : "模型未返回详细理由。";
  return { probability, reason };
}

app.post("/api/detect", async (req, res) => {
  const { imageBase64 } = req.body ?? {};
  const apiKey = process.env.VOLC_API_KEY;
  const modelId = process.env.VOLC_MODEL_ID;

  if (!apiKey) {
    return res.status(500).json({ error: "服务端缺少 VOLC_API_KEY 配置。" });
  }

  if (!modelId) {
    return res.status(500).json({ error: "服务端缺少 VOLC_MODEL_ID 配置（应为 ep- 开头的接入点 ID）。" });
  }

  if (typeof imageBase64 !== "string" || !isValidDataUrl(imageBase64)) {
    return res.status(400).json({ error: "请上传有效的图片（JPG/PNG/WEBP）。" });
  }

  try {
    const response = await fetch(VOLC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildPrompt() },
          {
            role: "user",
            content: [
              { type: "text", text: "请分析这张图片。" },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const message = data?.error?.message || "调用模型失败，请稍后重试。";
      return res.status(response.status || 500).json({ error: message });
    }

    const contentText = data?.choices?.[0]?.message?.content;
    if (typeof contentText !== "string" || !contentText.trim()) {
      return res.status(502).json({ error: "模型返回内容为空。" });
    }

    const result = parseModelJson(contentText);
    return res.json(result);
  } catch (error) {
    const cause = error?.cause?.message ? ` (${error.cause.message})` : "";
    console.error("Detect API failed:", error);
    return res.status(500).json({ error: `服务异常：${error.message}${cause}` });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
