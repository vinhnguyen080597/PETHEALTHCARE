"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { newsShareUrl } from "@/lib/config";
import {
  initialNewsLikedState,
  readNewsBookmarks,
  setNewsLikedInCache,
  toggleNewsBookmarkId,
  writeNewsBookmarks,
} from "@/lib/newsFeed";
import {
  mapNewsCommentRows,
  newsEngageLoginHref,
  newsShareExternalUrl,
  shouldPreferNativeShare,
  withOptimisticLikeCount,
} from "@/lib/newsEngage";

export type NewsToolbarComment = {
  id: string;
  body: string;
  author_display_name?: string;
  user_id?: string;
  created_at?: string;
};

export function NewsSocialToolbar({
  lang,
  post,
  isLoggedIn: isLoggedInProp,
  ownerUserId,
  initialComments,
  /** Trust SSR `saved` + local cache; skip per-card favorite GET (list perf). */
  skipFavoriteHydrate = false,
}: {
  lang: Lang;
  post: Listing;
  isLoggedIn: boolean;
  ownerUserId?: string | null;
  initialComments?: NewsToolbarComment[];
  skipFavoriteHydrate?: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(isLoggedInProp);
  const [liked, setLiked] = useState(() =>
    initialNewsLikedState(post.id, Boolean(post.saved)),
  );
  const [likeCount, setLikeCount] = useState(post.favoriteCount || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeBounce, setLikeBounce] = useState(false);
  const [likeHydrated, setLikeHydrated] = useState(
    () => Boolean(skipFavoriteHydrate || post.saved || !isLoggedInProp),
  );
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkNotice, setBookmarkNotice] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [comments, setComments] = useState<NewsToolbarComment[]>(
    () => initialComments || [],
  );
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  /** When parent passed SSR comments (incl. empty), skip the list fetch. */
  const [commentsFetched, setCommentsFetched] = useState(
    () => initialComments !== undefined,
  );
  const shareRef = useRef<HTMLDivElement | null>(null);
  const shareUrl = newsShareUrl(post.id);
  const loginHref = newsEngageLoginHref();

  useEffect(() => {
    setLoggedIn(isLoggedInProp);
  }, [isLoggedInProp]);

  useEffect(() => {
    setLiked(initialNewsLikedState(post.id, Boolean(post.saved)));
    setLikeCount(post.favoriteCount || 0);
    if (post.saved) {
      setLikeHydrated(true);
      setNewsLikedInCache(post.id, true);
    } else if (skipFavoriteHydrate || !isLoggedInProp) {
      setLikeHydrated(true);
    }
  }, [post.id, post.saved, post.favoriteCount, skipFavoriteHydrate, isLoggedInProp]);

  useEffect(() => {
    if (skipFavoriteHydrate || !isLoggedInProp || post.saved) {
      setLikeHydrated(true);
      return;
    }
    let cancelled = false;
    void fetch(`/api/listings/${encodeURIComponent(post.id)}/favorite`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) {
            setLoggedIn(false);
            setLikeHydrated(true);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setLikeHydrated(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const favorited = Boolean(data?.data?.favorited);
        if (!cancelled) {
          setLoggedIn(true);
          setLiked(favorited);
          setNewsLikedInCache(post.id, favorited);
          setLikeHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLikeHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [post.id, post.saved, skipFavoriteHydrate, isLoggedInProp]);

  useEffect(() => {
    setBookmarked(readNewsBookmarks().includes(post.id));
  }, [post.id]);

  useEffect(() => {
    if (!shareOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (shareRef.current?.contains(e.target as Node)) return;
      setShareOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [shareOpen]);

  useEffect(() => {
    if (!commentsOpen || commentsFetched) return;
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError("");
    void fetch(`/api/listings/${encodeURIComponent(post.id)}/comments`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        if (!cancelled) {
          setComments(mapNewsCommentRows(data));
          setCommentsFetched(true);
        }
      })
      .catch(() => {
        if (!cancelled) setCommentsError(t(lang, "news.comments.loadError"));
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [commentsOpen, commentsFetched, post.id, lang]);

  const goLogin = () => {
    window.location.href = loginHref;
  };

  const toggleLike = async () => {
    if (likeBusy) return;
    setActionError("");
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => withOptimisticLikeCount(c, !next, next));
    setLikeBounce(true);
    window.setTimeout(() => setLikeBounce(false), 280);
    setLikeBusy(true);
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(post.id)}/favorite`,
        { method: next ? "POST" : "DELETE" },
      );
      if (res.status === 401) {
        setLiked(!next);
        setLikeCount((c) => withOptimisticLikeCount(c, next, !next));
        setNewsLikedInCache(post.id, !next);
        goLogin();
        return;
      }
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed");
      }
      setLoggedIn(true);
      setNewsLikedInCache(post.id, next);
    } catch {
      setLiked(!next);
      setLikeCount((c) => withOptimisticLikeCount(c, next, !next));
      setNewsLikedInCache(post.id, !next);
      setActionError(t(lang, "news.action.likeFailed"));
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleBookmark = () => {
    const { next, bookmarked: on } = toggleNewsBookmarkId(
      readNewsBookmarks(),
      post.id,
    );
    writeNewsBookmarks(next);
    setBookmarked(on);
    setBookmarkNotice(
      on ? t(lang, "news.action.saved") : t(lang, "news.action.unsaved"),
    );
    window.setTimeout(() => setBookmarkNotice(""), 1800);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNotice(t(lang, "news.share.copied"));
      setShareOpen(false);
      window.setTimeout(() => setShareNotice(""), 2000);
    } catch {
      setActionError(t(lang, "news.share.copyFailed"));
    }
  };

  const shareNativeOrMenu = async () => {
    setActionError("");
    if (shouldPreferNativeShare(navigator)) {
      try {
        await navigator.share({
          title: post.title,
          text: post.title,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setShareOpen((v) => !v);
  };

  const postComment = async () => {
    const body = commentText.trim();
    if (!body || commentBusy) return;
    setCommentBusy(true);
    setCommentsError("");
    setActionError("");
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(post.id)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        goLogin();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      const created = (data.data || data) as Record<string, unknown>;
      setComments((prev) => [
        {
          id: String(created.id || `local-${Date.now()}`),
          body: String(created.body || body),
          author_display_name: String(
            created.author_display_name || t(lang, "nav.account"),
          ),
          user_id: String(created.user_id || ""),
          created_at: String(created.created_at || new Date().toISOString()),
        },
        ...prev,
      ]);
      setCommentText("");
      setLoggedIn(true);
    } catch {
      setCommentsError(t(lang, "news.comments.postError"));
    } finally {
      setCommentBusy(false);
    }
  };

  const btnCls =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#5C4A3A] hover:bg-[#FFF8EF] transition-colors disabled:opacity-50";

  return (
    <div className="relative z-10 border-t border-[#F3E2C8] pt-3 mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={`${btnCls} ${liked ? "text-rose-600" : ""} ${likeBounce ? "scale-110" : ""} transition-transform ${
            !likeHydrated && !liked ? "opacity-70" : ""
          }`}
          onClick={() => void toggleLike()}
          disabled={likeBusy}
          aria-pressed={liked}
          aria-busy={!likeHydrated}
          aria-label={t(lang, "news.action.like")}
        >
          <span aria-hidden>{liked ? "❤️" : "🤍"}</span>
          <span>{likeCount > 0 ? likeCount : t(lang, "news.action.like")}</span>
        </button>
        <button
          type="button"
          className={`${btnCls} ${commentsOpen ? "bg-[#FFF8EF] text-[#D97706]" : ""}`}
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
        >
          <span aria-hidden>💬</span>
          <span>
            {Math.max(post.commentCount || 0, comments.length) > 0
              ? Math.max(post.commentCount || 0, comments.length)
              : t(lang, "news.action.comment")}
          </span>
        </button>
        <div className="relative" ref={shareRef}>
          <button
            type="button"
            className={`${btnCls} ${shareOpen ? "bg-[#FFF8EF] text-[#D97706]" : ""}`}
            onClick={() => void shareNativeOrMenu()}
          >
            <span aria-hidden>↗️</span>
            <span>{shareNotice || t(lang, "news.action.share")}</span>
          </button>
          {shareOpen ? (
            <div className="absolute left-0 top-full mt-2 z-30 min-w-[12rem] rounded-xl border border-[#F3E2C8] bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[#2B1E19] hover:bg-[#FFF8EF]"
                onClick={() => void copyLink()}
              >
                {t(lang, "news.share.copy")}
              </button>
              <a
                href={newsShareExternalUrl("facebook", shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-3 py-2 text-left text-sm text-[#2B1E19] hover:bg-[#FFF8EF]"
                onClick={() => setShareOpen(false)}
              >
                {t(lang, "news.share.facebook")}
              </a>
              <a
                href={newsShareExternalUrl("zalo", shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-3 py-2 text-left text-sm text-[#2B1E19] hover:bg-[#FFF8EF]"
                onClick={() => setShareOpen(false)}
              >
                {t(lang, "news.share.zalo")}
              </a>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`${btnCls} ${bookmarked ? "text-[#D97706]" : ""}`}
          onClick={toggleBookmark}
          aria-pressed={bookmarked}
        >
          <span aria-hidden>{bookmarked ? "🔖" : "📑"}</span>
          <span>{bookmarkNotice || t(lang, "news.action.save")}</span>
        </button>
      </div>

      {actionError ? (
        <p className="text-xs text-red-600" role="alert">
          {actionError}{" "}
          {!loggedIn ? (
            <Link href={loginHref} className="underline font-semibold">
              {t(lang, "nav.login")}
            </Link>
          ) : null}
        </p>
      ) : null}

      {commentsOpen ? (
        <div className="rounded-xl border border-[#F3E2C8] bg-[#FDFBF7] p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8B7355]">
            {t(lang, "news.comments.title")}
          </p>
          {commentsLoading ? (
            <p className="text-xs text-stone-400">…</p>
          ) : commentsError ? (
            <p className="text-xs text-red-600">{commentsError}</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-stone-500">{t(lang, "news.comments.empty")}</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {comments.slice(0, 8).map((c) => {
                const isAuthor =
                  ownerUserId && c.user_id && c.user_id === ownerUserId;
                return (
                  <li key={c.id} className="text-sm text-[#2B1E19]">
                    <span className="font-semibold">
                      {c.author_display_name || "—"}
                    </span>
                    {isAuthor ? (
                      <span className="ml-1.5 text-[10px] font-bold uppercase text-[#D97706]">
                        {t(lang, "news.comments.authorBadge")}
                      </span>
                    ) : null}
                    <p className="mt-0.5 text-[#5C4A3A] leading-relaxed">
                      {c.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {loggedIn ? (
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t(lang, "news.comments.placeholder")}
                className="flex-1 rounded-xl border border-[#E8DFD0] bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void postComment();
                  }
                }}
              />
              <button
                type="button"
                disabled={commentBusy || !commentText.trim()}
                onClick={() => void postComment()}
                className="shrink-0 rounded-full bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#B45309] disabled:opacity-50"
              >
                {t(lang, "news.comments.send")}
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              <Link
                href={loginHref}
                className="text-[#D97706] font-semibold underline"
              >
                {t(lang, "nav.login")}
              </Link>{" "}
              {t(lang, "news.action.loginToEngage")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
