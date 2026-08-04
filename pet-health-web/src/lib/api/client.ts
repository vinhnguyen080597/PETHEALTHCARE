import { API_V1, REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from "../config";

export class ApiError extends Error {
  status: number;
  code?: string;
  body?: unknown;

  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export type FetchJsonOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  headers?: Record<string, string>;
  formData?: FormData;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function fetchJson<T>(
  path: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    timeoutMs = REQUEST_TIMEOUT_MS,
    headers = {},
    formData,
    cache,
    next,
  } = options;

  const url = path.startsWith("http") ? path : `${API_V1}${path.startsWith("/") ? "" : "/"}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
      cache,
      next,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    if (formData) {
      init.body = formData;
      // Let browser/runtime set multipart boundary
    } else if (body !== undefined) {
      init.headers = {
        "Content-Type": "application/json",
        ...init.headers,
      };
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const text = await res.text();
    const looksLikeHtml =
      /^\s*<!DOCTYPE html/i.test(text) || /^\s*<html[\s>]/i.test(text);
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          error: looksLikeHtml
            ? `API returned HTML instead of JSON (${res.status}). Check NEXT_PUBLIC_API_ORIGIN (got ${url}).`
            : text.slice(0, 280),
        };
      }
    }

    if (!res.ok) {
      const obj = (parsed || {}) as { error?: string; code?: string; message?: string };
      throw new ApiError(
        obj.error || obj.message || `Request failed (${res.status})`,
        res.status,
        obj.code,
        parsed,
      );
    }

    if (looksLikeHtml || parsed === null || typeof parsed !== "object") {
      throw new ApiError(
        `API returned a non-JSON response. Check NEXT_PUBLIC_API_ORIGIN (got ${url}).`,
        res.status || 502,
        "INVALID_API_RESPONSE",
        parsed,
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Request timed out", 408, "REQUEST_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMultipart<T>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<T> {
  return fetchJson<T>(path, {
    method: "POST",
    formData,
    token,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}
