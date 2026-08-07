import type { Lang } from "./types";

const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function parseLang(value: string | null | undefined): Lang {
  const v = (value || "").toUpperCase();
  return v === "EN" ? "EN" : "VI";
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
