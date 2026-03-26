// Library exports for use by the remote MCP server and other consumers

// Client
export { TeliqueClient } from "./client.js";
export type { Config } from "./config.js";

// Tool registrars
export { registerRoutelinkTools } from "./tools/routelink.js";
export { registerLrnTools } from "./tools/lrn.js";
export { registerCnamTools } from "./tools/cnam.js";
export { registerLergTools } from "./tools/lerg.js";
export { registerGraphqlTools } from "./tools/graphql.js";
export { registerCompositeTools } from "./tools/composite.js";
export { registerStatusTools } from "./tools/status.js";

// Knowledge / prompts
export { registerKnowledge, TELIQUE_KNOWLEDGE } from "./knowledge.js";

// Metadata
export { ICONS, ICON_LIGHT_DATA_URI, ICON_DARK_DATA_URI } from "./icons.js";
export { VERSION } from "./version.js";

// Types
export type { ToolRegistrar } from "./types.js";
