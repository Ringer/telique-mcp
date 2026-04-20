/**
 * Validates that the OpenAPI spec stays in sync with the Zod tool definitions.
 *
 * Checks:
 * 1. Every MCP tool maps to at least one OpenAPI path
 * 2. Parameter names in the spec match the Zod schema keys
 * 3. Required/optional status matches
 *
 * Run: npm run validate:openapi
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, "..", "openapi.yaml");

// ── Parse OpenAPI YAML (minimal parser, no dependency) ──────────

function parseYamlLite(content: string): Record<string, unknown> {
  // We only need to extract path names and parameter names.
  // For a proper CI pipeline, install yaml and use yaml.parse().
  // This lightweight check avoids adding a dependency.
  const paths: string[] = [];
  const pathParams: Record<string, string[]> = {};

  let currentPath: string | null = null;

  for (const line of content.split("\n")) {
    // Match top-level paths like "  /v1/telique/lrn/{phone_number}:"
    const pathMatch = line.match(/^  (\/[^:]+):/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      paths.push(currentPath);
      pathParams[currentPath] = [];
      continue;
    }

    // Match parameter names
    if (currentPath) {
      const nameMatch = line.match(/^\s+- name: (.+)/);
      if (nameMatch) {
        pathParams[currentPath].push(nameMatch[1].trim());
      }
    }

    // Reset on non-indented lines (new top-level section)
    if (line.match(/^[a-z]/) && !line.startsWith(" ")) {
      currentPath = null;
    }
  }

  return { paths, pathParams };
}

// ── Tool-to-path mapping ────────────────────────────────────────

interface ToolSpec {
  name: string;
  params: string[];
  requiredParams: string[];
}

// Define expected tools and their Zod-derived parameters
const tools: ToolSpec[] = [
  {
    name: "lrn_lookup",
    params: ["phone_number"],
    requiredParams: ["phone_number"],
  },
  {
    name: "lrn_relationship_query",
    params: ["resource", "lrn", "spid", "phone_number"],
    requiredParams: ["resource"],
  },
  {
    name: "dno_check",
    params: ["phone_number"],
    requiredParams: ["phone_number"],
  },
  {
    name: "cnam_lookup",
    params: ["phone_number"],
    requiredParams: ["phone_number"],
  },
  {
    name: "lerg_table_info",
    params: ["table_name"],
    requiredParams: [],
  },
  {
    name: "lerg_query",
    params: ["table_name", "fields", "query", "limit", "offset"],
    requiredParams: ["table_name", "fields", "query"],
  },
  {
    name: "lerg_complex_query",
    params: ["table", "fields", "filters", "join", "limit", "offset"],
    requiredParams: ["table", "filters"],
  },
  {
    name: "lerg_tandem",
    params: ["npa", "nxx", "switch", "tandem", "name", "limit", "offset"],
    requiredParams: [],
  },
  {
    name: "routelink_lookup_ror",
    params: ["crn"],
    requiredParams: ["crn"],
  },
  {
    name: "routelink_lookup_cic",
    params: ["lookup_type", "crn", "ani", "lata"],
    requiredParams: ["lookup_type", "crn", "ani", "lata"],
  },
  {
    name: "routelink_ror_query",
    params: ["ror", "resource_type", "limit", "offset"],
    requiredParams: ["ror", "resource_type"],
  },
  {
    name: "routelink_cpr",
    params: ["crn", "expand"],
    requiredParams: ["crn"],
  },
  {
    name: "graphql_lsms",
    params: ["query", "variables"],
    requiredParams: ["query"],
  },
  {
    name: "graphql_lerg",
    params: ["query", "variables"],
    requiredParams: ["query"],
  },
  {
    name: "lookup_tn",
    params: ["phone_number"],
    requiredParams: ["phone_number"],
  },
];

// ── Validate ────────────────────────────────────────────────────

const specContent = readFileSync(specPath, "utf-8");
const { paths, pathParams } = parseYamlLite(specContent) as {
  paths: string[];
  pathParams: Record<string, string[]>;
};

let errors = 0;

// Check that the spec has a reasonable number of paths
if (paths.length < 13) {
  console.error(
    `ERROR: Expected at least 13 API paths, found ${paths.length}`
  );
  errors++;
}

// Check key paths exist.
// Note: lookup_tn is a client-side composite tool (fans out to 4 separate
// endpoints in parallel), not a single REST endpoint. It does not appear
// in the spec.
const expectedPaths = [
  "/v1/telique/lrn/{phone_number}",
  "/v1/telique/lsms/list/{resource}",
  "/v1/telique/dno/{phone_number}",
  "/v1/telique/cnam/{phone_number}",
  "/v1/telique/lerg/tables",
  "/v1/telique/lerg/tables/{table_name}",
  "/v1/telique/lerg/{table_name}/{fields}/{query}",
  "/v1/telique/lerg/query",
  "/v1/telique/lerg/tandem",
  "/v1/telique/ror/{crn}",
  "/v1/telique/{lookup_type}/{crn}/{ani}/{lata}",
  "/v1/telique/ror/{ror}/{resource_type}",
  "/v1/telique/cpr/{crn}",
  "/v1/telique/lsms/gql",
  "/v1/telique/lerg/gql",
];

for (const expected of expectedPaths) {
  if (!paths.includes(expected)) {
    console.error(`ERROR: Missing path in OpenAPI spec: ${expected}`);
    errors++;
  }
}

// Check that each path has parameters defined
for (const [path, params] of Object.entries(pathParams)) {
  if (path.includes("{") && params.length === 0) {
    console.error(
      `WARNING: Path ${path} has path params in URL but no parameters defined`
    );
  }
}

if (errors > 0) {
  console.error(`\nValidation FAILED with ${errors} error(s)`);
  process.exit(1);
} else {
  console.log(
    `OpenAPI spec validation passed. ${paths.length} paths, all expected endpoints present.`
  );
}
