import { newsShareUrl } from "./config";
import { NEWS_HREF, isAnnouncementPost } from "./siteNav";
import type { Listing } from "./types";
import {
  type NewsCategoryFilter,
  parseNewsCategoryFilter,
} from "./newsFeed";

/** Canonical news feed URL. */
export function newsDetailBackHref(): string {
  return NEWS_HREF;
}

/**
 * Deep link to a post on the Tin tức feed (expand + scroll).
 * Example: `/app/news?post=<id>`
 */
export function newsPostDetailHref(postId: string): string {
  const id = String(postId || "").trim();
  if (!id) return NEWS_HREF;
  return `${NEWS_HREF}?post=${encodeURIComponent(id)}`;
}

/** Absolute share URL for announcements (feed deep link). */
export function newsPostShareUrl(postId: string): string {
  return newsShareUrl(postId);
}

/** Parse `?post=` from the news feed query string. */
export function parseNewsPostId(
  value: string | null | undefined,
): string | null {
  const id = String(value || "").trim();
  return id || null;
}

/** Build `/app/news` or `/app/news?category=…` for filter deep links. */
export function newsCategoryHref(filter: NewsCategoryFilter | string): string {
  const parsed = parseNewsCategoryFilter(filter);
  if (parsed === "all") return NEWS_HREF;
  return `${NEWS_HREF}?category=${encodeURIComponent(parsed)}`;
}

export function newsAuthorLabel(
  post: Pick<Listing, "authorLabel"> | null | undefined,
  fallback: string,
): string {
  const label = String(post?.authorLabel || "").trim();
  return label || fallback;
}

/** Open Graph copy for announcements (no pet/price framing). */
export function buildNewsOgCopy(listing: Listing): {
  title: string;
  description: string;
} {
  const title = String(listing.title || "News")
    .trim()
    .slice(0, 110);
  const description = String(listing.description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return {
    title: title || "News",
    description:
      description ||
      "PetCare: Pet Marketplace news and announcements",
  };
}

export function shouldRenderNewsDetail(
  post: Pick<Listing, "postKind"> | null | undefined,
): boolean {
  return isAnnouncementPost(post?.postKind);
}
