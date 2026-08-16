import type { EnKey } from "../i18n";
import type { Listing } from "./types";
import {
  ANNOUNCEMENT_CATEGORIES,
  type AnnouncementCategory,
  parseAnnouncementCategory,
} from "./siteNav";

export type NewsCategoryFilter = "all" | AnnouncementCategory;

export type NewsTopicPill = {
  id: string;
  /** Filter to apply when clicked */
  filter: NewsCategoryFilter;
  labelKey: EnKey;
};

/** Desktop feed category pills (maps to admin announcement categories). */
export const NEWS_CATEGORY_FILTERS: readonly {
  id: NewsCategoryFilter;
  labelKey: EnKey;
}[] = [
  { id: "all", labelKey: "news.filter.all" },
  { id: "app_update", labelKey: "news.filter.app_update" },
  { id: "health_tip", labelKey: "news.filter.health_tip" },
  { id: "community", labelKey: "news.filter.community" },
  { id: "general", labelKey: "news.filter.general" },
];

/** Sidebar hashtag-style shortcuts. */
export const NEWS_TOPIC_PILLS: readonly NewsTopicPill[] = [
  { id: "care", filter: "health_tip", labelKey: "news.topic.care" },
  { id: "nutrition", filter: "health_tip", labelKey: "news.topic.nutrition" },
  { id: "warranty", filter: "general", labelKey: "news.topic.warranty" },
  { id: "breeder", filter: "community", labelKey: "news.topic.breeder" },
];

export function parseNewsCategoryFilter(
  value: string | null | undefined,
): NewsCategoryFilter {
  if (!value || value === "all") return "all";
  const s = String(value).trim().toLowerCase();
  if ((ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(s)) {
    return s as AnnouncementCategory;
  }
  return "all";
}

export function filterNewsPosts(
  posts: Listing[],
  filter: NewsCategoryFilter,
): Listing[] {
  if (filter === "all") return posts;
  return posts.filter(
    (p) => parseAnnouncementCategory(p.announcementCategory) === filter,
  );
}

/** ~200 Vietnamese/English words per minute. */
export function estimateReadMinutes(
  text: string | null | undefined,
  wordsPerMinute = 200,
): number {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (words <= 0) return 1;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function newsPostHasCover(post: Listing): boolean {
  const urls = post.mediaUrls?.length ? post.mediaUrls : [post.mediaUrl];
  return urls.some((u) => Boolean(u && !String(u).startsWith("data:image")));
}

export function newsCoverUrl(post: Listing): string | null {
  const urls = post.mediaUrls?.length ? post.mediaUrls : [post.mediaUrl];
  const hit = urls.find((u) => u && !String(u).startsWith("data:image"));
  return hit || null;
}

/** Prefer first cover post as featured; else first item. */
export function pickFeaturedNewsPost(posts: Listing[]): Listing | null {
  if (!posts.length) return null;
  return posts.find((p) => newsPostHasCover(p)) || posts[0] || null;
}

function engagementScore(post: Listing): number {
  return (post.favoriteCount || 0) + (post.commentCount || 0) * 2;
}

/** Top N by engagement, then recency. */
export function pickTrendingNewsPosts(
  posts: Listing[],
  limit = 3,
): Listing[] {
  return [...posts]
    .sort((a, b) => {
      const score = engagementScore(b) - engagementScore(a);
      if (score !== 0) return score;
      const ta = new Date(a.createdAt || "").getTime() || 0;
      const tb = new Date(b.createdAt || "").getTime() || 0;
      return tb - ta;
    })
    .slice(0, Math.max(0, limit));
}

export function newsStandardPosts(
  posts: Listing[],
  featuredId: string | null,
): Listing[] {
  if (!featuredId) return posts;
  return posts.filter((p) => p.id !== featuredId);
}

/** Whether the card body is long enough to need an expand control. */
export function newsBodyNeedsExpand(
  text: string | null | undefined,
  featured = false,
  options?: { mediaCount?: number },
): boolean {
  if ((options?.mediaCount || 0) > 1) return true;
  const s = String(text || "").trim();
  if (!s) return false;
  // Legacy list DTO truncated at 280 — always offer expand so we can fetch full body.
  if (s.length >= 280) return true;
  const lines = s.split(/\n/).filter((line) => line.trim().length > 0);
  const maxLines = featured ? 3 : 2;
  if (lines.length > maxLines) return true;
  const maxChars = featured ? 220 : 140;
  return s.length > maxChars;
}

/** True when list payload likely truncated the announcement body. */
export function newsDescriptionLooksTruncated(
  text: string | null | undefined,
): boolean {
  return String(text || "").trim().length >= 280;
}

export function isValidAnnouncementCategory(
  value: string,
): value is AnnouncementCategory {
  return (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value);
}

const BOOKMARK_STORAGE_KEY = "phc.news.bookmarks";
const LIKED_STORAGE_KEY = "phc.news.liked";

export function readNewsBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function writeNewsBookmarks(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BOOKMARK_STORAGE_KEY,
      JSON.stringify([...new Set(ids)]),
    );
  } catch {
    /* ignore quota */
  }
}

export function toggleNewsBookmarkId(
  ids: string[],
  postId: string,
): { next: string[]; bookmarked: boolean } {
  const id = String(postId || "").trim();
  if (!id) return { next: ids, bookmarked: false };
  if (ids.includes(id)) {
    return { next: ids.filter((x) => x !== id), bookmarked: false };
  }
  return { next: [...ids, id], bookmarked: true };
}

export function readNewsLikedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIKED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function writeNewsLikedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LIKED_STORAGE_KEY,
      JSON.stringify([...new Set(ids.filter(Boolean))]),
    );
  } catch {
    /* ignore quota */
  }
}

/** Initial heart state: SSR `saved` wins, else local cache (avoids hollow-heart flash). */
export function initialNewsLikedState(
  postId: string,
  savedFromServer: boolean,
  cachedLikedIds: string[] = readNewsLikedIds(),
): boolean {
  if (savedFromServer) return true;
  return cachedLikedIds.includes(String(postId || "").trim());
}

export function setNewsLikedInCache(postId: string, liked: boolean): void {
  const id = String(postId || "").trim();
  if (!id) return;
  const cur = readNewsLikedIds();
  writeNewsLikedIds(liked ? [...cur, id] : cur.filter((x) => x !== id));
}
