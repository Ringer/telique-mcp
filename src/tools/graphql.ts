import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse, errorResult } from "../utils/formatting.js";
import { READ_ONLY_ANNOTATIONS } from "../annotations.js";

export function registerGraphqlTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "graphql_query",
    `Execute GraphQL queries against LSMS or LERG. These are DISTINCT APIs with different schemas — do not mix their syntax.

LSMS (service='lsms'): Live NPAC porting data. Uses named query parameters (NOT FilterInput). Key queries: subscriptionVersion(phoneNumber), subscriptionVersionsByLrn(lrn, limit), subscriptionVersionsBySpid(spid, limit), numberBlock(npanxxx), serviceProviders(limit), locationRoutingNumber(lrn), npanxxBySpid(spid, limit), lsmsStats. Relationships: subscriptionVersion→serviceProvider, →lrnMetadata. Safety limits: max 1000 results, 10s timeout. Large tables (subscriptionVersions 514M rows) MUST be filtered.

LERG (service='lerg'): Static telecom reference. Uses FilterInput with operators. 27 tables with camelCase names (lerg1, lerg6, lerg7Sha). Return fields MUST be camelCase (ocnName not ocn_name). LIKE patterns MUST be UPPERCASE. Filter syntax: { field: "ocnName", op: LIKE, value: "%VERIZON%" }. IN uses 'values' plural. Relationships: lerg6→carrier, →switchInfo, →homingArrangements. Also supports dynamicJoin for arbitrary cross-table SQL joins.`,
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
    READ_ONLY_ANNOTATIONS,
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
