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

  // Next.js Data Cache skips fetches that use AbortSignal. Only attach a
  // timeout signal for uncached / authenticated / mutating requests.
  const wantsDataCache =
    method.toUpperCase() === "GET" &&
    !token &&
    !formData &&
    !cache &&
    typeof next?.revalidate === "number" &&
    next.revalidate > 0;

  const controller = wantsDataCache ? null : new AbortController();
  const timer = setTimeout(() => controller?.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      method,
      ...(controller ? { signal: controller.signal } : {}),
      cache: wantsDataCache ? undefined : cache,
      next: wantsDataCache
        ? next
        : next?.revalidate === 0
          ? { revalidate: 0 }
          : next,
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

    const fetchPromise = fetch(url, init);
    const res = wantsDataCache
      ? await Promise.race([
          fetchPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new ApiError("Request timed out", 408, "REQUEST_TIMEOUT"));
            }, timeoutMs);
          }),
        ])
      : await fetchPromise;
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
      const obj = (parsed || {}) as {
        error?: string;
        code?: string;
        message?: string;
      };
      throw new ApiError(
        obj.error || obj.message || `Request failed (${res.status})`,
        res.status,
        obj.code,
        parsed,
      );
    }

    // Favorite / unfavorite and similar endpoints return 204 No Content.
    if (res.status === 204 || res.status === 205) {
      return undefined as T;
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
    const message = err instanceof Error ? err.message : "";
    const cause =
      err instanceof Error && "cause" in err
        ? (err as Error & { cause?: { code?: string } }).cause
        : undefined;
    const isNetwork =
      err instanceof TypeError ||
      cause?.code === "ECONNREFUSED" ||
      cause?.code === "ENOTFOUND" ||
      /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(message);
    if (isNetwork) {
      throw new ApiError(
        "API server is unreachable",
        503,
        "BACKEND_UNAVAILABLE",
      );
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
