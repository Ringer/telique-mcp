import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Config {
  baseUrl: string;
  apiToken: string | null;
  requestTimeoutMs: number;
}

const CONFIG_DIR = join(homedir(), ".telique");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export { CONFIG_DIR, CONFIG_FILE };

function loadTokenFromConfigFile(): string | null {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return typeof config.apiToken === "string" ? config.apiToken : null;
  } catch {
    return null;
  }
}

export function loadConfig(): Config {
  // Token resolution: env var > config file > null (anonymous)
  const apiToken =
    process.env.TELIQUE_API_TOKEN || loadTokenFromConfigFile() || null;

  return {
    baseUrl: process.env.TELIQUE_API_BASE_URL || "https://api-dev.ringer.tel",
    apiToken,
    requestTimeoutMs: parseInt(
      process.env.TELIQUE_REQUEST_TIMEOUT_MS || "10000",
      10
    ),
  };
}
