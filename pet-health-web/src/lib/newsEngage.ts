import type { Listing } from "./types";
import { newsPostDetailHref as newsPostDetailHrefFromDetail } from "./newsDetail";

/** Prefer popover share menu on desktop; native share only on clear mobile UAs. */
export function shouldPreferNativeShare(
  nav: Pick<Navigator, "share" | "userAgent"> | null | undefined,
): boolean {
  if (!nav || typeof nav.share !== "function") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(String(nav.userAgent || ""));
}

export function newsEngageLoginHref(): string {
  return `/login?next=${encodeURIComponent("/app/news")}`;
}

export const newsPostDetailHref = newsPostDetailHrefFromDetail;

/** Normalize comment API payloads (auth + public shapes). */
export function mapNewsCommentRows(payload: unknown): Array<{
  id: string;
  body: string;
  author_display_name: string;
  user_id: string;
  created_at: string;
}> {
  const root =
    payload && typeof payload === "object"
      ? (payload as { data?: unknown }).data
      : null;
  const rows = Array.isArray(root)
    ? root
    : Array.isArray(payload)
      ? payload
      : [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = String(r.id || "").trim();
      const body = String(r.body || "").trim();
      if (!id || !body) return null;
      return {
        id,
        body,
        author_display_name: String(
          r.author_display_name || r.authorDisplayName || "",
        ),
        user_id: String(r.user_id || r.userId || ""),
        created_at: String(r.created_at || r.createdAt || ""),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export function withOptimisticLikeCount(
  count: number,
  liked: boolean,
  nextLiked: boolean,
): number {
  if (liked === nextLiked) return Math.max(0, count);
  return Math.max(0, count + (nextLiked ? 1 : -1));
}

export type NewsShareTarget = "copy" | "facebook" | "zalo";

export function newsShareExternalUrl(
  target: Exclude<NewsShareTarget, "copy">,
  shareUrl: string,
): string {
  const encoded = encodeURIComponent(shareUrl);
  if (target === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  }
  return `https://zalo.me/share?url=${encoded}`;
}

/** Keep Listing typed for future engage helpers. */
export function isNewsListing(post: Listing | null | undefined): boolean {
  return Boolean(post?.id);
}
