import { cookies } from "next/headers";
import {
  COOKIE_ACCESS,
  COOKIE_LANG,
  COOKIE_REFRESH,
} from "./config";
import type { Lang } from "./types";
import { meRequest, refreshRequest } from "./api/auth";
import type { ApiAccount } from "./types";
import {
  langCookieOptions,
  parseLang,
  sessionCookieOptions,
} from "./sessionOptions";
import {
  accessTokenNeedsRefresh,
  extractAuthTokens,
} from "./sessionTokens";

export type SessionTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export { parseLang, sessionCookieOptions, langCookieOptions };

let refreshInflight: Promise<SessionTokens | null> | null = null;

export async function getSessionTokens(): Promise<SessionTokens> {
  const jar = await cookies();
  return {
    accessToken: jar.get(COOKIE_ACCESS)?.value || null,
    refreshToken: jar.get(COOKIE_REFRESH)?.value || null,
  };
}

async function writeSessionCookies(tokens: {
  access_token?: string;
  refresh_token?: string;
}): Promise<void> {
  try {
    const jar = await cookies();
    const opts = sessionCookieOptions();
    if (tokens.access_token) jar.set(COOKIE_ACCESS, tokens.access_token, opts);
    if (tokens.refresh_token) jar.set(COOKIE_REFRESH, tokens.refresh_token, opts);
  } catch {
    // Server Components cannot always mutate cookies; Route Handlers can.
  }
}

async function clearExpiredSessionCookies(): Promise<void> {
  try {
    const jar = await cookies();
    const opts = sessionCookieOptions(0);
    jar.set(COOKIE_ACCESS, "", opts);
    jar.set(COOKIE_REFRESH, "", opts);
  } catch {
    // Ignore when this request cannot write cookies.
  }
}

async function refreshSessionOnce(refreshToken: string): Promise<SessionTokens | null> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const result = await refreshRequest(refreshToken);
      const tokens = extractAuthTokens(result);
      if (!tokens.access_token) return null;
      await writeSessionCookies(tokens);
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
      };
    } catch {
      const latest = await getSessionTokens();
      if (latest.accessToken && !accessTokenNeedsRefresh(latest.accessToken)) {
        return latest;
      }
      return null;
    }
  })().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

export async function getAccessToken(options?: {
  allowRefresh?: boolean;
}): Promise<string | null> {
  const allowRefresh = options?.allowRefresh !== false;
  const { accessToken, refreshToken } = await getSessionTokens();
  if (accessToken && !accessTokenNeedsRefresh(accessToken)) return accessToken;
  if (allowRefresh && refreshToken) {
    const refreshed = await refreshSessionOnce(refreshToken);
    if (refreshed?.accessToken) return refreshed.accessToken;
  }
  if (accessToken && accessTokenNeedsRefresh(accessToken)) {
    if (allowRefresh) await clearExpiredSessionCookies();
    return null;
  }
  return accessToken;
}

/** Valid access JWT only — never rotates refresh tokens (Server Components). */
export async function peekAccessToken(): Promise<string | null> {
  return getAccessToken({ allowRefresh: false });
}

/** For Route Handlers that set cookies on a NextResponse. */
export function applySessionCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
  tokens: { access_token?: string; refresh_token?: string },
) {
  const opts = sessionCookieOptions();
  if (tokens.access_token) {
    res.cookies.set(COOKIE_ACCESS, tokens.access_token, opts);
  }
  if (tokens.refresh_token) {
    res.cookies.set(COOKIE_REFRESH, tokens.refresh_token, opts);
  }
}

export function clearSessionCookies(
  res: { cookies: { set: (name: string, value: string, opts?: object) => void } },
) {
  const opts = sessionCookieOptions(0);
  res.cookies.set(COOKIE_ACCESS, "", opts);
  res.cookies.set(COOKIE_REFRESH, "", opts);
}

export async function getSessionUser(): Promise<{
  token: string | null;
  account: ApiAccount | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
}> {
  const token = await peekAccessToken();
  if (!token) {
    return { token: null, account: null, isAdmin: false, isLoggedIn: false };
  }
  try {
    const res = await meRequest(token);
    const account =
      res && typeof res === "object" && "data" in res
        ? ((res as { data?: ApiAccount }).data ?? null)
        : (res as ApiAccount);
    const role = (account?.primary_role || "").toLowerCase();
    const roles = (account?.roles || []).map((r) => String(r).toLowerCase());
    const isAdmin = role === "admin" || roles.includes("admin");
    return { token, account, isAdmin, isLoggedIn: true };
  } catch {
    return { token: null, account: null, isAdmin: false, isLoggedIn: false };
  }
}

export async function getLangFromCookies(): Promise<Lang> {
  const jar = await cookies();
  return parseLang(jar.get(COOKIE_LANG)?.value);
}

export { COOKIE_LANG, COOKIE_ACCESS, COOKIE_REFRESH };
