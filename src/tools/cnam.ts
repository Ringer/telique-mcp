import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse } from "../utils/formatting.js";

export function registerCnamTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "cnam_lookup",
    "Look up the Caller Name (CNAM) for a phone number via TransUnion LIDB. Returns the calling_name (up to 15 characters), calling_name_status (available/unavailable), and presentation_indicator (allowed/restricted). Results are cached server-side for 24 hours.",
    {
      phone_number: z
        .string()
        .regex(/^\d{10,15}$/)
        .describe("10-15 digit phone number to look up"),
    },
    async ({ phone_number }) => {
      const result = await client.get(`/v1/telique/cnam/${phone_number}`);
      return formatResponse(result);
    }
  );
}
