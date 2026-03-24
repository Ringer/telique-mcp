export interface Config {
  baseUrl: string;
  apiToken: string;
  requestTimeoutMs: number;
}

export function loadConfig(): Config {
  const apiToken = process.env.TELIQUE_API_TOKEN;
  if (!apiToken) {
    console.error(
      "TELIQUE_API_TOKEN environment variable is required.\n" +
        "Set it in your MCP client config or export it in your shell."
    );
    process.exit(1);
  }

  return {
    baseUrl: process.env.TELIQUE_API_BASE_URL || "https://api-dev.ringer.tel",
    apiToken,
    requestTimeoutMs: parseInt(
      process.env.TELIQUE_REQUEST_TIMEOUT_MS || "10000",
      10
    ),
  };
}
