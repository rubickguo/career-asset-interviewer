import fs from "node:fs/promises";
import path from "node:path";

let envLoaded = false;

async function loadLocalEnv(rootDir) {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = path.join(rootDir, ".env.local");
  let raw = "";
  try {
    raw = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export async function getLlmConfig(rootDir) {
  await loadLocalEnv(rootDir);
  return {
    hasKey: Boolean(process.env.DEEPSEEK_API_KEY),
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro"
  };
}

export async function callDeepSeek(rootDir, messages, options = {}) {
  const config = await getLlmConfig(rootDir);
  if (!config.hasKey) {
    throw new Error("Missing DEEPSEEK_API_KEY. Put it in career-web/.env.local or export it before starting the server.");
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || config.model,
      messages,
      response_format: options.json ? { type: "json_object" } : undefined,
      thinking: { type: options.thinking ? "enabled" : "disabled" },
      reasoning_effort: options.thinking ? "high" : undefined,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens || 4096,
      stream: false
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `DeepSeek request failed with HTTP ${response.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned an empty response.");
  return {
    content,
    model: data.model,
    usage: data.usage || null
  };
}
