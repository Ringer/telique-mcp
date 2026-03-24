import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "./client.js";

export type ToolRegistrar = (server: McpServer, client: TeliqueClient) => void;
