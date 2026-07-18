// Thin fetch wrapper around the replyon-api backend.
// - Prefixes the API base (relative `/api`, proxied to :8090 in dev).
// - Injects `Authorization: Bearer <token>` from the in-memory token.
// - Serializes/parses JSON.
// - Normalizes errors to ApiError, covering both the backend's
//   { code, message, timestamp } shape and Spring Security's default 401/403.
// - On 401, notifies the registered handler (used by the auth layer to log out).

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Query params; undefined/null/"" values are skipped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = `${API_BASE}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiError> {
  // Backend GlobalExceptionHandler returns { code, message, timestamp }.
  // Spring Security's default 401/403 returns a different (or empty) body.
  let message = res.statusText || "Erro na requisição";
  try {
    const data = await res.json();
    if (data && typeof data.message === "string" && data.message.length > 0) {
      message = data.message;
    } else if (data && typeof data.error === "string") {
      message = data.error;
    }
  } catch {
    // no/invalid JSON body — keep statusText
  }
  return new ApiError(res.status, message);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  // 204 No Content and empty bodies.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(path: string, params?: RequestOptions["params"], signal?: AbortSignal) =>
    request<T>(path, { method: "GET", params, signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
