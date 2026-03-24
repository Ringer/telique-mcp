import type { Config } from "./config.js";

export class TeliqueClient {
  private baseUrl: string;
  private apiToken: string | null;
  private timeoutMs: number;

  get isAnonymous(): boolean {
    return this.apiToken === null;
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

  private buildUrl(
    path: string,
    params?: Record<string, string | number | undefined>
  ): string {
    const url = new URL(path, this.baseUrl);
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
        return {
          _error: true,
          status: response.status,
          message: this.describeHttpError(response.status),
          body: this.tryParseJson(text),
        };
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

  private tryParseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private describeHttpError(status: number): string {
    switch (status) {
      case 400:
        return "Bad request — check parameter format";
      case 401:
      case 403:
        return "Authentication failed — check TELIQUE_API_TOKEN";
      case 404:
        return "Not found";
      case 429:
        return this.apiToken
          ? "Rate limit exceeded"
          : "Rate limit exceeded (10 ops/min in anonymous mode). Run `npx telique-mcp setup` or visit https://telique.ringer.tel to get an API key for unlimited access.";
      case 502:
      case 503:
        return "Service temporarily unavailable";
      default:
        return `HTTP ${status}`;
    }
  }
}
