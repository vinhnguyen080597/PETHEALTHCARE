/** Auth cookie / JWT helpers used before calling backend APIs. */

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** True when the access JWT is missing or past exp (with a small clock skew). */
export function accessTokenNeedsRefresh(
  token: string | null | undefined,
  nowMs = Date.now(),
  skewSec = 60,
): boolean {
  const value = String(token || "").trim();
  if (!value) return true;
  const exp = decodeJwtPayload(value)?.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp * 1000 <= nowMs + Math.max(0, skewSec) * 1000;
}

export function extractAuthTokens(raw: unknown): {
  access_token?: string;
  refresh_token?: string;
} {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const nested =
    data.session && typeof data.session === "object"
      ? (data.session as Record<string, unknown>)
      : data;
  const access = String(nested.access_token || data.access_token || "").trim();
  const refresh = String(nested.refresh_token || data.refresh_token || "").trim();
  return {
    ...(access ? { access_token: access } : {}),
    ...(refresh ? { refresh_token: refresh } : {}),
  };
}

export function isExpiredAuthError(err: unknown): boolean {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : 0;
  const message = err instanceof Error ? err.message : String(err || "");
  if (status === 401) return true;
  return /invalid or expired token/i.test(message);
}
