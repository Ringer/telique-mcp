import { createInterface } from "node:readline/promises";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execSync, execFileSync } from "node:child_process";
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
    const keep = await rl.question("  Keep this key? (Y/n): ");
    if (keep.toLowerCase() !== "n") {
      console.log("\n  ✓ Keeping existing configuration.");
      await registerWithClients(rl, existing);
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
      console.log(`  ✓ Saved to ${CONFIG_FILE}`);
      await registerWithClients(rl, trimmed);
      break;
    }

    case "2": {
      console.log(`\n  Opening ${REGISTER_URL} ...\n`);
      await openBrowser(REGISTER_URL);
      console.log(
        "  After creating your account, run `telique-mcp setup` again.\n"
      );
      break;
    }

    case "3":
    default: {
      console.log("\n  ✓ Skipped. Running in anonymous mode (10 ops/min).");
      console.log(`  Get an API key anytime at ${REGISTER_URL}`);
      await registerWithClients(rl, null);
      break;
    }
  }

  rl.close();
}

async function registerWithClients(
  rl: ReturnType<typeof createInterface>,
  token: string | null
): Promise<void> {
  const clients = detectMcpClients();

  if (clients.length === 0) {
    console.log("\n  No supported MCP clients detected.\n");
    printManualConfig(token);
    return;
  }

  console.log("\n  Detected MCP clients:\n");
  clients.forEach((c, i) => console.log(`  [${i + 1}] ${c.name}`));
  console.log(`  [A] All of the above`);
  console.log(`  [S] Skip — I'll configure manually`);
  console.log();

  const answer = await rl.question("  Register with which client? > ");
  const trimmed = answer.trim().toUpperCase();

  if (trimmed === "S") {
    printManualConfig(token);
    return;
  }

  const selected =
    trimmed === "A"
      ? clients
      : clients.filter((_, i) => trimmed === String(i + 1));

  if (selected.length === 0) {
    printManualConfig(token);
    return;
  }

  for (const client of selected) {
    const success = client.register(token);
    if (success) {
      console.log(`  ✓ Registered with ${client.name}`);
    } else {
      console.log(`  ✗ Failed to register with ${client.name}`);
    }
  }

  console.log("\n  Done! Restart your MCP client to load the Telique tools.\n");
}

interface McpClient {
  name: string;
  register: (token: string | null) => boolean;
}

function detectMcpClients(): McpClient[] {
  const clients: McpClient[] = [];

  // Claude Code
  if (commandExists("claude")) {
    clients.push({
      name: "Claude Code",
      register: (token) => registerClaudeCode(token),
    });
  }

  // Claude Desktop
  const claudeDesktopConfig = getClaudeDesktopConfigPath();
  if (claudeDesktopConfig && existsSync(claudeDesktopConfig)) {
    clients.push({
      name: "Claude Desktop",
      register: (token) =>
        registerJsonConfig(claudeDesktopConfig, token),
    });
  }

  // Cursor
  const cursorConfig = getCursorConfigPath();
  if (cursorConfig && existsSync(cursorConfig)) {
    clients.push({
      name: "Cursor",
      register: (token) => registerJsonConfig(cursorConfig, token),
    });
  }

  // Codex CLI
  if (commandExists("codex")) {
    clients.push({
      name: "Codex CLI",
      register: (token) => registerCodex(token),
    });
  }

  // GitHub Copilot (VS Code)
  const vscodeSettingsPath = getVsCodeSettingsPath();
  if (vscodeSettingsPath && existsSync(vscodeSettingsPath)) {
    clients.push({
      name: "GitHub Copilot (VS Code)",
      register: (token) => registerCopilot(vscodeSettingsPath, token),
    });
  }

  // ChatGPT Desktop (UI-only — detect but provide instructions)
  if (isChatGptDesktopInstalled()) {
    clients.push({
      name: "ChatGPT Desktop (manual)",
      register: (token) => {
        console.log("\n  ChatGPT Desktop requires manual setup:");
        console.log("  1. Open ChatGPT Desktop → Settings → Developer Mode");
        console.log("  2. Add a new MCP server with:");
        console.log(`     Command: npx`);
        console.log(`     Args: -y telique-mcp`);
        if (token) {
          console.log(`     Env: TELIQUE_API_TOKEN=${token}`);
        }
        return true;
      },
    });
  }

  return clients;
}

