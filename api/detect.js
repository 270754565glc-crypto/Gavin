import { detectImage } from "../lib/detect.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
  const { imageBase64 } = payload;
  const apiKey = process.env.VOLC_API_KEY;
  const modelId = process.env.VOLC_MODEL_ID;

  const result = await detectImage({ imageBase64, apiKey, modelId });
  return res.status(result.status).json(result.body);
}
