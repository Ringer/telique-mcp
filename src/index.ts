#!/usr/bin/env node

const subcommand = process.argv[2];

if (subcommand === "setup") {
  // Explicit setup command
  const { runSetup } = await import("./setup.js");
  await runSetup();
} else if (!subcommand && process.stdin.isTTY && !process.env.MCP_CLIENT) {
  // No args + interactive terminal + not spawned by an MCP client.
  // Show a short help message pointing to setup.
  console.log(`
  telique-mcp v${(await import("./version.js")).VERSION}

  Usage:
    telique-mcp setup    Interactive setup wizard
    telique-mcp          MCP server (stdio) — used by MCP clients

  Run 'telique-mcp setup' to configure your API key and register
  with your MCP clients (Claude, Cursor, Copilot, Codex, ChatGPT).
`);
} else {
  // MCP server mode — default when spawned by an MCP client
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
  const { registerKnowledge, TELIQUE_KNOWLEDGE } = await import(
    "./knowledge.js"
  );
  const { registerCompositeTools } = await import("./tools/composite.js");
  const { ICONS } = await import("./icons.js");
  const { VERSION } = await import("./version.js");

  const config = loadConfig();
  const client = new TeliqueClient(config);

  setAnonymousMode(client.isAnonymous);

  const server = new McpServer(
    {
      name: "telique",
      version: VERSION,
      title: "Telique",
      description:
        "Telecom data APIs — LRN, CNAM, DNO, LERG (27 tables), RouteLink toll-free routing, and LSMS/LERG GraphQL",
      icons: ICONS,
      websiteUrl: "https://telique.ringer.tel",
    },
    {
      instructions: TELIQUE_KNOWLEDGE,
    }
  );

  registerRoutelinkTools(server, client);
  registerLrnTools(server, client);
  registerCnamTools(server, client);
  registerLergTools(server, client);
  registerGraphqlTools(server, client);
  registerCompositeTools(server, client);
  registerKnowledge(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
