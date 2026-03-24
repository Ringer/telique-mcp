import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerKnowledge(server: McpServer): void {
  server.prompt(
    "telique-guide",
    "Comprehensive guide to Telique telecom APIs — LERG vs LSMS data boundary, routing lookup patterns, LERG table reference, CPR interpretation, CNAM, DNO, and common mistakes to avoid. Load this before answering telecom questions.",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: TELIQUE_KNOWLEDGE,
          },
        },
      ],
    })
  );
}

export const TELIQUE_KNOWLEDGE = `# Telique Telecom API Knowledge Base

You have access to 13 Telique tools for querying live telecom data. NEVER guess carrier names, LRNs, routing data, or CNAM — always query the API.

---

## CRITICAL: LERG vs LSMS — Two Different Databases

**LERG** = Static telecom infrastructure reference (updated monthly from iconectiv BIRRDS)
- NPA-NXX assignments, switches, tandems, homing arrangements, rate centers, LATAs, carrier names by OCN
- 27 tables. NO individual phone number data.
- Query with: \`lerg_query\`, \`lerg_complex_query\`, \`lerg_tandem\`, \`lerg_table_info\`, or \`graphql_query(service="lerg")\`

**LSMS** = Live NPAC porting data (refreshed within minutes)
- Phone number ownership (SPID), LRN assignments, porting state
- NO routing infrastructure (no tandems, switches, homing, rate centers, OCN names)
- Query with: \`lrn_lookup\`, \`lrn_relationship_query\`, or \`graphql_query(service="lsms")\`

| Data Type | Database | Tool |
|-----------|----------|------|
| Tandem switches | **LERG** | \`lerg_tandem\` |
| Switch/CLLI details | **LERG** | \`lerg_query\` on lerg_7 |
| Homing arrangements | **LERG** | \`lerg_query\` on lerg_7_sha |
| NPA-NXX routing (OCN, switch, LATA, rate center) | **LERG** | \`lerg_query\` on lerg_6 |
| Carrier/OCN names | **LERG** | \`lerg_query\` on lerg_1 |
| Current TN ownership (SPID) | **LSMS** | \`lrn_lookup\` |
| Current LRN for a TN | **LSMS** | \`lrn_lookup\` |
| Porting state | **LSMS** | \`lrn_relationship_query\` or GraphQL |

---

## CRITICAL: Always Dip the LRN First

A ported phone number's NPA-NXX often differs from its LRN's NPA-NXX. For ANY routing question about a specific phone number:

1. **\`lrn_lookup\`** → get the LRN and SPID
2. Extract NPA-NXX from the **LRN** (first 3 digits = NPA, next 3 = NXX)
3. Use the **LRN's** NPA-NXX for all LERG lookups

**Example:** TN 303-629-8301
- WRONG: Look up 303-629 in LERG → returns the original carrier's data (before porting)
- CORRECT: \`lrn_lookup("3036298301")\` → LRN = 7207081999 → look up 720-708 in LERG → returns current carrier

This applies to: tandem, switch, LATA, OCN, rate center — anything keyed by NPA-NXX.

### The Golden Pattern for Routing Questions

\`\`\`
Step 1: lrn_lookup({phone_number}) → get LRN and SPID
Step 2: Extract NPA (first 3 digits of LRN) and NXX (next 3 digits of LRN)
Step 3: Use LRN's NPA-NXX for LERG queries:
  - lerg_tandem({npa, nxx})           → tandem switch
  - lerg_query("lerg_6", ..., "npa={npa}&nxx={nxx}")  → OCN, switch, LATA, rate center
  - lerg_query("lerg_7", ..., "switch={clli}")         → switch details
\`\`\`

Or use \`lookup_tn\` for a quick consolidated view (dips LRN + CNAM + DNO + LERG in parallel).

---

## LERG Table Reference

### Big 4 — Cover ~80% of Queries

**lerg_1** — OCN/carrier directory
- Fields: ocn_num, ocn_name, abbre_ocn_name, ocn_state, category, overall_ocn
- Use: Look up carrier name by OCN. Join from lerg_6 \`ocn\` → lerg_1 \`ocn_num\`.
- Example: \`lerg_query("lerg_1", "ocn_num,ocn_name,ocn_state", "ocn_num=567G")\`

**lerg_6** — NPA-NXX block assignments (the workhorse)
- Fields: npa, nxx, block_id, lata, lata_name, loc_state, ocn, aocn, switch, sha_indicator, rc_abbre, rc_type, coc_type, eff_date, status
- Has LATA + state + NPA + NXX + OCN + switch + rate center all on one row.
- BLOCK="A" = full NXX assignment; numeric 0-9 = thousands-block pooling.
- Example: \`lerg_query("lerg_6", "npa,nxx,loc_name,loc_state,ocn,switch,lata", "npa=720&nxx=708")\`

**lerg_7_sha** — Switch homing arrangements
- Fields: switch, sha_indicator, h_trm_d_tdm (FGD tandem), host, ocn
- Match \`switch\` + \`sha_indicator\` from lerg_6 to find the correct tandem.
- Or use \`lerg_tandem\` which does the join automatically.

**lerg_12** — LRN registry
- Fields: lrn, lata, lata_name, switch, ocn, status, eff_date
- Which company/switch established each LRN.

### Supporting Tables

| Table | Purpose |
|-------|---------|
| lerg_3 | NPA (area code) metadata — state, effective date |
| lerg_5 | NPA/LATA cross-reference — which NPAs exist in a LATA |
| lerg_7 | Switch/CLLI details — address, coordinates, equipment type |
| lerg_8 | Rate center details — geography, V&H coordinates |
| lerg_8_loc | Localities (towns) → rate centers |
| lerg_8_pst | ZIP codes → localities (US only) |
| lerg_9 | Homing by tandem — "top-down" view of which NPA-NXXs subtend a tandem |
| lerg_4 | SS7 point codes |
| lerg_10 | NPA-NXX → operator services ATC |
| lerg_11 | Locality → operator services ATC |
| lerg_16 | IP capability by LRN |
| lerg_17 | IP capability by NPA-NXX |

Use \`lerg_table_info\` to list all tables or get the schema for a specific one.

---

## LERG Query Syntax

REST queries use path-based filters with \`&\` joining multiple conditions:
- Single filter: \`lerg_query("lerg_1", "ocn_num,ocn_name", "ocn_state=CO")\`
- Multiple filters: \`lerg_query("lerg_6", "npa,nxx,loc_name,ocn", "npa=303&nxx=629")\`

For complex queries with JOINs and advanced operators, use \`lerg_complex_query\`:
\`\`\`json
{
  "table": "lerg_6",
  "fields": ["npa", "nxx", "ocn", "loc_name"],
  "filters": [{"field": "npa", "operator": "eq", "value": 720}],
  "join": {
    "table": "lerg_1",
    "on": [{"left_field": "ocn", "right_field": "ocn_num"}],
    "fields": ["ocn_name", "ocn_state"]
  }
}
\`\`\`

Filter operators: eq, ne, gt, gte, lt, lte, like, in, isnull, isnotnull.

---

## CNAM (Caller Name)

\`cnam_lookup\` queries TransUnion's LIDB for the caller name associated with a phone number.

- Returns: calling_name (up to 15 chars), calling_name_status (available/unavailable), presentation_indicator (allowed/restricted)
- Results cached server-side for 24 hours
- "WIRELESS CALLER" typically means the carrier hasn't provisioned a specific CNAM entry

---

## DNO (Do Not Originate)

\`dno_check\` checks if a phone number should never appear as a caller ID.

- DNO numbers belong to entities that only receive calls (IRS, major banks, government agencies)
- If is_dno=true, the number appearing as caller ID indicates **spoofing/fraud**
- Supports prefix matching: 3-digit (NPA), 6-digit (NPA-NXX), 7-digit, or 10-digit patterns
- Response includes: is_dno, matched_pattern, source

---

## RouteLink — Toll-Free Number Routing

### ROR (Responsible Organization)
\`routelink_lookup\` with lookup_type="ror" returns the RespOrg managing a toll-free number.
- RespOrg is a 5-char code (e.g., "NEX01", "TZN99")
- Only needs the CRN (toll-free number), no ANI/LATA required

### CIC (Carrier Identification Code)
\`routelink_lookup\` with lookup_type="cic" or "cicror" returns which carrier handles calls to a toll-free number FROM a specific caller (ANI) in a specific LATA.
- Requires: crn, ani (10-digit), lata (3-digit)
- Common carrier codes: 0288 (AT&T), 0222 (MCI/Verizon), 0333 (Sprint), 0432 (Lumen)

### CPR (Call Processing Record)
\`routelink_cpr\` retrieves the full routing decision tree for a toll-free number.

**Decision tree node types:**
| Node | Description |
|------|-------------|
| [LATA] | Routes by caller's LATA |
| [NPA] | Routes by caller's area code |
| [NXX] | Routes by caller's exchange |
| [STATE] | Routes by caller's state |
| [DAY_OF_WEEK] | Routes by day (1-7, Sunday=1) |
| [TIME_OF_DAY] | Routes by time (15-min intervals) |
| [PERCENT] | Percentage-based load balancing |
| [ANI] | Routes by specific caller number |

**Action types:** Carrier XXXX (4-digit carrier code), Template XXXXXXXXXX (reference to template CRN), Routing XXXXX, NMC X (Network Management Class)

**Common patterns:**
- Simple: All calls → one carrier → one termination number
- Time-of-day: Business hours → office, after hours → answering service
- Geographic: Different terminations per LATA/state/NPA
- Percentage: Load balancing across call centers (e.g., 60%/40%)

Use \`expand=true\` (default) to recursively resolve template references into their full decision trees.

---

## GraphQL

Use \`graphql_query\` for complex queries not possible with REST:
- Cross-table relationship joins (lerg6 → carrier, lerg6 → switchInfo, lerg7Sha → tandemSwitch)
- Filtering by fields not in REST endpoints
- Multiple related data points in one query

**LERG GraphQL** (\`service="lerg"\`): All 27 tables with camelCase names (lerg1, lerg6, lerg7Sha, etc.)
- FilterInput operators: EQ, NE, GT, GTE, LT, LTE, LIKE, IN, IS_NULL, IS_NOT_NULL
- All field values are nullable strings

**LSMS GraphQL** (\`service="lsms"\`): 5 tables
- subscriptionVersions (514M rows — MUST filter by phone_number, lrn, or spid)
- numberBlocks, serviceProviders, locationRoutingNumbers, npanxx
- Safety limits: max 1000 results, depth 5, complexity 200, 10-second timeout

---

## Key Telecom Concepts

| Term | Definition |
|------|-----------|
| **LRN** | Location Routing Number — identifies the switch serving a ported number |
| **SPID** | Service Provider ID — identifies the carrier that owns a number |
| **OCN** | Operating Company Number — 4-char carrier identifier (often same as SPID) |
| **NPA** | Numbering Plan Area — 3-digit area code |
| **NXX** | Exchange code — next 3 digits after area code |
| **LATA** | Local Access Transport Area — geographic region for call routing |
| **CLLI** | Common Language Location Identifier — 8-11 char switch/building code |
| **CRN** | Call Routing Number — a toll-free number in RouteLink context |
| **ROR/RespOrg** | Responsible Organization — entity managing a toll-free number's routing |
| **CIC** | Carrier Identification Code — identifies which carrier handles a toll-free call |
| **CPR** | Call Processing Record — routing decision tree for a toll-free number |
| **Rate Center** | Geographic area defining local calling boundaries |
| **Tandem** | A switching office that connects local switches to the long-distance network |
| **Homing** | The relationship between a local switch and its tandem |

---

## Common Mistakes to Avoid

1. **Never guess carrier names** — always query lerg_1 by OCN
2. **Never skip the LRN dip** — ported TNs have different NPA-NXX than their LRN
3. **Never look for tandem/switch data in LSMS** — LSMS has no infrastructure data
4. **Never look for TN-level data in LERG** — LERG has no per-phone-number data
5. **Never query LSMS subscriptionVersions without a filter** — 514M rows will timeout
6. **Always use the LRN's NPA-NXX** (not the TN's) for LERG routing lookups
`;
