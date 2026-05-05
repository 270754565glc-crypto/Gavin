import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectImage } from "../lib/detect.js";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "../client");
const envPath = path.resolve(__dirname, "../.env");

// Always prefer project-local .env over inherited shell variables.
dotenv.config({ path: envPath, override: true });

app.use(express.json({ limit: "8mb" }));
app.use(express.static(clientDir));

app.post("/api/detect", async (req, res) => {
  const { imageBase64 } = req.body ?? {};
  const apiKey = process.env.VOLC_API_KEY;
  const modelId = process.env.VOLC_MODEL_ID;
  const result = await detectImage({ imageBase64, apiKey, modelId });
  return res.status(result.status).json(result.body);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
