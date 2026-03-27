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
    "Returns the Telique MCP server version, authentication mode, and API connectivity status. Use this when asked about the server version or connection status.",
    {},
    READ_ONLY_ANNOTATIONS,
    async () => {
      let apiReachable = false;
      try {
        const result = await client.get("/health");
        apiReachable =
          typeof result === "object" &&
          result !== null &&
          !("_error" in result);
      } catch {
        // unreachable
      }

      return formatResponse({
        server: "telique-mcp",
        version: VERSION,
        mode: client.isAnonymous ? "anonymous (10 ops/min)" : "authenticated",
        api_connected: apiReachable,
        api_base_url: "https://api-dev.ringer.tel",
        tools_count: 14,
      });
    }
  );
}
