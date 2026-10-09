import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { VERSION } from "../version.js";
import { formatResponse } from "../utils/formatting.js";
import { READ_ONLY_ANNOTATIONS } from "../annotations.js";

export function registerStatusTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "telique_status",
    "Returns the Telique MCP server version, whether an API token is configured, and whether the Telique API is reachable. Does not spend an API request. Use this when asked about the server version or connection status.",
    {},
    READ_ONLY_ANNOTATIONS,
    async () => {
      const probe = await client.probe();

      return formatResponse({
        server: "telique-mcp",
        version: VERSION,
        mode: client.isAnonymous ? "no API token configured" : "API token configured",
        api_connected: probe.reachable,
        api_base_url: client.apiBaseUrl,
        tools_count: 14,
      });
    }
  );
}
