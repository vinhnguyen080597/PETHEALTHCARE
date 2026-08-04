export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/$/, "") ||
  "https://pet-health-backend-serb.onrender.com";

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ||
  "http://localhost:3001";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ||
  "https://apps.apple.com/app/id6778684107";

export const IOS_APP_STORE_ID =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_ID || "6778684107";

export const API_V1 = `${API_ORIGIN}/api/v1`;

export const REQUEST_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 120_000;

export const COOKIE_ACCESS = "pm_access_token";
export const COOKIE_REFRESH = "pm_refresh_token";
export const COOKIE_LANG = "pm_lang";
