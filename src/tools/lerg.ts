import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse } from "../utils/formatting.js";

const LERG_TABLES = [
  "lerg_1",
  "lerg_1_con",
  "lerg_2",
  "lerg_3",
  "lerg_4",
  "lerg_5",
  "lerg_6",
  "lerg_6_atc",
  "lerg_6_ins",
  "lerg_6_odd",
  "lerg_7",
  "lerg_7_ins",
  "lerg_7_sha",
  "lerg_7_sha_ins",
  "lerg_8",
  "lerg_8_lir",
  "lerg_8_loc",
  "lerg_8_pst",
  "lerg_9",
  "lerg_9_atc",
  "lerg_10",
  "lerg_11",
  "lerg_12",
  "lerg_12_ins",
  "lerg_16",
  "lerg_17",
  "lergdate",
] as const;

export function registerLergTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "lerg_table_info",
    "List all 27 LERG tables or get metadata/schema for a specific table. LERG is static telecom reference data. Key tables: lerg_1 (OCN/carrier directory), lerg_6 (NPA-NXX block assignments with switch, LATA, rate center), lerg_7 (switch details), lerg_7_sha (switch homing arrangements/tandems), lerg_12 (LRN registry).",
    {
      table_name: z
        .string()
        .optional()
        .describe(
          "Specific table name (e.g. lerg_1, lerg_6, lerg_7_sha). Omit to list all tables."
        ),
    },
    async ({ table_name }) => {
      if (table_name) {
        const result = await client.get(
          `/v1/telique/lerg/tables/${table_name}`
        );
        return formatResponse(result);
      }
      const result = await client.get("/v1/telique/lerg/tables");
      return formatResponse(result);
    }
  );

  server.tool(
    "lerg_query",
    "Query any LERG table by field values. Common queries: carrier by OCN (lerg_1, fields: ocn_num,ocn_name,ocn_state), NPA-NXX info (lerg_6, fields: npa,nxx,loc_name,ocn,switch,lata), switch details (lerg_7, fields: switch,ocn,aocn), LRN registry (lerg_12, fields: lrn,lata,switch,ocn). Filter format: field=value, multiple filters joined with & (e.g. npa=303&nxx=629).",
    {
      table_name: z.string().describe("Table to query (e.g. lerg_1, lerg_6)"),
      fields: z
        .string()
        .describe(
          "Comma-separated field names to return (e.g. ocn_num,ocn_name,ocn_state)"
        ),
      query: z
        .string()
        .describe(
          "Filter in field=value format, multiple filters joined with & (e.g. ocn_state=CO or npa=303&nxx=629)"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .default(100)
        .describe("Max results (default 100, max 10000)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Pagination offset (default 0)"),
    },
    async ({ table_name, fields, query, limit, offset }) => {
      // Encode & as %26 so multi-filters stay in the path segment
      const encodedQuery = query.replace(/&/g, "%26");
      const result = await client.get(
        `/v1/telique/lerg/${table_name}/${fields}/${encodedQuery}`,
        { limit, offset }
      );
      return formatResponse(result);
    }
  );

  server.tool(
    "lerg_complex_query",
    "Execute a complex LERG query with JOINs across multiple tables. Supports filter operators: eq, ne, gt, gte, lt, lte, like, in, isnull, isnotnull. Use this when you need to combine data from different LERG tables, such as joining NPA-NXX (lerg_6) with carrier info (lerg_1) via OCN.",
    {
      table: z.string().describe("Primary table name (e.g. lerg_6)"),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Fields to return from primary table (e.g. ['npa','nxx','ocn','loc_name'])"
        ),
      filters: z
        .array(
          z.object({
            field: z.string(),
            operator: z.enum([
              "eq",
              "ne",
              "gt",
              "gte",
              "lt",
              "lte",
              "like",
              "in",
              "isnull",
              "isnotnull",
            ]),
            value: z.union([z.string(), z.number()]),
          })
        )
        .describe(
          "Filter conditions (e.g. [{field:'npa', operator:'eq', value:720}])"
        ),
      join: z
        .object({
          table: z.string().describe("Table to join (e.g. lerg_1)"),
          on: z
            .array(
              z.object({
                left_field: z.string(),
                right_field: z.string(),
              })
            )
            .describe(
              "Join conditions (e.g. [{left_field:'ocn', right_field:'ocn_num'}])"
            ),
          fields: z
            .array(z.string())
            .optional()
            .describe("Fields to return from joined table"),
          join_type: z
            .enum(["inner", "left"])
            .default("inner")
            .describe("Join type"),
        })
        .optional()
        .describe("Optional JOIN clause"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .default(100)
        .describe("Max results (default 100)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Pagination offset (default 0)"),
    },
    async ({ table, fields, filters, join, limit, offset }) => {
      const body: Record<string, unknown> = {
        table,
        filters,
        limit,
        offset,
      };
      if (fields) body.fields = fields;
      if (join) body.join = join;

      const result = await client.post("/v1/telique/lerg/query", body);
      return formatResponse(result);
    }
  );

  server.tool(
    "lerg_tandem",
    "Look up tandem routing information for a given NPA-NXX. Returns the tandem switch and routing path for calls to a specific area code and exchange. Uses SQL JOINs across LERG tables (lerg_6, lerg_7, lerg_7_sha) for comprehensive routing data.",
    {
      npa: z.string().regex(/^\d{3}$/).describe("3-digit area code (NPA)"),
      nxx: z.string().regex(/^\d{3}$/).describe("3-digit exchange code (NXX)"),
    },
    async ({ npa, nxx }) => {
      const result = await client.get("/v1/telique/lerg/tandem", { npa, nxx });
      return formatResponse(result);
    }
  );
}
