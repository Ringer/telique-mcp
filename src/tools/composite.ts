import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "../client.js";
import { formatResponse } from "../utils/formatting.js";

export function registerCompositeTools(
  server: McpServer,
  client: TeliqueClient
): void {
  server.tool(
    "lookup_tn",
    "Composite phone number lookup across multiple Telique services. Dips LRN, CNAM, DNO, and LERG (NPA-NXX from lerg_6) in parallel and returns a consolidated view. Use this for a quick, comprehensive profile of any phone number.",
    {
      phone_number: z
        .string()
        .regex(/^\d{10}$/)
        .describe("10-digit US phone number"),
    },
    async ({ phone_number }) => {
      const npa = phone_number.substring(0, 3);
      const nxx = phone_number.substring(3, 6);

      const [lrn, cnam, dno, lerg] = await Promise.all([
        client
          .get(`/v1/telique/lrn/${phone_number}`, { format: "json" })
          .catch((err: Error) => ({ _error: true, message: err.message })),
        client
          .get(`/v1/telique/cnam/${phone_number}`)
          .catch((err: Error) => ({ _error: true, message: err.message })),
        client
          .get(`/v1/telique/dno/${phone_number}`, { format: "json" })
          .catch((err: Error) => ({ _error: true, message: err.message })),
        client
          .get(
            `/v1/telique/lerg/lerg_6/npa,nxx,loc_name,loc_state,lata,lata_name,ocn,switch,rc_abbre,rc_type/npa=${npa}%26nxx=${nxx}`,
            { limit: 5 }
          )
          .catch((err: Error) => ({ _error: true, message: err.message })),
      ]);

      const consolidated = {
        phone_number,
        npa,
        nxx,
        lrn,
        cnam,
        dno,
        lerg_6: lerg,
      };

      return formatResponse(consolidated);
    }
  );
}
