# Telique MCP

Telecom data tools for AI assistants. Query LRN, CNAM, DNO, LERG routing tables, toll-free routing, and more — directly from Claude, ChatGPT, Copilot, Cursor, or Codex.

## Install

Pick **one** install surface.

| Surface | Authentication | Use it for |
|---|---|---|
| **Hosted connector** (recommended) | OAuth sign-in in your browser; no API key to copy | Claude, ChatGPT, Codex and any other client that supports remote MCP |
| **npm stdio** | Telique API key in `~/.telique/config.json` | CI, offline use, clients without remote MCP |
| Direct REST/GraphQL API | Telique API key (`x-api-token`) | Your own code, not AI clients. See [telique.ringer.tel](https://telique.ringer.tel) |

### Recommended — Hosted connector

- **URL:** `https://api.telique.ringer.tel/mcp`

Add the URL as a remote MCP server, then sign in with your Telique account when the browser opens. The connector gets its own credentials for each session, so never paste a Telique API key into your AI client for this surface.

**Claude Code**

```bash
claude mcp add -s user --transport http telique https://api.telique.ringer.tel/mcp
```

Then run `/mcp` in Claude Code and choose **Authenticate**.

**Codex (CLI and Desktop)**

```bash
codex mcp add telique --url https://api.telique.ringer.tel/mcp
codex mcp login telique
```

> **Known issue:** Codex currently refuses to start sign-in for the hosted connector (`OAuth authorization endpoint origin does not match the authorization server origin`). A server-side fix is tracked in [#13](https://github.com/Ringer/telique-mcp/issues/13). Until it ships, use the [npm stdio surface](#npm-stdio--advanced--offline) with Codex.

**claude.ai, Claude Desktop and Claude mobile:** open **Customize → Connectors**, choose **Add connector**, and add a custom connector with the URL. A connector added on claude.ai also appears in Claude Desktop and mobile.

**ChatGPT:** open **Plugins**, choose **Add → Add custom MCP server**, enter the URL with **OAuth** authentication, then **Continue** to sign in. Custom MCP servers depend on your ChatGPT plan and workspace settings.

To reconnect after signing out or revoking access, run the client's authenticate or login step again (`/mcp` in Claude Code, `codex mcp login telique`, or **Connect** in the claude.ai connector or ChatGPT plugin settings).

**Switching from npm stdio?** `telique-mcp setup` registers its stdio server as `telique` too. Remove it before adding the hosted connector (`claude mcp remove -s user telique`, `codex mcp remove telique`, or delete the `telique` entry from the client's JSON config) so the two surfaces don't shadow each other.

`mcp.telique.ringer.tel` is retired and no longer resolves. If a client still points at it, remove that entry and add the URL above.

### npm stdio — advanced / offline

For CI, local development, or clients that don't support remote MCP. Stores a long-lived `tlq_…` token at `~/.telique/config.json`.

```bash
npm install -g telique-mcp
telique-mcp setup
```

The setup wizard detects installed AI clients and registers automatically.

> ⚠️ **Install only one surface.** Running both exposes the same tools under overlapping namespaces and causes confusing shadowing of tool results.

## What You Get

| Tool | What it does |
|------|-------------|
| **lookup_tn** | Full profile of any phone number (LRN, CNAM, DNO, LERG — all in one call) |
| **lrn_lookup** | Local Routing Number and carrier (SPID) for a phone number |
| **cnam_lookup** | Caller ID name for a phone number |
| **dno_check** | Check if a number is on the Do Not Originate list (spoofing indicator) |
| **lerg_query** | Query 27 LERG telecom routing tables (carriers, switches, rate centers, LATAs) |
| **lerg_tandem** | Tandem switch routing for an NPA-NXX |
| **lerg_complex_query** | Multi-table JOIN queries across LERG tables |
| **lerg_table_info** | List tables or get schema for any of 27 LERG tables |
| **routelink_lookup** | Carrier (CIC) or Responsible Org (ROR) for a toll-free number |
| **routelink_ror_query** | List toll-free numbers or CPRs managed by a Responsible Org |
| **routelink_cpr** | Full call routing decision tree for a toll-free number |
| **graphql_query** | GraphQL queries against LSMS (live porting data) or LERG (routing reference) |
| **lrn_relationship_query** | Find phone numbers by LRN, SPIDs by phone number, etc. |

## Example Queries

Once installed, just ask your AI assistant:

- *"Look up the caller ID for 303-629-8301"*
- *"What carrier owns NPA-NXX 720-708?"*
- *"Is 877-382-4357 on the Do Not Originate list?"*
- *"Show me the tandem routing for 303-629"*
- *"Who is the RespOrg for 800-221-1212?"*
- *"Give me a full profile on 303-629-8301"*

## API Key

The hosted connector needs no API key; you sign in instead. The npm stdio surface and the direct API need one. Every account includes one, free accounts too: get yours at [app.telique.ringer.tel](https://app.telique.ringer.tel). Free-account keys allow 10 requests per 60 seconds.

Enter your key during setup or update it later by running `telique-mcp setup` again.

## Supported Clients

The hosted connector works with any client that supports remote MCP with OAuth (see [Install](#install)).

For the npm stdio surface, the setup wizard auto-detects and registers with:

- Claude Code
- Claude Desktop
- Cursor
- GitHub Copilot (VS Code)
- Codex CLI
- Codex Desktop (macOS — also configured automatically when only the .app is installed; CLI and Desktop share `~/.codex/config.toml`)

See [INSTALL.md](INSTALL.md) for manual configuration and platform-specific paths.

## Links

- [Detailed install guide](INSTALL.md)
- [Hosted connector release checklist](docs/hosted-connector-checklist.md)
- [GitHub](https://github.com/Ringer/telique-mcp)
- [npm](https://www.npmjs.com/package/telique-mcp)
