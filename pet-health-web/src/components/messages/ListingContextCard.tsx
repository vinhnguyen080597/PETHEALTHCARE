"use client";

import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { formatPriceVnd } from "@/lib/formatPrice";
import {
  isConversationBreederViewer,
  resolveConversationPostSummary,
  type MessageConversation,
  type MessageConversationPostSummary,
} from "@/lib/messages";
import { brandUi } from "@/lib/brand";

export function ListingContextCard({
  lang,
  conversation = null,
  summary: summaryProp,
  currentUserId,
  compact = false,
  variant = "listing",
}: {
  lang: Lang;
  conversation?: MessageConversation | null;
  summary?: MessageConversationPostSummary | null;
  currentUserId: string | null;
  compact?: boolean;
  variant?: "listing" | "breeder";
}) {
  if (variant === "breeder") {
    return (
      <div
        className={`min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white ${compact ? "p-2.5" : "p-3"}`}
      >
        {!compact ? (
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
            {t(lang, "messages.chatWithFarm")}
          </p>
        ) : null}
        <div className={`${compact ? "" : "mt-2.5"} flex gap-3`}>
          <div
            className={`${compact ? "h-12 w-12 text-sm" : "h-16 w-16 text-lg"} flex shrink-0 items-center justify-center rounded-xl bg-amber-50 ${brandUi.primaryText}`}
          >
            🏪
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 line-clamp-2 wrap-anywhere">
              {conversation?.peer_display_name || t(lang, "messages.peerFallback")}
            </p>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              {t(lang, "messages.chatWithFarm")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const summary = summaryProp || resolveConversationPostSummary(conversation);
  if (!summary?.id) return null;

  const isBreeder = isConversationBreederViewer(conversation, currentUserId);
  const unavailable = summary.status && summary.status !== "published";
  const price = formatPriceVnd(summary.price_note || "") || summary.price_note || "";
  const detailLine = [summary.breed || summary.species, summary.location, price]
    .filter(Boolean)
    .join(" · ");
  const thumb = summary.thumb_url;
  const thumbSize = compact ? "h-12 w-12" : "h-16 w-16";

  const body = (
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white ${compact ? "p-2.5" : "p-3"}`}
    >
      {!compact ? (
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
          {t(
            lang,
            isBreeder
              ? "messages.contextCardTitleBreeder"
              : "messages.contextCardTitle",
          )}
        </p>
      ) : null}
      <div className={`${compact ? "" : "mt-2.5"} flex gap-3`}>
        <div className={`${thumbSize} shrink-0 overflow-hidden rounded-xl bg-slate-100`}>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center ${compact ? "text-sm" : "text-lg"} ${brandUi.primaryText}`}
            >
              🐾
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 line-clamp-2 wrap-anywhere">
            {summary.title || t(lang, "messages.listingFallback")}
          </p>
          {detailLine ? (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 wrap-anywhere">{detailLine}</p>
          ) : null}
          {unavailable ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {t(lang, "messages.listingUnavailable")}
            </p>
          ) : null}
        </div>
        {!unavailable ? (
          <span className="self-center text-slate-300" aria-hidden>
            ›
          </span>
        ) : null}
      </div>
    </div>
  );

  if (unavailable) return body;
  return (
    <Link
      href={`/app/pet-feed/posts/${encodeURIComponent(summary.id)}`}
      className="block min-w-0 max-w-full hover:opacity-95"
      aria-label={t(lang, "messages.openListing")}
    >
      {body}
    </Link>
  );
}
