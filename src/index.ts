#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { TeliqueClient } from "./client.js";
import { registerRoutelinkTools } from "./tools/routelink.js";
import { registerLrnTools } from "./tools/lrn.js";
import { registerCnamTools } from "./tools/cnam.js";
import { registerLergTools } from "./tools/lerg.js";
import { registerGraphqlTools } from "./tools/graphql.js";
import { registerCompositeTools } from "./tools/composite.js";

const config = loadConfig();
const client = new TeliqueClient(config);

const server = new McpServer({
  name: "telique",
  version: "1.0.0",
});

registerRoutelinkTools(server, client);
registerLrnTools(server, client);
registerCnamTools(server, client);
registerLergTools(server, client);
registerGraphqlTools(server, client);
registerCompositeTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
