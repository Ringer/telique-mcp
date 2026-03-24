const MAX_ITEMS = 50;

interface ErrorResponse {
  _error: true;
  status: number;
  message: string;
  body?: unknown;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "_error" in value &&
    (value as ErrorResponse)._error === true
  );
}

export function formatResponse(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  if (isErrorResponse(data)) {
    const parts = [`Error: ${data.message}`];
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
  return {
    content: [{ type: "text", text: JSON.stringify(truncated, null, 2) }],
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
