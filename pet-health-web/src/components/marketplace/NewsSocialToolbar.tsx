"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  formatNewsCommentRelativeTime,
  groupNewsCommentThreads,
  mapNewsCommentRows,
  newsCommentInitials,
  newsEngageLoginHref,
  newsShareExternalUrl,
  shouldPreferNativeShare,
  withOptimisticLikeCount,
  type NewsCommentRow,
} from "@/lib/newsEngage";
import { NewsCommentsSkeleton } from "@/components/ui/Skeleton";

export type NewsToolbarComment = NewsCommentRow;

function CommentAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover bg-[#E8DFD0]`}
      />
    );
  }
  return (
    <span
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full bg-[#D97706] font-bold text-white`}
      aria-hidden
    >
      {newsCommentInitials(name)}
    </span>
  );
}

function CommentBubble({
  lang,
  comment,
  ownerUserId,
  isReply = false,
  onReply,
}: {
  lang: Lang;
  comment: NewsCommentRow;
  ownerUserId?: string | null;
  isReply?: boolean;
  onReply?: (comment: NewsCommentRow) => void;
}) {
  const name = comment.author_display_name || "—";
  const isAuthor =
    ownerUserId && comment.user_id && comment.user_id === ownerUserId;
  const timeLabel = formatNewsCommentRelativeTime(comment.created_at, lang);

  return (
    <div className={`flex gap-2 ${isReply ? "ml-11" : ""}`}>
      <CommentAvatar
        name={name}
        src={comment.author_avatar_url}
        size={isReply ? "sm" : "md"}
      />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-[#F0E6D8]/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-[#2B1E19]">{name}</span>
            {isAuthor ? (
              <span className="text-[10px] font-bold uppercase text-[#D97706]">
                {t(lang, "news.comments.authorBadge")}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-[#3F322C] leading-relaxed whitespace-pre-line">
            {comment.body}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 px-1 text-[11px] font-semibold text-[#8B7355]">
          {timeLabel ? <span>{timeLabel}</span> : null}
          {!isReply && onReply ? (
            <button
              type="button"
              className="hover:text-[#D97706] hover:underline"
              onClick={() => onReply(comment)}
            >
              {t(lang, "news.comments.reply")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [comments, setComments] = useState<NewsCommentRow[]>(
    () => initialComments || [],
  );
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [replyTo, setReplyTo] = useState<NewsCommentRow | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>(
    {},
  );
  /** When parent passed SSR comments (incl. empty), skip the list fetch. */
  const [commentsFetched, setCommentsFetched] = useState(
    () => initialComments !== undefined,
  );
  const shareRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const shareUrl = newsShareUrl(post.id);
  const loginHref = newsEngageLoginHref();

  const threads = useMemo(() => groupNewsCommentThreads(comments), [comments]);
  const totalCommentCount = Math.max(post.commentCount || 0, comments.length);
  /** First open only — cached comments skip skeleton on reopen. */
  const showCommentsSkeleton =
    commentsOpen && !commentsFetched && !commentsError;

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

  const openCommentsPanel = () => {
    setCommentsOpen((open) => {
      const next = !open;
      if (next && !commentsFetched) {
        setCommentsError("");
        setCommentsLoading(true);
      }
      return next;
    });
  };
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

  const startReply = (comment: NewsCommentRow) => {
    if (!loggedIn) {
      goLogin();
      return;
    }
    setReplyTo(comment);
    setCollapsedReplies((prev) => ({ ...prev, [comment.id]: false }));
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const postComment = async () => {
    const body = commentText.trim();
    if (!body || commentBusy) return;
    setCommentBusy(true);
    setCommentsError("");
    setActionError("");
    const parentId = replyTo?.id || null;
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(post.id)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            ...(parentId ? { parentId } : {}),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        goLogin();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed");
      const created = (data.data || data) as Record<string, unknown>;
      const row: NewsCommentRow = {
        id: String(created.id || `local-${Date.now()}`),
        body: String(created.body || body),
        author_display_name: String(
          created.author_display_name || t(lang, "nav.account"),
        ),
        author_avatar_url: String(created.author_avatar_url || "").trim() || null,
        user_id: String(created.user_id || ""),
        parent_id: parentId
          ? parentId
          : String(created.parent_id || "").trim() || null,
        created_at: String(created.created_at || new Date().toISOString()),
      };
      setComments((prev) => [...prev, row]);
      setCommentText("");
      setReplyTo(null);
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
          onClick={openCommentsPanel}
          aria-expanded={commentsOpen}
        >
          <span aria-hidden>💬</span>
          <span>
            {totalCommentCount > 0
              ? totalCommentCount
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
          <span>
            {bookmarked
              ? t(lang, "news.action.saved")
              : t(lang, "news.action.save")}
          </span>
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
        <div className="rounded-xl border border-[#F3E2C8] bg-white p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8B7355]">
            {t(lang, "news.comments.title")}
          </p>
          {showCommentsSkeleton || commentsLoading ? (
            <NewsCommentsSkeleton />
          ) : commentsError ? (
            <p className="text-xs text-red-600">{commentsError}</p>
          ) : threads.length === 0 ? (
            <p className="text-xs text-stone-500">{t(lang, "news.comments.empty")}</p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {threads.map((thread) => {
                const repliesHidden = Boolean(collapsedReplies[thread.root.id]);
                const replyCount = thread.replies.length;
                return (
                  <li key={thread.root.id} className="space-y-2">
                    <CommentBubble
                      lang={lang}
                      comment={thread.root}
                      ownerUserId={ownerUserId}
                      onReply={startReply}
                    />
                    {replyCount > 0 ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="ml-11 text-[11px] font-semibold text-[#D97706] hover:underline"
                          onClick={() =>
                            setCollapsedReplies((prev) => ({
                              ...prev,
                              [thread.root.id]: !repliesHidden,
                            }))
                          }
                        >
                          {repliesHidden
                            ? t(lang, "news.comments.viewReplies").replace(
                                "{{n}}",
                                String(replyCount),
                              )
                            : t(lang, "news.comments.hideReplies")}
                        </button>
                        {!repliesHidden
                          ? thread.replies.map((reply) => (
                              <CommentBubble
                                key={reply.id}
                                lang={lang}
                                comment={reply}
                                ownerUserId={ownerUserId}
                                isReply
                              />
                            ))
                          : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {loggedIn ? (
            <div className="space-y-2 border-t border-[#F3E2C8] pt-3">
              {replyTo ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF8EF] px-2.5 py-1.5 text-xs text-[#6E5A51]">
                  <span>
                    {t(lang, "news.comments.replyingTo").replace(
                      "{{name}}",
                      replyTo.author_display_name || "—",
                    )}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-[#D97706] hover:underline"
                    onClick={() => setReplyTo(null)}
                  >
                    {t(lang, "news.comments.cancelReply")}
                  </button>
                </div>
              ) : null}
              <div className="flex items-start gap-2">
                <CommentAvatar name={t(lang, "nav.account")} />
                <div className="flex min-w-0 flex-1 gap-2">
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      replyTo
                        ? t(lang, "news.comments.replyPlaceholder")
                        : t(lang, "news.comments.placeholder")
                    }
                    className="flex-1 rounded-full border border-[#E8DFD0] bg-[#FDFBF7] px-3.5 py-2 text-sm outline-none focus:border-[#D97706]"
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
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 border-t border-[#F3E2C8] pt-3">
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
