# Installing Telique MCP

Telique MCP gives AI assistants access to telecom routing data, caller ID lookups, number portability info, and LERG reference data through 14 tools.

> **Before you install:** most users should use the hosted connector at `https://mcp.telique.ringer.tel` (OAuth, works on claude.ai, Claude Desktop, and mobile — no local Node runtime). Claude Code users should install the plugin. This guide is the deep-dive for the **npm stdio** surface, intended for CI, offline use, or clients that don't support remote MCP. See [README.md](README.md) for the full three-surface decision tree.

## Quick Start

```bash
npm install -g telique-mcp
telique-mcp setup
```

The setup wizard detects your installed MCP clients and registers automatically.

## Requirements

- **Node.js** 18 or later
- **npm** 7 or later
- An API key from [telique.ringer.tel](https://telique.ringer.tel) (optional — works in anonymous mode at 10 ops/min without one)

## Setup Wizard

Running `telique-mcp setup` in your terminal launches the interactive setup:

```
$ telique-mcp setup

  Telique MCP — Setup

  Do you have an API key?

  [1] Yes, I have one  → Enter it
  [2] No, I need one   → Opens telique.ringer.tel in browser
  [3] Skip for now     → Use anonymous mode (10 ops/min)

  > 1

  Enter your API key: ••••••••••••••••

  ✓ Token validated
  ✓ Saved to ~/.telique/config.json

  Detected MCP clients:

  [1] Claude Code
  [2] Claude Desktop
  [3] Cursor
  [4] GitHub Copilot (VS Code)
  [5] ChatGPT Desktop (manual)
  [A] All of the above
  [S] Skip — I'll configure manually

  Register with which client? > A

  ✓ Registered with Claude Code
  ✓ Registered with Claude Desktop
  ✓ Registered with Cursor
  ✓ Registered with GitHub Copilot (VS Code)

  Done! Restart your MCP client to load the Telique tools.
```

The wizard detects which clients are installed on your system and only shows those.

## Client-Specific Instructions

If you prefer manual setup or the wizard didn't detect your client, follow the instructions below.

---

### Claude Code

**Automatic (recommended):**

```bash
telique-mcp setup   # select Claude Code when prompted
```

**Manual:**

```bash
# With API key
claude mcp add -s user telique-local -e TELIQUE_API_TOKEN=your-key-here -- npx -y telique-mcp

# Anonymous mode
claude mcp add -s user telique-local -- npx -y telique-mcp
```

Restart Claude Code to load the tools. Verify with `/mcp`.

---

### Claude Desktop

**Automatic (recommended):**

```bash
telique-mcp setup   # select Claude Desktop when prompted
```

**Manual:**

Edit the Claude Desktop config file:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Add the `telique-local` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "telique-local": {
      "command": "npx",
      "args": ["-y", "telique-mcp"],
      "env": {
        "TELIQUE_API_TOKEN": "your-key-here"
      }
    }
  }
}
```

Omit the `env` block to use anonymous mode. Restart Claude Desktop.

---

### Cursor

**Automatic (recommended):**

```bash
telique-mcp setup   # select Cursor when prompted
```

**Manual:**

Edit `~/.cursor/mcp.json` (same path on all platforms):

```json
{
  "mcpServers": {
    "telique-local": {
      "command": "npx",
      "args": ["-y", "telique-mcp"],
      "env": {
        "TELIQUE_API_TOKEN": "your-key-here"
      }
    }
  }
}
```

Omit the `env` block to use anonymous mode. Restart Cursor.

---

### GitHub Copilot (VS Code)

**Automatic (recommended):**

```bash
telique-mcp setup   # select GitHub Copilot when prompted
```

**Manual:**

Edit your VS Code `settings.json`:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Code/User/settings.json` |
| Windows | `%APPDATA%\Code\User\settings.json` |
| Linux | `~/.config/Code/User/settings.json` |

