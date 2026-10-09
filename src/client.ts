import type { Config } from "./config.js";
import type { ApiError } from "./types.js";
import { apiPath } from "./utils/paths.js";

// Every response from the Telique gateway carries this header; a response
// without it was answered by something in front of the gateway.
const REQUEST_ID_HEADER = "x-telique-request-id";

const KEY_HINT =
  "Run `npx telique-mcp setup`, or set TELIQUE_API_TOKEN to a key from https://telique.ringer.tel (free accounts get one too).";

export interface ProbeResult {
  /** True when the Telique gateway answered, whatever the status. */
  reachable: boolean;
  status: number;
  request_id?: string;
}

export class TeliqueClient {
  private baseUrl: string;
  private apiToken: string | null;
  private timeoutMs: number;

  /**
   * True when no API token is configured. The API refuses such requests
   * unless they come from an allowlisted IP, so this is not a usable mode
   * for most callers. Kept for library consumers.
   */
  get isAnonymous(): boolean {
    return this.apiToken === null;
  }

  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  constructor(config: Config) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiToken = config.apiToken;
    this.timeoutMs = config.requestTimeoutMs;
  }

  async get(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<unknown> {
    const url = this.buildUrl(path, params);
    return this.request(url, { method: "GET" });
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const url = this.buildUrl(path);
    return this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /**
   * Check that the Telique gateway is reachable without spending a request.
   * The gateway refuses any method other than GET and POST before it looks
   * at credentials, so an OPTIONS request is never authenticated, metered or
   * forwarded. Reachable means the reply carries the gateway's request ID.
   */
  async probe(): Promise<ProbeResult> {
    try {
      const response = await fetch(this.buildUrl(apiPath("lerg", "tables")), {
        method: "OPTIONS",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      await response.body?.cancel();
      const requestId = response.headers.get(REQUEST_ID_HEADER) ?? undefined;
      return {
        reachable: requestId !== undefined,
        status: response.status,
        request_id: requestId,
      };
    } catch {
      return { reachable: false, status: 0 };
    }
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | undefined>
  ): string {
    // Concatenate rather than `new URL(path, base)`: a path starting with "/"
    // would discard any path prefix in the base URL.
    const url = new URL(this.baseUrl + path);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...((init.headers as Record<string, string>) || {}),
          ...(this.apiToken ? { "x-api-token": this.apiToken } : {}),
          Accept: "application/json",
        },
      });

      const text = await response.text();

      if (!response.ok) {
        return this.toApiError(response, this.tryParseJson(text));
      }

      return this.tryParseJson(text);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          _error: true,
          status: 0,
          message: `Request timed out after ${this.timeoutMs}ms`,
        };
      }
      return {
        _error: true,
        status: 0,
        message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private toApiError(response: Response, body: unknown): ApiError {
    const envelope =
      typeof body === "object" && body !== null
        ? (body as { code?: unknown; message?: unknown })
        : {};
    const code = typeof envelope.code === "string" ? envelope.code : undefined;
    const apiMessage =
      typeof envelope.message === "string" ? envelope.message : undefined;
    const retryAfter = Number.parseInt(
      response.headers.get("retry-after") ?? "",
      10
    );

    const error: ApiError = {
      _error: true,
      status: response.status,
      message: this.describeHttpError(
        response.status,
        code,
        apiMessage,
        Number.isNaN(retryAfter) ? undefined : retryAfter
      ),
    };
    if (code) error.code = code;
    const requestId = response.headers.get(REQUEST_ID_HEADER);
    if (requestId) error.request_id = requestId;
    if (!Number.isNaN(retryAfter)) error.retry_after = retryAfter;
    if (typeof body === "object" && body !== null) {
      error.body = body;
    } else if (
      typeof body === "string" &&
      body.trim() !== "" &&
      !body.trimStart().startsWith("<") &&
      body.length <= 500
    ) {
      // Short plain-text errors come from the services themselves. HTML is an
      // edge or proxy page that says nothing the message doesn't.
      error.body = body;
    }
    return error;
  }

  private tryParseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private describeHttpError(
    status: number,
    code: string | undefined,
    apiMessage: string | undefined,
    retryAfter: number | undefined
  ): string {
    switch (code) {
      case "INVALID_TOKEN":
        return this.apiToken
          ? `The API token was not recognized. Check TELIQUE_API_TOKEN, or create a new key. ${KEY_HINT}`
          : `No API token is configured, and the Telique API requires one. ${KEY_HINT}`;
      case "SCOPE_DENIED":
        return "This API token is not authorized for this tool. Add the tool's scope to the key at https://telique.ringer.tel, or use a key that has it.";
      case "MALFORMED_PATH":
        return "The API refused the request path: it contained a relative (`.` or `..`) or percent-encoded `.` or `/` segment. Check the input values for slashes or dots.";
      case "RATE_LIMITED":
        return `Rate limit exceeded${retryAfter !== undefined ? `; retry in ${retryAfter}s` : ""}. Free-account keys allow 10 requests per 60 seconds, and going over blocks the key for the rest of the window.`;
      case "UPSTREAM_UNAVAILABLE":
        return "The Telique service behind this tool is unavailable. Retry shortly.";
    }
    if (apiMessage) return apiMessage;

    switch (status) {
      case 400:
        return "Bad request — check parameter format";
      case 401:
      case 403:
        return "Request refused before it reached the Telique API: the path is not routed, or the edge blocked the request.";
      case 404:
        return "Not found";
      case 429:
        return "Rate limit exceeded";
      case 502:
      case 503:
        return "Service temporarily unavailable";
      default:
        return `HTTP ${status}`;
    }
  }
}
