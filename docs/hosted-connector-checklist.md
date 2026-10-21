# Hosted connector release checklist

Run this before publishing documentation or client registrations that point at the hosted connector, and after any OAuth or hosted-MCP deploy in `Ringer/ringer-telique`. The hosted runtime, OAuth server and edge routing live in that repository; this repository only documents them.

- **MCP resource:** `https://api.telique.ringer.tel/mcp`
- **Issuer:** `https://api.telique.ringer.tel`
- **Authorize page:** `https://app.telique.ringer.tel/oauth/authorize`
- **Scope:** `telique:read`

## 1. Automated checks (no credentials)

These checks need no user credential. The registration check creates an unactivated client, and the backend deletes it automatically if no one signs in with it.

```bash
BASE=https://api.telique.ringer.tel

# Protected resource metadata names the canonical resource and issuer.
curl -s $BASE/.well-known/oauth-protected-resource/mcp
# expect: "resource":"https://api.telique.ringer.tel/mcp", "authorization_servers":["https://api.telique.ringer.tel"]

# Authorization server metadata advertises both grants and S256 PKCE.
curl -s $BASE/.well-known/oauth-authorization-server
# expect: "grant_types_supported":["authorization_code","refresh_token"], "code_challenge_methods_supported":["S256"]

# An unauthenticated MCP call is refused with a pointer to the metadata.
curl -s -i -X POST $BASE/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | grep -i -E '^HTTP|www-authenticate'
# expect: 401 and WWW-Authenticate: Bearer resource_metadata="https://api.telique.ringer.tel/.well-known/oauth-protected-resource/mcp"

# Dynamic client registration accepts what desktop clients send.
for uri in http://localhost:53111/callback http://127.0.0.1:53111/callback; do
  curl -s -o /dev/null -w "$uri -> %{http_code}\n" -X POST $BASE/oauth/register \
    -H 'content-type: application/json' \
    -d "{\"client_name\":\"release smoke\",\"redirect_uris\":[\"$uri\"],\"grant_types\":[\"authorization_code\",\"refresh_token\"],\"token_endpoint_auth_method\":\"none\"}"
done
# expect: 201 for both
```

## 2. Per-client verification (operator, signed in)

Do this for **Claude Code**, **Codex**, **claude.ai** and **ChatGPT**. Use a test account with access to at least the `lerg_table_info` and `lookup_tn` tools.

| Step | Pass when |
|---|---|
| Add the server | Claude Code: `claude mcp add --transport http telique https://api.telique.ringer.tel/mcp`. Codex: `codex mcp add telique --url https://api.telique.ringer.tel/mcp`. claude.ai or ChatGPT: add a custom connector with the URL. |
| Discovery and registration | The client opens the authorize page with no "couldn't register" error. |
| Browser login and consent | The authorize page shows the account, `telique:read` and the principal picker. **Authorize** returns to the client with no `error=` in the redirect. |
| Token exchange | The client reports the server as connected or authenticated. |
| `tools/list` | 14 tools are listed. |
| Representative `tools/call` | `lerg_table_info` with no table returns the table list, and `lookup_tn` for `3036298301` returns LRN, CNAM, DNO and LERG data. |
| Refresh | After the access token expires (or after the client restarts), calls keep working without a new browser login. |
| Revoke | Disconnecting or signing out in the client (which calls `/oauth/revoke`) makes the next call fail with an authentication error, not a data error. |
| Reconnect | The client's authenticate or login step (`/mcp` → Authenticate, `codex mcp login telique`, **Connect**) restores access. |

If a step fails, note the client, the time in UTC and any `request_id`, then check the OAuth logs in `ringer-telique` (`OAuth consent refused`, `OAuth token refused`, refused registrations).

## 3. Client registrations

- **ChatGPT app:** points at `https://api.telique.ringer.tel/mcp`.
- **claude.ai connector instructions:** use the same URL.
- No registration or documentation still names `mcp.telique.ringer.tel`.