Add the entry under `github.copilot.chat.mcp.servers`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "telique-local": {
      "command": "npx",
      "args": ["-y", "telique-mcp"],
      "env": {
        "TELIQUE_API_TOKEN": "your-key-here"
      }
    }
  }
}
```

Omit the `env` block to use anonymous mode. Reload VS Code.

---

### Codex (CLI and/or Desktop)

The setup wizard handles both surfaces with a single registration. Codex CLI and the Codex Desktop app on macOS share `~/.codex/config.toml`, so one `codex mcp add` covers whichever surfaces you have installed. The wizard label adapts to what it finds:

- `Codex (CLI + Desktop)` when both are installed
- `Codex CLI` when only the standalone CLI is on `PATH`
- `Codex Desktop` when only the macOS app is installed (the wizard uses the binary bundled inside `/Applications/Codex.app/Contents/Resources/codex` to register)

**Automatic (recommended):**

```bash
telique-mcp setup   # select the Codex entry when prompted
```

**Manual:**

```bash
# With API key
codex mcp add telique-local --env TELIQUE_API_TOKEN=your-key-here -- npx -y telique-mcp

# Anonymous mode
codex mcp add telique-local -- npx -y telique-mcp
```

If you only have Codex Desktop and no `codex` binary on `PATH`, run the bundled binary by absolute path:

```bash
/Applications/Codex.app/Contents/Resources/codex mcp add telique-local -- npx -y telique-mcp
```

Restart Codex (or quit and relaunch the Desktop app) to pick up the new server.

---

### ChatGPT Desktop

ChatGPT Desktop manages MCP servers through its UI, not a config file.

1. Open **ChatGPT Desktop**
2. Go to **Settings** → **Developer Mode**
3. Add a new MCP server:
   - **Command:** `npx`
   - **Args:** `-y telique-mcp`
   - **Environment variable:** `TELIQUE_API_TOKEN=your-key-here` (optional)
4. Restart ChatGPT Desktop

---

## API Key

### Getting a key

Visit [telique.ringer.tel](https://telique.ringer.tel) to create an account. All accounts include an API key.

### Anonymous mode

Telique MCP works without an API key at a rate limit of 10 operations per minute. The first tool response will include a notice about the limit.

### Updating your key

Run the setup wizard again to update your key and re-register with your MCP clients:

```bash
telique-mcp setup
```

### Token resolution

The server checks for a token in this order:

1. `TELIQUE_API_TOKEN` environment variable (set by MCP client config)
2. `~/.telique/config.json` file (written by the setup wizard)
3. No token → anonymous mode (10 ops/min)

## Available Tools

| Tool | Description |
|------|-------------|
| `routelink_lookup` | CIC/ROR lookup for toll-free numbers |
| `routelink_ror_query` | List TFNs or CPRs by Responsible Org |
| `routelink_cpr` | Full CPR routing decision tree |
| `lrn_lookup` | Local Routing Number lookup |
| `lrn_relationship_query` | LSMS queries (phones, LRNs, SPIDs) |
| `dno_check` | Do Not Originate list check |
| `cnam_lookup` | Caller Name (CNAM) lookup |
| `lerg_table_info` | LERG table listing and schema |
| `lerg_query` | Query any of 27 LERG tables |
| `lerg_complex_query` | Multi-table JOIN queries |
| `lerg_tandem` | Tandem routing for NPA-NXX |
| `graphql_query` | GraphQL queries against LSMS or LERG |
| `lookup_tn` | Composite lookup across LRN, CNAM, DNO, and LERG |

## Troubleshooting

**Tools not appearing after setup?**
Restart your MCP client. Most clients require a restart to pick up new MCP servers.

**Getting 429 errors?**
You're hitting the anonymous rate limit (10 ops/min). Get an API key at [telique.ringer.tel](https://telique.ringer.tel).

**Getting 403 errors?**
Your API key is invalid or expired. Run `telique-mcp setup` to update it.

**Server not starting?**
Ensure Node.js 18+ is installed: `node --version`

## Uninstalling

```bash
npm uninstall -g telique-mcp
```

To remove the MCP registration from your clients, run the appropriate command:

```bash
# Claude Code
claude mcp remove -s user telique-local

# Codex CLI
codex mcp remove telique-local
```

For Claude Desktop, Cursor, and VS Code, remove the `telique-local` entry from the respective config file. For ChatGPT Desktop, remove it through the app's Settings UI.
