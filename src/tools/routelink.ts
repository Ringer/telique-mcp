import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse, errorResult } from "../utils/formatting.js";

export function registerRoutelinkTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "routelink_lookup",
    "Look up toll-free number routing. Resolves a CRN (toll-free number) to its carrier (CIC), Responsible Organization (ROR), or both. CIC lookup interprets the CPR decision tree using the caller's ANI and LATA to determine which carrier handles the call.",
    {
      crn: z
        .string()
        .regex(/^\d{10}$/)
        .describe("10-digit toll-free number (CRN), e.g. 8005551234"),
      lookup_type: z
        .enum(["cic", "cicror", "ror"])
        .describe(
          "Type of lookup: 'cic' = carrier ID, 'ror' = responsible org, 'cicror' = both"
        ),
      ani: z
        .string()
        .regex(/^\d{10}$/)
        .optional()
        .describe(
          "10-digit calling party number (required for cic and cicror lookups)"
        ),
      lata: z
        .string()
        .regex(/^\d{3}$/)
        .optional()
        .describe("3-digit LATA code (required for cic and cicror lookups)"),
    },
    async ({ crn, lookup_type, ani, lata }) => {
      if (
        (lookup_type === "cic" || lookup_type === "cicror") &&
        (!ani || !lata)
      ) {
        return errorResult(
          "ani and lata are required for cic and cicror lookups"
        );
      }

      let path: string;
      if (lookup_type === "ror") {
        path = `/v1/telique/ror/${crn}`;
      } else {
        path = `/v1/telique/${lookup_type}/${crn}/${ani}/${lata}`;
      }

      const result = await client.get(path, { format: "json" });
      return formatResponse(result);
    }
  );

  server.tool(
    "routelink_ror_query",
    "List toll-free numbers (TFNs) or Call Processing Records (CPRs) associated with a Responsible Organization (ROR). Use this to explore which toll-free numbers a specific organization manages.",
    {
      ror: z
        .string()
        .regex(/^[A-Za-z0-9]{1,5}$/)
        .describe("1-5 character alphanumeric ROR code (e.g. ATX01, CTJLE)"),
      resource_type: z
        .enum(["tfns", "cprs"])
        .describe("Whether to list TFNs or CPRs for this ROR"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .default(100)
        .describe("Max results to return (default 100, max 10000)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Pagination offset (default 0)"),
    },
    async ({ ror, resource_type, limit, offset }) => {
      const result = await client.get(
        `/v1/telique/ror/${ror}/${resource_type}`,
        { format: "json", limit, offset }
      );
      return formatResponse(result);
    }
  );

  server.tool(
    "routelink_cpr",
    "Retrieve the full Call Processing Record (CPR) for a toll-free number. A CPR is a routing decision tree that determines how calls are routed based on LATA, NPA, NXX, ANI, DAY_OF_WEEK, TIME_OF_DAY, PERCENT, STATE, etc. Returns the CPR structure, SHA1 hash, ROR, and optionally expanded template references.",
    {
      crn: z
        .string()
        .regex(/^\d{1,10}$/)
        .describe(
          "1-10 digit CRN (toll-free number or template CRN). Shorter values are zero-padded to 10 digits."
        ),
      expand: z
        .boolean()
        .default(true)
        .describe(
          "Recursively resolve and inline template decision trees (default true)"
        ),
    },
    async ({ crn, expand }) => {
      // NOTE: /v1/telique/cpr/* path pending frontend URL map addition.
      // Falls back to /cpr/ which routes to routelink via default backend.
      const result = await client.get(`/v1/telique/cpr/${crn}`, {
        format: "json",
        expand: expand ? "true" : "false",
      });
      return formatResponse(result);
    }
  );
}
