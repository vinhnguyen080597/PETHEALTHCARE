import { cookies } from "next/headers";
import {
  COOKIE_ACCESS,
  COOKIE_LANG,
  COOKIE_REFRESH,
} from "./config";
import type { Lang } from "./types";
import { meRequest } from "./api/auth";
import type { ApiAccount } from "./types";

const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export function parseLang(value: string | null | undefined): Lang {
  const v = (value || "").toUpperCase();
  return v === "EN" ? "EN" : "VI";
}

export async function getSessionTokens(): Promise<SessionTokens> {
  const jar = await cookies();
  return {
    accessToken: jar.get(COOKIE_ACCESS)?.value || null,
    refreshToken: jar.get(COOKIE_REFRESH)?.value || null,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const { accessToken } = await getSessionTokens();
  return accessToken;
}

export function sessionCookieOptions(maxAge = TOKEN_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function langCookieOptions(maxAge = TOKEN_MAX_AGE) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
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
  const token = await getAccessToken();
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
    return { token, account: null, isAdmin: false, isLoggedIn: true };
  }
}

export async function getLangFromCookies(): Promise<Lang> {
  const jar = await cookies();
  return parseLang(jar.get(COOKIE_LANG)?.value);
}

export { COOKIE_LANG, COOKIE_ACCESS, COOKIE_REFRESH };
