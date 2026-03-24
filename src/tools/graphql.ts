import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse, errorResult } from "../utils/formatting.js";

export function registerGraphqlTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "graphql_query",
    `Execute GraphQL queries against LSMS or LERG databases.

LSMS (service='lsms'): Live NPAC porting data. Tables: subscriptionVersions (514M rows — MUST filter by phone_number, lrn, or spid), numberBlocks, serviceProviders, locationRoutingNumbers, npanxx. Safety limits: max 1000 results, depth 5, complexity 200, 10s timeout.

LERG (service='lerg'): Static telecom reference data. All 27 LERG tables with camelCase names (lerg1, lerg6, lerg7Sha, etc.). Supports relationship joins: lerg6→carrier (via OCN→lerg1), lerg6→switchInfo (→lerg7), lerg7Sha→tandemSwitch. Filter operators: EQ, NE, GT, GTE, LT, LTE, LIKE, IN, IS_NULL, IS_NOT_NULL. All field values are nullable strings.`,
    {
      service: z
        .enum(["lsms", "lerg"])
        .describe(
          "Target service: 'lsms' for live porting data, 'lerg' for static telecom reference"
        ),
      query: z.string().describe("GraphQL query string"),
      variables: z
        .record(z.unknown())
        .optional()
        .describe("Optional GraphQL variables"),
    },
    async ({ service, query, variables }) => {
      const path =
        service === "lsms"
          ? "/v1/telique/lsms/gql"
          : "/v1/telique/lerg/gql";

      const body: Record<string, unknown> = { query };
      if (variables) body.variables = variables;

      const result = await client.post(path, body);
      return formatResponse(result);
    }
  );
}
