"use client";

import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  announcementCategoryLabelKey,
  parseAnnouncementCategory,
} from "@/lib/siteNav";
import {
  estimateReadMinutes,
  newsCoverUrl,
} from "@/lib/newsFeed";
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
}: {
  lang: Lang;
  post: Listing;
  featured?: boolean;
  isLoggedIn?: boolean;
}) {
  const category = parseAnnouncementCategory(post.announcementCategory);
  const categoryLabel = t(lang, announcementCategoryLabelKey(category));
  const dateLabel = formatNewsDate(post.createdAt, lang);
  const cover = newsCoverUrl(post);
  const detailHref = `/app/pet-feed/posts/${encodeURIComponent(post.id)}`;
  const ctaLabel = post.ctaLabel?.trim() || "";
  const ctaUrl = post.ctaUrl?.trim() || "";
  const minutes = estimateReadMinutes(post.description);

  return (
    <article
      className={`rounded-2xl border border-[#F3E2C8] bg-white shadow-sm shadow-amber-100/30 ${
        featured ? "ring-1 ring-amber-200/80" : ""
      }`}
    >
      {cover ? (
        <Link
          href={detailHref}
          className={`block relative overflow-hidden rounded-t-2xl bg-[#FDFBF7] ${
            featured ? "aspect-[16/9]" : "aspect-[2/1] sm:aspect-[16/9]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
          {featured ? (
            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-[#2B1E19]/90 px-2.5 py-1 text-[11px] font-bold text-amber-100">
              🔥 {t(lang, "news.featured")}
            </span>
          ) : null}
        </Link>
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
          <span className="font-medium text-[#6E5A51]">
            {t(lang, "news.author")}
          </span>
          {dateLabel ? <span>· {dateLabel}</span> : null}
          <span>· ⏱️ {readMinutesLabel(lang, minutes)}</span>
        </div>

        <h2
          className={`font-bold text-[#2B1E19] leading-snug ${
            featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          }`}
        >
          <Link
            href={detailHref}
            className="hover:text-[#D97706] transition-colors"
          >
            {post.title}
          </Link>
        </h2>

        {post.description ? (
          <p
            className={`text-sm text-[#5C4A3A] leading-relaxed whitespace-pre-line ${
              featured ? "line-clamp-3" : "line-clamp-2"
            }`}
          >
            {post.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={detailHref}
            className="text-sm font-semibold text-[#D97706] hover:text-[#B45309]"
          >
            {t(lang, "news.readMore")} →
          </Link>
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
          post={post}
          isLoggedIn={isLoggedIn}
          ownerUserId={post.ownerUserId}
        />
      </div>
    </article>
  );
}
