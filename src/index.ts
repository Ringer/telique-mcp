#!/usr/bin/env node
import { loadConfig } from "./config.js";

const subcommand = process.argv[2];

if (subcommand === "setup") {
  const { runSetup } = await import("./setup.js");
  await runSetup();
} else {
  const { McpServer } = await import(
    "@modelcontextprotocol/sdk/server/mcp.js"
  );
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const { TeliqueClient } = await import("./client.js");
  const { setAnonymousMode } = await import("./utils/formatting.js");
  const { registerRoutelinkTools } = await import("./tools/routelink.js");
  const { registerLrnTools } = await import("./tools/lrn.js");
  const { registerCnamTools } = await import("./tools/cnam.js");
  const { registerLergTools } = await import("./tools/lerg.js");
  const { registerGraphqlTools } = await import("./tools/graphql.js");
  const { registerCompositeTools } = await import("./tools/composite.js");

  const config = loadConfig();
  const client = new TeliqueClient(config);

  setAnonymousMode(client.isAnonymous);

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
}
