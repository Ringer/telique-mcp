import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse, errorResult } from "../utils/formatting.js";
import { READ_ONLY_ANNOTATIONS } from "../annotations.js";

export function registerLrnTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "lrn_lookup",
    "Look up the Local Routing Number (LRN) for a phone number. Returns the LRN, SPID (Service Provider ID), LNP type, and activation timestamp. LRN identifies the switch that serves a ported phone number. This queries live LSMS/NPAC porting data.",
    {
      phone_number: z
        .string()
        .regex(/^\d{10}$/)
        .describe("10-digit US phone number"),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ phone_number }) => {
      const result = await client.get(`/v1/telique/lrn/${phone_number}`, {
        format: "json",
      });
      return formatResponse(result);
    }
  );

  server.tool(
    "lrn_relationship_query",
    "Query relationships in the LSMS database. Find phone numbers by LRN, SPIDs by LRN or phone number, or LRNs by SPID or phone number. Queries live NPAC porting data (not static LERG reference data).",
    {
      query_type: z
        .enum([
          "phones_by_lrn",
          "phones_by_spid",
          "spid_by_lrn",
          "spid_by_phone",
          "lrn_by_spid",
          "lrn_by_phone",
        ])
        .describe("Type of relationship query"),
      value: z
        .string()
        .describe(
          "The LRN, SPID, or phone number to query by (depends on query_type)"
        ),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ query_type, value }) => {
      const routeMap: Record<string, { resource: string; param: string }> = {
        phones_by_lrn: { resource: "phone_number", param: "lrn" },
        phones_by_spid: { resource: "phone_number", param: "spid" },
        spid_by_lrn: { resource: "spid", param: "lrn" },
        spid_by_phone: { resource: "spid", param: "phone_number" },
        lrn_by_spid: { resource: "lrn", param: "spid" },
        lrn_by_phone: { resource: "lrn", param: "phone_number" },
      };

      const route = routeMap[query_type];
      if (!route) {
        return errorResult(`Unknown query_type: ${query_type}`);
      }

      const result = await client.get(
        `/v1/telique/lsms/list/${route.resource}`,
        { [route.param]: value }
      );
      return formatResponse(result);
    }
  );

  server.tool(
    "dno_check",
    "Check if a phone number is on the Do Not Originate (DNO) list. DNO numbers should never appear as a caller ID because they belong to entities that only receive calls (e.g., IRS, major banks). A match indicates potential caller ID spoofing. Supports prefix matching (3, 6, 7, or 10 digit patterns).",
    {
      phone_number: z
        .string()
        .regex(/^\d{10}$/)
        .describe("10-digit US phone number to check"),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ phone_number }) => {
      const result = await client.get(`/v1/telique/dno/${phone_number}`, {
        format: "json",
      });
      return formatResponse(result);
    }
  );
}
