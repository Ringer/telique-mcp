import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeliqueClient } from "./client.js";

export type ToolRegistrar = (server: McpServer, client: TeliqueClient) => void;

/**
 * What TeliqueClient returns, instead of throwing, when a request fails.
 * `_error` and `status` are part of the library contract: hosted consumers
 * branch on them, so keep both.
 */
export interface ApiError {
  _error: true;
  /** HTTP status, or 0 when no response arrived (timeout or network error). */
  status: number;
  message: string;
  /** The gateway's machine-readable code, e.g. INVALID_TOKEN or SCOPE_DENIED. */
  code?: string;
  /** The gateway's x-telique-request-id. Support can find the request by it. */
  request_id?: string;
  /** Seconds from the Retry-After header of a 429. */
  retry_after?: number;
  body?: unknown;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "_error" in value &&
    (value as ApiError)._error === true
  );
}
