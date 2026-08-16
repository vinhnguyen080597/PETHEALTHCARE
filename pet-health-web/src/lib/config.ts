export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/$/, "") ||
  "https://pet-health-backend-serb.onrender.com";

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ||
  "http://localhost:3001";

/** Public origin for share / Open Graph — crawlers cannot reach localhost. */
export const SHARE_ORIGIN = (() => {
  const origin = SITE_ORIGIN;
  if (!origin || /localhost|127\.0\.0\.1/i.test(origin)) {
    return "https://pet-marketplace.org";
  }
  return origin;
})();

export function listingShareUrl(postId: string): string {
  return `${SHARE_ORIGIN}/app/pet-feed/posts/${encodeURIComponent(postId)}`;
}

/** Canonical share URL for announcements (Tin tức feed deep link). */
export function newsShareUrl(postId: string): string {
  return `${SHARE_ORIGIN}/app/news?post=${encodeURIComponent(postId)}`;
}

/** Absolute https URL for OG images; skips data: placeholders. */
export function absoluteMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url || url.startsWith("data:")) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${SHARE_ORIGIN}${url}`;
  return undefined;
}

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
