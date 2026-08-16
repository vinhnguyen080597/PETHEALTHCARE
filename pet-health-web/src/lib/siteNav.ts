import type { EnKey } from "@/i18n";

/** Public news / announcements feed (admin-published). */
export const NEWS_HREF = "/app/news";

/** Support Hub (guides, feedback, scam reports). */
export const SUPPORT_HREF = "/app/support";

export const ANNOUNCEMENT_CATEGORIES = [
  "app_update",
  "health_tip",
  "community",
  "general",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export type SiteNavItem = {
  href: string;
  /** Path prefix used for active highlighting */
  matchHref: string;
  labelKey: EnKey;
};

/** Header order: Tin tức → New Pets → Top Breeders → Hỗ trợ */
export const SITE_MAIN_NAV: readonly SiteNavItem[] = [
  { href: NEWS_HREF, matchHref: NEWS_HREF, labelKey: "nav.news" },
  { href: "/app/pet-feed", matchHref: "/app/pet-feed", labelKey: "nav.browse" },
  { href: "/app/breeders", matchHref: "/app/breeders", labelKey: "nav.breeders" },
  { href: SUPPORT_HREF, matchHref: SUPPORT_HREF, labelKey: "nav.support" },
];

export function parseAnnouncementCategory(
  value: unknown,
): AnnouncementCategory {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(s)
    ? (s as AnnouncementCategory)
    : "general";
}

export function announcementCategoryLabelKey(
  category: AnnouncementCategory,
): EnKey {
  return `admin.news.cat.${category}`;
}

export function isAnnouncementPost(postKind: string | null | undefined): boolean {
  return String(postKind || "").toLowerCase() === "announcement";
}
