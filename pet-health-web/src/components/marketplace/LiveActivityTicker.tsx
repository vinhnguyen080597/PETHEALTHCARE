"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  buildLiveTickerItems,
  liveTickerDisplayText,
  type LiveTickerItem,
} from "@/lib/marketplaceLiveTicker";

function tickerEmoji(kind: LiveTickerItem["kind"]): string {
  if (kind === "deposit") return "🎉";
  if (kind === "sold") return "🏠";
  if (kind === "new_batch") return "⚡";
  if (kind === "demo") return "";
  return "✨";
}

export function LiveActivityTicker({
  lang,
  listings,
  labelKey = "feed.live.label",
  className = "",
}: {
  lang: Lang;
  listings: Listing[];
  labelKey?: "feed.live.label" | "breeders.live.label";
  className?: string;
}) {
  const items = useMemo(() => buildLiveTickerItems(listings, Date.now(), 10), [listings]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [items.length]);

  const current = items[index] ?? null;
  const href =
    current?.listingId != null
      ? `/app/pet-feed/posts/${current.listingId}`
      : "/app/pet-feed";

  const text = current
    ? liveTickerDisplayText(current, lang, {
        deposit: t(lang, "feed.live.deposit"),
        sold: t(lang, "feed.live.sold"),
        newListing: t(lang, "feed.live.newListing"),
        newBatch: t(lang, "feed.live.newBatch"),
      })
    : t(lang, "feed.live.empty");

  const emoji = current ? tickerEmoji(current.kind) : "";

  return (
    <div
      className={`flex items-center gap-3 overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-[#FFF7ED] via-white to-[#FEF3C7] px-3.5 py-2.5 shadow-[0_8px_24px_-18px_rgba(234,88,12,0.55)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#EA580C] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        {t(lang, labelKey)}
      </span>
      {current ? (
        <Link
          href={href}
          className="min-w-0 flex-1 truncate text-sm text-[#2B1E19] hover:text-[#B45309] transition-colors"
        >
          {emoji ? <span className="mr-1.5">{emoji}</span> : null}
          {text}
        </Link>
      ) : (
        <p className="min-w-0 flex-1 truncate text-sm text-[#6E5A51]">{text}</p>
      )}
    </div>
  );
}
