import { createInterface } from "node:readline/promises";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { CONFIG_DIR, CONFIG_FILE } from "./config.js";

const REGISTER_URL = "https://telique.ringer.tel/register";
const API_BASE_URL = "https://api-dev.ringer.tel";

export async function runSetup(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("\n  Telique MCP — Setup\n");

  // Check for existing config
  const existing = loadExistingToken();
  if (existing) {
    console.log(`  Found existing API key: ${maskToken(existing)}`);
    const keep = await rl.question(
      "  Keep this key? (Y/n): "
    );
    if (keep.toLowerCase() !== "n") {
      console.log("\n  ✓ Keeping existing configuration.\n");
      printMcpConfig(existing);
      rl.close();
      return;
    }
  }

  console.log("  Do you have an API key?\n");
  console.log("  [1] Yes, I have one  → Enter it");
  console.log("  [2] No, I need one   → Opens telique.ringer.tel in browser");
  console.log("  [3] Skip for now     → Use anonymous mode (10 ops/min)");
  console.log();

  const choice = await rl.question("  > ");

  switch (choice.trim()) {
    case "1": {
      const token = await rl.question("\n  Enter your API key: ");
      const trimmed = token.trim();
      if (!trimmed) {
        console.log("\n  ✗ No key entered. Exiting.\n");
        rl.close();
        process.exit(1);
      }

      console.log("\n  Validating...");
      const valid = await validateToken(trimmed);
      if (!valid) {
        console.log(
          "  ✗ Token validation failed. The API returned an error."
        );
        console.log("  Check your token and try again.\n");
        rl.close();
        process.exit(1);
      }

      saveToken(trimmed);
      console.log(`  ✓ Token validated`);
      console.log(`  ✓ Saved to ${CONFIG_FILE}\n`);
      printMcpConfig(trimmed);
      break;
    }

    case "2": {
      console.log(`\n  Opening ${REGISTER_URL} ...\n`);
      await openBrowser(REGISTER_URL);
      console.log(
        "  After creating your account, run this command again with your API key.\n"
      );
      break;
    }

    case "3":
    default: {
      console.log(
        "\n  ✓ Skipped. Running in anonymous mode (10 ops/min)."
      );
      console.log(
        `  Get an API key anytime at ${REGISTER_URL}\n`
      );
      printMcpConfig(null);
      break;
    }
  }

  rl.close();
}

function loadExistingToken(): string | null {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return typeof config.apiToken === "string" ? config.apiToken : null;
  } catch {
    return null;
  }
}

function saveToken(token: string): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const config = existsSync(CONFIG_FILE)
    ? JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
    : {};
  config.apiToken = token;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { "x-api-token": token },
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return token.substring(0, 4) + "..." + token.substring(token.length - 4);
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("node:child_process");
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} ${url}`);
}

function printMcpConfig(token: string | null): void {
  const env: Record<string, string> = {};
  if (token) {
    env.TELIQUE_API_TOKEN = token;
  }

  const config = {
    mcpServers: {
      telique: {
        command: "npx",
        args: ["-y", "telique-mcp"],
        ...(token ? { env } : {}),
      },
    },
  };

  console.log("  Add this to your MCP client configuration:\n");
  console.log(
    JSON.stringify(config, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  );
  console.log();
}
