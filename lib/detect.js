const VOLC_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

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

export async function detectImage({ imageBase64, apiKey, modelId }) {
  if (!apiKey) {
    return { status: 500, body: { error: "服务端缺少 VOLC_API_KEY 配置。" } };
  }

  if (!modelId) {
    return { status: 500, body: { error: "服务端缺少 VOLC_MODEL_ID 配置。" } };
  }

  if (typeof imageBase64 !== "string" || !isValidDataUrl(imageBase64)) {
    return { status: 400, body: { error: "请上传有效的图片（JPG/PNG/WEBP）。" } };
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
      return { status: response.status || 500, body: { error: message } };
    }

    const contentText = data?.choices?.[0]?.message?.content;
    if (typeof contentText !== "string" || !contentText.trim()) {
      return { status: 502, body: { error: "模型返回内容为空。" } };
    }

    const result = parseModelJson(contentText);
    return { status: 200, body: result };
  } catch (error) {
    const cause = error?.cause?.message ? ` (${error.cause.message})` : "";
    return { status: 500, body: { error: `服务异常：${error.message}${cause}` } };
  }
}
