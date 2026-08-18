/** Same-origin fetches that refresh the httpOnly session once on 401, then retry. */

let refreshInflight: Promise<boolean> | null = null;

export async function refreshBrowserSession(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

export function shouldRetryAfterUnauthorized(
  status: number,
  alreadyRetried: boolean,
  path: string,
): boolean {
  if (alreadyRetried || status !== 401) return false;
  return !/\/api\/auth\/refresh\/?$/.test(path);
}

export async function fetchWithSession(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const path = typeof input === "string" ? input : input.toString();
  const res = await fetch(input, init);
  if (!shouldRetryAfterUnauthorized(res.status, false, path)) return res;
  const refreshed = await refreshBrowserSession();
  if (!refreshed) return res;
  return fetch(input, init);
}
