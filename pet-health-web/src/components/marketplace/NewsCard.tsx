"use client";

import { useEffect, useState } from "react";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  announcementCategoryLabelKey,
  parseAnnouncementCategory,
} from "@/lib/siteNav";
import {
  estimateReadMinutes,
  newsBodyNeedsExpand,
  newsCoverUrl,
} from "@/lib/newsFeed";
import { newsAuthorLabel } from "@/lib/newsDetail";
import { buildListingGalleryItems } from "@/lib/listingGallery";
import { NewsSocialToolbar } from "./NewsSocialToolbar";

function formatNewsDate(value: string | undefined, lang: Lang): string {
  const ms = new Date(value || "").getTime();
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat(lang === "VI" ? "vi-VN" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(ms);
  } catch {
    return "";
  }
}

function readMinutesLabel(lang: Lang, minutes: number): string {
  return t(lang, "news.readMinutes").replace("{{n}}", String(minutes));
}

export function NewsCard({
  lang,
  post,
  featured = false,
  isLoggedIn = false,
  expanded: expandedProp,
  onExpandedChange,
}: {
  lang: Lang;
  post: Listing;
  featured?: boolean;
  isLoggedIn?: boolean;
  /** Controlled expand (e.g. from trending click). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const controlled = typeof expandedProp === "boolean";
  const expanded = controlled ? Boolean(expandedProp) : uncontrolledExpanded;
  const setExpanded = (next: boolean) => {
    if (!controlled) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  };

  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const [fullMediaUrls, setFullMediaUrls] = useState<string[] | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState("");

  const category = parseAnnouncementCategory(post.announcementCategory);
  const categoryLabel = t(lang, announcementCategoryLabelKey(category));
  const dateLabel = formatNewsDate(post.createdAt, lang);
  const author = newsAuthorLabel(post, t(lang, "news.author"));
  const ctaLabel = post.ctaLabel?.trim() || "";
  const ctaUrl = post.ctaUrl?.trim() || "";

  const displayDescription = fullDescription ?? post.description;
  const displayMediaUrls = fullMediaUrls ?? post.mediaUrls;
  const displayPost: Listing = {
    ...post,
    description: displayDescription,
    mediaUrls: displayMediaUrls,
    mediaUrl: displayMediaUrls[0] || post.mediaUrl,
  };
  const cover = newsCoverUrl(displayPost);
  const minutes = estimateReadMinutes(displayDescription);
  const canExpand = newsBodyNeedsExpand(post.description, featured, {
    mediaCount: post.mediaCount || post.mediaUrls?.length || 0,
  });

  useEffect(() => {
    if (!expanded || fullDescription !== null) return;

    let cancelled = false;
    setFullLoading(true);
    setFullError("");
    void fetch(`/api/news/${encodeURIComponent(post.id)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        const detail = (data.data || data) as Listing;
        if (cancelled) return;
        setFullDescription(String(detail.description || post.description || ""));
        setFullMediaUrls(
          Array.isArray(detail.mediaUrls) && detail.mediaUrls.length
            ? detail.mediaUrls
            : post.mediaUrls || [],
        );
      })
      .catch(() => {
        if (cancelled) return;
        // Still unclamp whatever the list payload already has.
        setFullDescription(post.description || "");
        setFullMediaUrls(post.mediaUrls || []);
        setFullError(t(lang, "news.loadError"));
      })
      .finally(() => {
        if (!cancelled) setFullLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, fullDescription, lang, post.description, post.id, post.mediaUrls]);

  const gallery = buildListingGalleryItems({
    mediaUrls: displayMediaUrls,
    mediaUrl: displayPost.mediaUrl,
    videoUrl: post.videoUrl,
  }).filter((item) => item.type === "image");
  const extraImages = expanded
    ? gallery.map((g) => g.url).filter((url) => url && url !== cover)
    : [];

  const toggleExpand = () => {
    if (!canExpand && !expanded) return;
    setExpanded(!expanded);
  };

  return (
    <article
      id={`news-post-${post.id}`}
      className={`rounded-2xl border border-[#F3E2C8] bg-white shadow-sm shadow-amber-100/30 ${
        featured ? "ring-1 ring-amber-200/80" : ""
      }`}
    >
      {cover ? (
        <button
          type="button"
          onClick={toggleExpand}
          className={`block w-full relative overflow-hidden rounded-t-2xl bg-[#FDFBF7] text-left ${
            featured ? "aspect-[16/9]" : "aspect-[2/1] sm:aspect-[16/9]"
          } ${canExpand || expanded ? "cursor-pointer" : "cursor-default"}`}
          aria-expanded={expanded}
          disabled={!canExpand && !expanded}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
          {featured ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-[#2B1E19]/90 px-2.5 py-1 text-[11px] font-bold text-amber-100">
              🔥 {t(lang, "news.featured")}
            </span>
          ) : null}
        </button>
      ) : featured ? (
        <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-amber-50 to-[#FDFBF7] px-6">
          <span className="inline-flex items-center rounded-full bg-[#2B1E19] px-2.5 py-1 text-[11px] font-bold text-amber-100">
            🔥 {t(lang, "news.featured")}
          </span>
        </div>
      ) : null}

      <div className={`space-y-2.5 ${featured ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 border border-amber-100">
            {categoryLabel}
          </span>
          <span className="font-medium text-[#6E5A51]">{author}</span>
          {dateLabel ? <span>· {dateLabel}</span> : null}
          <span>· ⏱️ {readMinutesLabel(lang, minutes)}</span>
        </div>

        <h2
          className={`font-bold text-[#2B1E19] leading-snug ${
            featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          }`}
        >
          {canExpand || expanded ? (
            <button
              type="button"
              onClick={toggleExpand}
              className="text-left hover:text-[#D97706] transition-colors"
              aria-expanded={expanded}
            >
              {post.title}
            </button>
          ) : (
            post.title
          )}
        </h2>

        {displayDescription ? (
          <p
            className={`text-sm text-[#5C4A3A] leading-relaxed whitespace-pre-line ${
              expanded
                ? ""
                : featured
                  ? "line-clamp-3"
                  : "line-clamp-2"
            }`}
          >
            {displayDescription}
          </p>
        ) : null}

        {expanded && fullLoading ? (
          <p className="text-xs text-stone-400">{t(lang, "news.title")}…</p>
        ) : null}
        {expanded && fullError ? (
          <p className="text-xs text-amber-700" role="alert">
            {fullError}
          </p>
        ) : null}

        {extraImages.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {extraImages.map((url) => (
              <div
                key={url}
                className="overflow-hidden rounded-xl border border-[#F3E2C8] aspect-[4/3] bg-[#FDFBF7]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {canExpand || expanded ? (
            <button
              type="button"
              onClick={toggleExpand}
              className="text-sm font-semibold text-[#D97706] hover:text-[#B45309]"
              aria-expanded={expanded}
            >
              {expanded
                ? t(lang, "news.readLess")
                : `${t(lang, "news.readMore")} →`}
            </button>
          ) : null}
          {ctaLabel && ctaUrl ? (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-[#D97706] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#B45309]"
            >
              {ctaLabel}
            </a>
          ) : null}
        </div>

        <NewsSocialToolbar
          lang={lang}
          post={displayPost}
          isLoggedIn={isLoggedIn}
          ownerUserId={post.ownerUserId}
          skipFavoriteHydrate
        />
      </div>
    </article>
  );
}
