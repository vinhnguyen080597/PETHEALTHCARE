"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  buildLiveTickerItems,
  liveTickerDisplayText,
  MARKETPLACE_BLOCK_GAP_CLASS,
  type LiveTickerItem,
} from "@/lib/marketplaceLiveTicker";

function tickerEmoji(kind: LiveTickerItem["kind"]): string {
  if (kind === "deposit") return "🎉";
  if (kind === "sold") return "🏠";
  if (kind === "new_batch") return "⚡";
  if (kind === "demo") return "";
  return "✨";
}

function itemHref(item: LiveTickerItem): string {
  return item.listingId != null
    ? `/app/pet-feed/posts/${item.listingId}`
    : "/app/pet-feed";
}

export function LiveActivityTicker({
  lang,
  listings,
  labelKey = "feed.live.label",
  className = MARKETPLACE_BLOCK_GAP_CLASS,
  showEscrowUi = false,
}: {
  lang: Lang;
  listings: Listing[];
  labelKey?: "feed.live.label" | "breeders.live.label";
  className?: string;
  showEscrowUi?: boolean;
}) {
  const items = useMemo(
    () =>
      buildLiveTickerItems(listings, Date.now(), 10, {
        includeDepositEvents: showEscrowUi,
      }),
    [listings, showEscrowUi],
  );

  const templates = useMemo(
    () => ({
      deposit: t(lang, "feed.live.deposit"),
      sold: t(lang, "feed.live.sold"),
      newListing: t(lang, "feed.live.newListing"),
      newBatch: t(lang, "feed.live.newBatch"),
    }),
    [lang],
  );

  const labels = useMemo(
    () =>
      items.map((item) => {
        const text = liveTickerDisplayText(item, lang, templates);
        const emoji = tickerEmoji(item.kind);
        return {
          id: item.id,
          href: itemHref(item),
          label: emoji ? `${emoji} ${text}` : text,
        };
      }),
    [items, lang, templates],
  );

  // Duplicate track for a seamless right→left loop.
  const track = labels.length > 0 ? [...labels, ...labels] : [];
  const durationSec = Math.max(60, labels.length * 9);

  return (
    <div
      className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-[#FFF7ED] via-white to-[#FEF3C7] px-3.5 py-2.5 shadow-[0_8px_24px_-18px_rgba(234,88,12,0.55)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#EA580C] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        {t(lang, labelKey)}
      </span>

      <div className="relative min-w-0 flex-1 overflow-hidden mask-live-ticker">
        {track.length > 0 ? (
          <div
            className="live-ticker-marquee flex w-max items-center gap-10 whitespace-nowrap will-change-transform"
            style={{ animationDuration: `${durationSec}s` }}
          >
            {track.map((row, i) => (
              <Link
                key={`${row.id}-${i}`}
                href={row.href}
                className="inline-flex shrink-0 text-sm text-[#2B1E19] hover:text-[#B45309] transition-colors"
              >
                {row.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="truncate text-sm text-[#6E5A51]">
            {t(lang, "feed.live.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
