"use client";

import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import {
  announcementCategoryLabelKey,
} from "@/lib/siteNav";
import { estimateReadMinutes } from "@/lib/newsFeed";
import type { AdminNewsLivePreviewModel } from "@/lib/admin/news";

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

/** Live Tin tức card preview for admin news compose (no social / no API fetch). */
export function AdminNewsLivePreview({
  lang,
  model,
}: {
  lang: Lang;
  model: AdminNewsLivePreviewModel;
}) {
  const categoryLabel = t(lang, announcementCategoryLabelKey(model.category));
  const dateLabel = formatNewsDate(model.createdAt, lang);
  const displayTitle = model.hasTitle
    ? model.title
    : t(lang, "admin.news.previewEmptyTitle");
  const displayBody = model.hasBody
    ? model.body
    : t(lang, "admin.news.previewEmptyBody");
  const minutes = estimateReadMinutes(model.hasBody ? model.body : "");
  const extraImages = model.photoUrls.slice(1);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B7355]">
        {t(lang, "admin.news.previewLabel")}
      </p>
      <article className="rounded-2xl border border-[#F3E2C8] bg-white shadow-sm shadow-amber-100/30">
        {model.coverUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-[#FDFBF7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={model.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="space-y-2.5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
            <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
              {categoryLabel}
            </span>
            <span className="font-medium text-[#6E5A51]">{model.authorLabel}</span>
            {dateLabel ? <span>· {dateLabel}</span> : null}
            <span>· ⏱️ {readMinutesLabel(lang, minutes)}</span>
          </div>

          <h2
            className={`text-base font-bold leading-snug sm:text-lg ${
              model.hasTitle ? "text-[#2B1E19]" : "text-[#C4B5A5]"
            }`}
          >
            {displayTitle}
          </h2>

          <p
            className={`whitespace-pre-line text-sm leading-relaxed ${
              model.hasBody ? "text-[#5C4A3A]" : "text-[#C4B5A5]"
            }`}
          >
            {displayBody}
          </p>

          {extraImages.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {extraImages.map((url) => (
                <div
                  key={url}
                  className="aspect-[4/3] overflow-hidden rounded-xl border border-[#F3E2C8] bg-[#FDFBF7]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          {model.ctaLabel && model.ctaUrl ? (
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <a
                href={model.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#D97706] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#B45309]"
              >
                {model.ctaLabel}
              </a>
            </div>
          ) : null}
        </div>
      </article>
      <p className="text-[11px] text-[#8B7355]">
        {t(lang, "admin.news.previewHint")}
      </p>
    </div>
  );
}
