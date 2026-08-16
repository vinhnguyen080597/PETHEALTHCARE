"use client";

import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import type { PublicComment } from "@/lib/api/public";
import {
  announcementCategoryLabelKey,
  parseAnnouncementCategory,
} from "@/lib/siteNav";
import {
  estimateReadMinutes,
  newsCoverUrl,
} from "@/lib/newsFeed";
import {
  buildListingGalleryItems,
} from "@/lib/listingGallery";
import {
  newsAuthorLabel,
  newsDetailBackHref,
} from "@/lib/newsDetail";
import { NewsSocialToolbar } from "./NewsSocialToolbar";

function formatNewsDate(value: string | undefined, lang: Lang): string {
  const ms = new Date(value || "").getTime();
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat(lang === "VI" ? "vi-VN" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(ms);
  } catch {
    return "";
  }
}

function publicCommentsToToolbarRows(comments: PublicComment[]) {
  return comments
    .map((c) => ({
      id: String(c.id || "").trim(),
      body: String(c.body || "").trim(),
      author_display_name: String(c.author_display_name || ""),
      user_id: String(c.user_id || ""),
      created_at: String(c.created_at || ""),
    }))
    .filter((c) => c.id && c.body);
}

export function NewsDetail({
  listing,
  lang,
  isLoggedIn = false,
  initialComments = [],
}: {
  listing: Listing;
  lang: Lang;
  isLoggedIn?: boolean;
  initialComments?: PublicComment[];
}) {
  const category = parseAnnouncementCategory(listing.announcementCategory);
  const categoryLabel = t(lang, announcementCategoryLabelKey(category));
  const dateLabel = formatNewsDate(listing.createdAt, lang);
  const cover = newsCoverUrl(listing);
  const minutes = estimateReadMinutes(listing.description);
  const author = newsAuthorLabel(listing, t(lang, "news.author"));
  const ctaLabel = listing.ctaLabel?.trim() || "";
  const ctaUrl = listing.ctaUrl?.trim() || "";
  const gallery = buildListingGalleryItems({
    mediaUrls: listing.mediaUrls,
    mediaUrl: listing.mediaUrl,
    videoUrl: listing.videoUrl,
  }).filter((item) => item.type === "image");
  const extraImages = gallery
    .map((g) => g.url)
    .filter((url) => url && url !== cover);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <article className="max-w-[760px] mx-auto px-5 lg:px-8 py-6">
        <Link
          href={newsDetailBackHref()}
          className="inline-flex items-center text-sm font-semibold text-[#D97706] hover:text-[#B45309]"
        >
          ← {t(lang, "news.detail.back")}
        </Link>

        <header className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 border border-amber-100">
              {categoryLabel}
            </span>
            <span className="font-medium text-[#6E5A51]">{author}</span>
            {dateLabel ? <span>· {dateLabel}</span> : null}
            <span>
              · {t(lang, "news.readMinutes").replace("{{n}}", String(minutes))}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B1E19] leading-tight">
            {listing.title}
          </h1>
        </header>

        {cover ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#F3E2C8] bg-[#FDFBF7] aspect-[16/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        {listing.description ? (
          <div className="mt-6 text-base sm:text-[17px] text-[#3F322C] leading-relaxed whitespace-pre-line">
            {listing.description}
          </div>
        ) : null}

        {ctaLabel && ctaUrl ? (
          <div className="mt-6">
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-[#D97706] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#B45309]"
            >
              {ctaLabel}
            </a>
          </div>
        ) : null}

        {extraImages.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
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

        <div className="mt-8 rounded-2xl border border-[#F3E2C8] bg-white px-4 py-3 sm:px-5">
          <NewsSocialToolbar
            lang={lang}
            post={listing}
            isLoggedIn={isLoggedIn}
            ownerUserId={listing.ownerUserId}
            initialComments={publicCommentsToToolbarRows(initialComments)}
            skipFavoriteHydrate
          />
        </div>
      </article>
    </div>
  );
}
