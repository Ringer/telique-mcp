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
- Example: \`lerg_query("lerg_6", "npa,nxx,block_id,loc_name,loc_state,ocn,switch,lata", "npa=720&nxx=708")\`

**CRITICAL: Understanding block_id and NPA-NXX ownership:**
- \`block_id="A"\` = the **Code Holder** — the original LERG owner of the entire NPA-NXX. This is THE owner of the NPA-NXX.
- \`block_id="0"\` through \`"9"\` = **Block Holders** — carriers who received a pooled 1,000-number block (thousands-block pooling). Each block covers numbers x000-x999 within the NXX.
- When asked "who owns NPA-NXX 720-708?", the answer is the OCN on the \`block_id="A"\` row.
- A query for \`npa=720&nxx=708\` may return multiple rows — one for block_id="A" (the Code Holder) and additional rows for pooled blocks (0-9). Always filter or identify the "A" row for ownership questions.
- To find which carrier serves a specific phone number within a pooled NXX, use the LRN dip pattern instead (the block_id approach only tells you who holds the block, not who currently serves an individual ported number).

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

Filter operators: eq, ne, gt, gte, lt, lte, like, in, notin, isnull, isnotnull.
Use \`*\` as the fields value to return all fields from a table.
Note: REST \`like\` is **case-insensitive** (in-memory matching), unlike GraphQL LIKE which is case-sensitive (PostgreSQL).

---

## When to Use REST vs GraphQL

| Use Case | Best Tool | Why |
|----------|-----------|-----|
| Single LRN/SPID for a phone number | \`lrn_lookup\` (REST) | Sub-millisecond, in-memory |
| Carrier name by OCN | \`lerg_query\` (REST) | Simple single-field lookup |
| NPA-NXX routing info | \`lerg_query\` (REST) | Fast, straightforward |
| Tandem routing | \`lerg_tandem\` (REST) | Pre-built JOIN, optimized |
| NPA-NXX + carrier name + switch in one call | \`graphql_query\` (LERG) | Nested relationships avoid multiple round trips |
| Filter by fields not in REST (e.g., all switches for an OCN) | \`graphql_query\` (LERG) | FilterInput supports any field |
| Cross-table JOIN with arbitrary conditions | \`graphql_query\` (LERG dynamicJoin) | Only way to do ad-hoc joins |
| All phone numbers for an LRN (paginated with totalCount) | \`graphql_query\` (LSMS) | SVConnection returns totalCount + hasMore |
| Quick profile of a phone number | \`lookup_tn\` (composite) | Parallel dip across LRN + CNAM + DNO + LERG |

**Rule of thumb:** Use REST for simple lookups (one table, one or two filters). Use GraphQL when you need joins, relationship traversal, or fields not exposed by REST endpoints.

---

## LSMS / LRN REST Endpoints

The LRN API serves live NPAC porting data from an in-memory Judy Array store (500M+ records, sub-millisecond) backed by a PostgreSQL LSMS database.

### LRN Lookup (\`lrn_lookup\` tool)

\`GET /v1/telique/lrn/{phone_number}?format=json\`

Returns the current LRN and carrier for a phone number. This is the fastest lookup — served from in-memory store, not PostgreSQL.

**JSON response shape:**
\`\`\`json
{
  "phone_number": "3036298301",
  "lrn": "7207081999",
  "status": "success",
  "timestamp": "2025-08-07T02:30:00Z",
  "metadata": {
    "spid": "567G",
    "lnp_type": "lspp",
    "activation_timestamp": "2024-01-15T10:30:00Z",
    "last_updated": "2025-08-07T01:30:00Z"
  }
}
\`\`\`

Default format is plain text (\`LRN;SPID\`, e.g., \`7207081999;567G\`). Use \`?format=json\` for structured response.

### LSMS Relationship Queries (\`lrn_relationship_query\` tool)

Query relationships between phone numbers, LRNs, and SPIDs from the LSMS PostgreSQL database. These hit the database directly and have higher latency than the in-memory LRN lookup.

**6 query types and their endpoints:**

| query_type | Endpoint | Description |
|------------|----------|-------------|
| \`phones_by_lrn\` | \`GET /v1/telique/lsms/list/phone_number?lrn={value}\` | All phone numbers for a given LRN |
| \`phones_by_spid\` | \`GET /v1/telique/lsms/list/phone_number?spid={value}\` | All phone numbers for a given SPID |
| \`spid_by_lrn\` | \`GET /v1/telique/lsms/list/spid?lrn={value}\` | All SPIDs associated with a given LRN |
| \`spid_by_phone\` | \`GET /v1/telique/lsms/list/spid?phone_number={value}\` | All SPIDs for a given phone number |
| \`lrn_by_spid\` | \`GET /v1/telique/lsms/list/lrn?spid={value}\` | All LRNs for a given SPID |
| \`lrn_by_phone\` | \`GET /v1/telique/lsms/list/lrn?phone_number={value}\` | All LRNs for a given phone number |

**Constraints:**
- Exactly ONE query parameter per request (multiple parameters return a validation error)
- Results are filtered to active records only
- Phone numbers and LRNs are returned as strings

**Example response (phones_by_lrn):**
\`\`\`json
{
  "phone_numbers": ["3036298301", "3039982743", "3033334444"],
  "count": 3,
  "query": { "lrn": "7207081999", "spid": null, "phone_number": null }
}
\`\`\`

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
- Phone numbers are auto-normalized: E.164 (+12003456789), domestic (12003456789), and international (0012003456789) formats all accepted

---

## RouteLink — Toll-Free Number Routing

**What is a toll-free number?** A phone number with an 8XX NPA (area code) that is free for the caller — the called party pays. Toll-free NPAs: **800, 888, 877, 866, 855, 844, 833, 822**. Any 10-digit number starting with one of these NPAs is a toll-free number (also called TFN or CRN in RouteLink context).

Toll-free numbers are managed by the **Somos TFN Registry**, not NPAC/LSMS. They have their own routing system (CPR decision trees) and their own management hierarchy (RespOrgs, not SPIDs). Use the RouteLink tools for toll-free lookups — do NOT use \`lrn_lookup\` for toll-free numbers (they don't have LRNs).

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

### LERG GraphQL (\`service="lerg"\`)

**CRITICAL naming rules:**
- **Query names** are camelCase: \`lerg1\`, \`lerg6\`, \`lerg7Sha\`, \`lerg7ShaIns\`, \`lerg12\`, etc.
- **Object-type names use a \`Gql\` prefix.** \`__type(name: "Lerg6")\` returns null — the actual type is \`GqlLerg6\`. Rule: snake_case table ID → PascalCase + \`Gql\` prefix (\`lerg_6\` → \`GqlLerg6\`, \`lerg_7_sha\` → \`GqlLerg7Sha\`, \`lerg_8_loc\` → \`GqlLerg8Loc\`). Use this when introspecting types directly.
- **Return fields** MUST be camelCase: \`ocnName\`, \`locState\`, \`locName\`, \`shaIndicator\`, \`hTrmDTdm\`
- **REST fields are snake_case; GraphQL fields are camelCase — 1:1 convertible.** \`coc_type\` ↔ \`cocType\`, \`loc_name\` ↔ \`locName\`, \`ocn_num\` ↔ \`ocnNum\`, \`sha_indicator\` ↔ \`shaIndicator\`. GraphQL \`FilterInput\` \`field:\` accepts both forms; REST query paths and GraphQL selection sets do not.
- **Filter field names** accept BOTH camelCase (\`ocnName\`) and snake_case (\`ocn_name\`)
- **All values are strings** — even numeric fields. Always quote: \`value: "720"\` not \`value: 720\`
- **GraphQL LIKE is case-sensitive (SQL)** — LERG data is stored UPPERCASE, so patterns must be uppercase: \`%VERIZON%\` not \`%verizon%\`. (The REST \`like\` operator is case-insensitive — this only applies to GraphQL.)

**FilterInput:**
\`\`\`graphql
{ field: "ocnName", op: LIKE, value: "%VERIZON%" }   # partial match (UPPERCASE!)
{ field: "npa", op: EQ, value: "720" }                # exact match
{ field: "npa", op: IN, values: ["212", "646", "917"] } # IN uses 'values' (plural), not 'value'
\`\`\`

Operators: EQ, NE, GT, GTE, LT, LTE, LIKE, IN, IS_NULL, IS_NOT_NULL

**Predefined relationships** (avoid N+1 — use these instead of separate queries):
- \`lerg6\` → \`carrier\` (joins to lerg1 via OCN), \`switchInfo\` (→ lerg7), \`homingArrangements\` (→ lerg7Sha)
- \`lerg7\` → \`carrier\` (→ lerg1)
- \`lerg7Sha\` → \`tandemSwitch\` (→ lerg7)

**Example — find all Verizon OCNs:**
\`\`\`graphql
{
  lerg1(
    filters: [{ field: "ocnName", op: LIKE, value: "%VERIZON%" }]
    pagination: { limit: 10 }
  ) {
    ocnNum
    ocnName
    ocnState
    category
  }
}
\`\`\`

**Example — NPA-NXX with carrier and switch in one query:**
\`\`\`graphql
{
  lerg6(
    filters: [{ field: "npa", op: EQ, value: "303" }, { field: "nxx", op: EQ, value: "629" }]
    pagination: { limit: 1 }
  ) {
    npa nxx ocn locName switch
    carrier { ocnNum ocnName ocnState }
    switchInfo { switch eqpType swCity swState }
    homingArrangements {
      shaIndicator hTrmDTdm
      tandemSwitch { switch swCity swState }
    }
  }
}
\`\`\`

**dynamicJoin** — for arbitrary cross-table SQL joins (returns raw JSON):
\`\`\`graphql
{
  dynamicJoin(input: {
    table: "lerg_6"
    fields: ["npa", "nxx", "ocn", "locName"]
    filters: [{ field: "locName", op: LIKE, value: "%DENVER%" }]
    join: {
      table: "lerg_1"
      fields: ["ocnName", "category"]
      on: [{ leftField: "ocn", rightField: "ocnNum" }]
      joinType: "INNER"
    }
    pagination: { limit: 10 }
  })
}
\`\`\`
Note: dynamicJoin uses snake_case table IDs (lerg_6, lerg_1, lerg_7_sha) and returns raw PostgreSQL column names (UPPERCASE with spaces, e.g., \`"OCN_NAME"\`, \`"LOC NAME"\`, \`"EFF DATE"\`), NOT GraphQL camelCase.

### LSMS GraphQL (\`service="lsms"\`)

The LSMS GraphQL API is a **completely separate implementation** from LERG GraphQL. It has different query patterns, different field naming, and different schema design. Do NOT use LERG-style FilterInput syntax with LSMS.

**5 tables:**

| Table | ~Rows | Requires Filter? |
|-------|-------|------------------|
| subscriptionVersions | 514M | Yes (phoneNumber, lrn, or spid) |
| numberBlocks | 751K | Yes (npanxxx, spid, or lrn) |
| serviceProviders | 5.2K | No |
| locationRoutingNumbers | 56K | No |
| npanxx | 192K | No |

**Query patterns (NOT FilterInput — uses typed named parameters):**
\`\`\`graphql
# Single phone number lookup
{ subscriptionVersion(phoneNumber: "3036298301") { phoneNumber lrn spid serviceProvider { name } } }

# Paginated list by LRN (returns totalCount, hasMore)
{ subscriptionVersionsByLrn(lrn: "7207081999", limit: 10) { totalCount hasMore items { phoneNumber spid } } }

# Paginated list by SPID
{ subscriptionVersionsBySpid(spid: "567G", limit: 10) { totalCount hasMore items { phoneNumber lrn } } }

# Number block lookup (single)
{ numberBlock(npanxxx: "3035551") { npanxxx lrn spid serviceProvider { name } } }

# Number blocks by SPID or LRN (paginated — at least one filter required)
{ numberBlocks(spid: "567G", limit: 10) { totalCount hasMore items { npanxxx lrn spid } } }

# Single carrier lookup (note: composite PK — same SPID may exist in multiple regions)
{ serviceProvider(spid: "567G") { spid name npacRegion status contactInfo } }

# List carriers (paginated)
{ serviceProviders(limit: 20) { spid name npacRegion } }

# LRN metadata
{ locationRoutingNumber(lrn: "7207081999") { lrn ocn regionId status switchInfo } }

# NPA-NXX single lookup
{ npanxx(npa: "303", nxx: "629") { npa nxx spid effectiveTimestamp serviceProvider { name } } }

# NPA-NXX codes for a carrier (paginated)
{ npanxxBySpid(spid: "567G", limit: 50) { npa nxx effectiveTimestamp } }

# Database statistics
{ lsmsStats { activeSubscriptionVersions activeNumberBlocks totalServiceProviders totalLocationRoutingNumbers activeNpanxx } }
\`\`\`

**Relationships** (use DataLoader batching — no N+1):
- subscriptionVersion → \`serviceProvider\`, \`lrnMetadata\`
- numberBlock → \`serviceProvider\`, \`lrnMetadata\`
- npanxx → \`serviceProvider\`

**Safety limits:** max 1000 results, depth 5, complexity 200, 10-second statement timeout
**Auto-filters:** Soft-deletable records filter to is_active = true automatically
**Note:** Phone numbers/LRNs are strings (stored as BIGINT but GraphQL Int is 32-bit). SPIDs are auto-trimmed (stored as CHAR(4) with trailing spaces).
**Note:** Service providers have a composite PK of (spid, npac_region) — the same SPID may appear in multiple NPAC regions.

---

## REST Paths for Direct API Access

The MCP tools wrap these HTTP endpoints. Use this table when calling the Telique API directly with \`curl\` or another HTTP client. Base URL: \`https://api-dev.ringer.tel\`. Authentication: \`-H "x-api-token: tlq_…"\` (per-request header, never in query string).

| Tool | Method | Path | Notes |
|------|--------|------|-------|
| \`lrn_lookup\` | GET | \`/v1/telique/lrn/{phone_number}\` | Add \`?format=json\` for structured response; default is \`LRN;SPID\` plain text |
| \`cnam_lookup\` | GET | \`/v1/telique/cnam/{phone_number}\` | Returns calling_name, presentation_indicator |
| \`dno_check\` | GET | \`/v1/telique/dno/{phone_number}\` | Add \`?format=json\` for details; default is \`true\`/\`false\` text |
| \`lrn_relationship_query\` | GET | \`/v1/telique/lsms/list/{resource}?{filter}={value}\` | \`resource\` ∈ {phone_number, spid, lrn}; filter ∈ {lrn, spid, phone_number}; exactly one filter |
| \`lerg_table_info\` | GET | \`/v1/telique/lerg/tables\` or \`/v1/telique/lerg/tables/{table_name}\` | No args = list all tables |
| \`lerg_query\` | GET | \`/v1/telique/lerg/{table_name}/{fields}/{query}\` | Example: \`/lerg/lerg_6/npa,nxx,ocn/npa=303&nxx=629\` |
| \`lerg_complex_query\` | POST | \`/v1/telique/lerg/query\` | JSON body with table, fields, filters, join, limit, offset |
| \`lerg_tandem\` | GET | \`/v1/telique/lerg/tandem?npa={npa}&nxx={nxx}\` | Pre-joined tandem lookup |
| \`routelink_lookup\` (ror) | GET | \`/v1/telique/ror/{crn}\` | Responsible Organization for a toll-free number |
| \`routelink_lookup\` (cic/cicror) | GET | \`/v1/telique/{cic\\|cicror}/{crn}/{ani}/{lata}\` | CIC or CIC+ROR for a toll-free call |
| \`routelink_ror_query\` | GET | \`/v1/telique/ror/{ror}/{tfns\\|cprs}\` | List TFNs or CPRs for a ROR; paginated \`?limit=&offset=\` |
| \`routelink_cpr\` | GET | \`/v1/telique/cpr/{crn}\` | Call Processing Record; add \`?expand=true\` to inline templates |
| \`graphql_query\` (lerg) | POST | \`/v1/telique/lerg/gql\` | JSON body \`{"query":"..."}\`; GET returns GraphiQL playground HTML |
| \`graphql_query\` (lsms) | POST | \`/v1/telique/lsms/gql\` | JSON body \`{"query":"..."}\`; GET returns GraphiQL playground HTML |
| \`lookup_tn\` | — | (composite) | Not a single endpoint — fans out to \`/lrn/\`, \`/cnam/\`, \`/dno/\`, \`/lerg/…\` in parallel |

**Note on RouteLink paths**: there is NO \`/routelink/\` segment. The public OpenAPI spec at \`https://telique.ringer.tel/docs/api-reference\` historically listed \`/v1/telique/routelink/cpr/{crn}\` etc. — those paths return 404. The real paths are bare (\`/v1/telique/cpr/{crn}\`) as shown above.

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
7. **GraphQL return fields must be camelCase** — \`ocnName\` not \`ocn_name\`, \`locState\` not \`loc_state\`
8. **GraphQL LIKE patterns must be UPPERCASE** — LERG data is uppercase in PostgreSQL, so \`%VERIZON%\` works but \`%verizon%\` returns nothing. (REST \`like\` is case-insensitive — this only applies to GraphQL.)
9. **IN operator uses \`values\` (plural)** — \`{ field: "npa", op: IN, values: ["212", "646"] }\` not \`value\`
`;
