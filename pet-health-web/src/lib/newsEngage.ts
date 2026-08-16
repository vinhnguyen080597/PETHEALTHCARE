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

export type NewsCommentRow = {
  id: string;
  body: string;
  author_display_name: string;
  author_avatar_url: string | null;
  user_id: string;
  parent_id: string | null;
  created_at: string;
};

export type NewsCommentThread = {
  root: NewsCommentRow;
  replies: NewsCommentRow[];
};

/** Normalize comment API payloads (auth + public shapes). */
export function mapNewsCommentRows(payload: unknown): NewsCommentRow[] {
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
      const parentRaw = r.parent_id ?? r.parentId;
      const parent_id = parentRaw ? String(parentRaw).trim() || null : null;
      const avatar = String(
        r.author_avatar_url || r.authorAvatarUrl || "",
      ).trim();
      return {
        id,
        body,
        author_display_name: String(
          r.author_display_name || r.authorDisplayName || "",
        ),
        author_avatar_url: avatar || null,
        user_id: String(r.user_id || r.userId || ""),
        parent_id,
        created_at: String(r.created_at || r.createdAt || ""),
      };
    })
    .filter((row): row is NewsCommentRow => Boolean(row));
}

/** One-level threads (root + replies). Matches backend nesting rules. */
export function groupNewsCommentThreads(
  comments: NewsCommentRow[],
): NewsCommentThread[] {
  const roots = comments
    .filter((item) => !item.parent_id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const repliesByParent = new Map<string, NewsCommentRow[]>();
  for (const item of comments) {
    if (!item.parent_id) continue;
    const list = repliesByParent.get(item.parent_id) ?? [];
    list.push(item);
    repliesByParent.set(item.parent_id, list);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }
  return roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));
}

export function newsCommentInitials(name: string | null | undefined): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

/** Facebook-style relative time for comment meta. */
export function formatNewsCommentRelativeTime(
  value: string | null | undefined,
  lang: "EN" | "VI",
  nowMs = Date.now(),
): string {
  const ms = new Date(value || "").getTime();
  if (!Number.isFinite(ms)) return "";
  const diffSec = Math.max(0, Math.round((nowMs - ms) / 1000));
  if (diffSec < 45) return lang === "VI" ? "Vừa xong" : "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return lang === "VI" ? `${diffMin} phút` : `${diffMin}m`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) {
    return lang === "VI" ? `${diffHr} giờ` : `${diffHr}h`;
  }
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) {
    return lang === "VI" ? `${diffDay} ngày` : `${diffDay}d`;
  }
  try {
    return new Intl.DateTimeFormat(lang === "VI" ? "vi-VN" : "en-US", {
      day: "numeric",
      month: "short",
    }).format(ms);
  } catch {
    return "";
  }
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
