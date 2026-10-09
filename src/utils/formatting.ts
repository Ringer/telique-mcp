import { isApiError } from "../types.js";

const MAX_ITEMS = 50;

export function formatResponse(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  if (isApiError(data)) {
    const parts = [`Error: ${data.message}`];
    if (data.request_id) {
      parts.push(`Request ID: ${data.request_id} (quote this to Telique support)`);
    }
    if (data.body && typeof data.body === "object") {
      parts.push(JSON.stringify(data.body, null, 2));
    } else if (data.body) {
      parts.push(String(data.body));
    }
    return {
      content: [{ type: "text", text: parts.join("\n\n") }],
      isError: true,
    };
  }

  const truncated = truncateArrays(data);
  const text = JSON.stringify(truncated, null, 2);

  return {
    content: [{ type: "text", text }],
  };
}

function truncateArrays(data: unknown): unknown {
  if (Array.isArray(data)) {
    if (data.length > MAX_ITEMS) {
      return {
        _meta: {
          total: data.length,
          returned: MAX_ITEMS,
          has_more: true,
          message: `Showing ${MAX_ITEMS} of ${data.length} items. Use limit/offset to paginate.`,
        },
        items: data.slice(0, MAX_ITEMS),
      };
    }
    return data.map(truncateArrays);
  }

  if (typeof data === "object" && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = truncateArrays(value);
    }
    return result;
  }

  return data;
}

export function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}