function registerClaudeCode(token: string | null): boolean {
  try {
    // Remove existing entry first (ignore errors if not found)
    try {
      execSync("claude mcp remove -s user telique 2>/dev/null", {
        stdio: "ignore",
      });
    } catch {
      // ignore
    }

    const args = ["mcp", "add", "-s", "user", "telique"];
    if (token) {
      args.push("-e", `TELIQUE_API_TOKEN=${token}`);
    }
    args.push("--", "npx", "-y", "telique-mcp");
    execFileSync("claude", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function registerCodex(token: string | null): boolean {
  try {
    // Remove existing entry first
    try {
      execFileSync("codex", ["mcp", "remove", "telique"], { stdio: "ignore" });
    } catch {
      // ignore
    }

    const args = ["mcp", "add", "telique"];
    if (token) {
      args.push("--env", `TELIQUE_API_TOKEN=${token}`);
    }
    args.push("--", "npx", "-y", "telique-mcp");
    execFileSync("codex", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getCursorConfigPath(): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return `${home}/.cursor/mcp.json`;
}

function getVsCodeSettingsPath(): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  switch (process.platform) {
    case "darwin":
      return `${home}/Library/Application Support/Code/User/settings.json`;
    case "win32":
      return `${process.env.APPDATA}/Code/User/settings.json`;
    case "linux":
      return `${home}/.config/Code/User/settings.json`;
    default:
      return null;
  }
}

function registerCopilot(
  settingsPath: string,
  token: string | null
): boolean {
  try {
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // start fresh
    }

    const key = "github.copilot.chat.mcp.servers";
    if (!settings[key] || typeof settings[key] !== "object") {
      settings[key] = {};
    }

    const servers = settings[key] as Record<string, unknown>;
    const entry: Record<string, unknown> = {
      command: "npx",
      args: ["-y", "telique-mcp"],
    };
    if (token) {
      entry.env = { TELIQUE_API_TOKEN: token };
    }
    servers.telique = entry;

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

function isChatGptDesktopInstalled(): boolean {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  switch (process.platform) {
    case "darwin":
      return existsSync(`${home}/Library/Application Support/com.openai.chat`);
    case "win32":
      return existsSync(`${process.env.LOCALAPPDATA}/Programs/ChatGPT`);
    default:
      return false;
  }
}

function registerJsonConfig(
  configPath: string,
  token: string | null,
  serverKey: string = "telique"
): boolean {
  try {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      // start fresh
    }

    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      config.mcpServers = {};
    }

    const servers = config.mcpServers as Record<string, unknown>;
    const entry: Record<string, unknown> = {
      command: "npx",
      args: ["-y", "telique-mcp"],
    };
    if (token) {
      entry.env = { TELIQUE_API_TOKEN: token };
    }
    servers[serverKey] = entry;

    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

function getClaudeDesktopConfigPath(): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  switch (process.platform) {
    case "darwin":
      return `${home}/Library/Application Support/Claude/claude_desktop_config.json`;
    case "win32":
      return `${process.env.APPDATA}/Claude/claude_desktop_config.json`;
    case "linux":
      return `${home}/.config/Claude/claude_desktop_config.json`;
    default:
      return null;
  }
}

function commandExists(cmd: string): boolean {
  try {
    const check = process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`;
    execSync(check, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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
  const existing = existsSync(CONFIG_FILE)
    ? JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
    : {};
  existing.apiToken = token;
  writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2) + "\n");
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

function printManualConfig(token: string | null): void {
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

  console.log("\n  Add this to your MCP client configuration:\n");
  console.log(
    JSON.stringify(config, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  );
  console.log();
}
