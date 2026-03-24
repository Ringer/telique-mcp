#!/usr/bin/env node
import { stdin } from "node:process";

const subcommand = process.argv[2];

// If run with "setup" arg, or directly in a terminal (not piped by an MCP client),
// launch the interactive setup flow.
const isInteractiveTerminal = subcommand !== "serve" && stdin.isTTY === true;

if (subcommand === "setup" || isInteractiveTerminal) {
  const { runSetup } = await import("./setup.js");
  await runSetup();
} else {
  // MCP server mode — stdin is piped JSON-RPC from the MCP client
  const { McpServer } = await import(
    "@modelcontextprotocol/sdk/server/mcp.js"
  );
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const { TeliqueClient } = await import("./client.js");
  const { loadConfig } = await import("./config.js");
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
