"use client";

import type { Lang, Listing } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  listingOverlayStatusLabelKey,
  listingOverlayStatusPillClass,
} from "@/lib/listingAvailabilityBadge";
import {
  isListingSpecies,
  listingSpeciesEmoji,
} from "@/lib/listingFormOptions";
import {
  formatListingCardPostedDate,
  listingHotBadges,
} from "@/lib/marketplaceSocialProof";

function fill(template: string, n: number | string): string {
  return template.replaceAll("{{n}}", String(n));
}

const OVERLAY_PILL = {
  species:
    "w-fit rounded-full border border-[#F3E2C8]/80 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#2B1E19] backdrop-blur-sm",
  saves:
    "w-fit rounded-full bg-[#EA580C]/95 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm",
  new: "w-fit rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-semibold text-[#78350F] shadow-sm",
  pending:
    "w-fit rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm",
  cancelled:
    "w-fit rounded-full bg-rose-700/90 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm",
  date: "inline-flex w-fit items-center gap-1 rounded-full bg-slate-700/90 px-2.5 py-1 text-[10px] font-semibold text-slate-50 shadow-sm",
} as const;

export function ListingMediaAvailabilityBadge({
  listing,
  lang,
}: {
  listing: Pick<Listing, "status" | "metadataSold" | "metadataCancelled">;
  lang: Lang;
}) {
  const isCancelled =
    listing.status === "cancelled" || Boolean(listing.metadataCancelled);
  const isSold = listing.status === "sold" || Boolean(listing.metadataSold);
  const statusLabelKey = listingOverlayStatusLabelKey({
    status: listing.status,
    isSold,
    isCancelled,
  });
  if (!statusLabelKey) return null;
  return (
    <span className={listingOverlayStatusPillClass(statusLabelKey)}>
      {t(lang, statusLabelKey)}
    </span>
  );
}

export function ListingMediaOverlayTags({
  listing,
  lang,
  favoriteCount,
}: {
  listing: Listing;
  lang: Lang;
  favoriteCount?: number;
}) {
  const speciesSlug = listing.species?.trim().toLowerCase() ?? "";
  const speciesLabel = isListingSpecies(speciesSlug)
    ? t(lang, `listing.new.species.${speciesSlug}` as EnKey)
    : listing.species;
  const speciesEmoji = listingSpeciesEmoji(speciesSlug);
  const isCancelled =
    listing.status === "cancelled" || Boolean(listing.metadataCancelled);
  const favCount =
    favoriteCount ??
    Math.max(0, Math.floor(Number(listing.favoriteCount) || 0));
  const hotBadges = listingHotBadges({ ...listing, favoriteCount: favCount });
  const postedDateLabel = formatListingCardPostedDate(listing.createdAt, lang);

  return (
    <div className="absolute left-3 top-3 z-10 flex max-w-[75%] flex-col gap-1.5 pointer-events-none">
      {speciesLabel ? (
        <span className={OVERLAY_PILL.species}>
          {speciesEmoji} {speciesLabel}
        </span>
      ) : null}
      {hotBadges.map((badge) => {
        if (badge.kind === "saves") {
          return (
            <span key="saves" className={OVERLAY_PILL.saves}>
              🔥 {fill(t(lang, "feed.card.saves"), badge.count)}
            </span>
          );
        }
        if (badge.kind === "new") {
          return (
            <span key="new" className={OVERLAY_PILL.new}>
              ✨ {t(lang, "feed.card.new")}
            </span>
          );
        }
        return null;
      })}
      {listing.status === "pending_review" ? (
        <span className={OVERLAY_PILL.pending}>
          {t(lang, "feed.card.pendingReview")}
        </span>
      ) : null}
      {isCancelled ? (
        <span className={OVERLAY_PILL.cancelled}>
          {t(lang, "feed.card.cancelled")}
        </span>
      ) : null}
      {postedDateLabel ? (
        <span className={OVERLAY_PILL.date}>
          <svg
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 opacity-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {postedDateLabel}
        </span>
      ) : null}
    </div>
  );
}
