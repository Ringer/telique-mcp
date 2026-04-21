# Telique MCP

Telecom data tools for AI assistants. Query LRN, CNAM, DNO, LERG routing tables, toll-free routing, and more — directly from Claude, ChatGPT, Copilot, Cursor, or Codex.

## Install

Pick **one** install surface.

### Recommended — Hosted connector

OAuth-authenticated. Works on claude.ai, Claude Desktop, Claude Code, and Claude mobile. No local Node runtime.

- **URL:** `https://mcp.telique.ringer.tel`
- Add it as a custom MCP connector in your Claude client's settings.

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

Works without an API key at 10 operations per minute. For unlimited access, get a key at [telique.ringer.tel](https://telique.ringer.tel).

Enter your key during setup or update it later by running `telique-mcp setup` again.

## Supported Clients

The setup wizard auto-detects and registers with:

- Claude Code
- Claude Desktop
- Cursor
- GitHub Copilot (VS Code)
- Codex CLI
- ChatGPT Desktop (manual setup)

See [INSTALL.md](INSTALL.md) for manual configuration and platform-specific paths.

## Links

- [Detailed install guide](INSTALL.md)
- [GitHub](https://github.com/Ringer/telique-mcp)
- [npm](https://www.npmjs.com/package/telique-mcp)
