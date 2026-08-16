"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import {
  buildLiveTickerItems,
  formatTickerMinutes,
  type LiveTickerItem,
} from "@/lib/marketplaceLiveTicker";

function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function tickerText(item: LiveTickerItem, lang: Lang): string {
  const time = formatTickerMinutes(item.minutesAgo, lang);
  const location = item.location ? ` (${item.location})` : "";
  if (item.kind === "new_batch") {
    return fillTemplate(t(lang, "feed.live.newBatch"), {
      count: item.petTitle,
    });
  }
  const vars = {
    breeder: item.breederName,
    pet: item.petTitle,
    location,
    time,
  };
  if (item.kind === "deposit") {
    return fillTemplate(t(lang, "feed.live.deposit"), vars);
  }
  if (item.kind === "sold") {
    return fillTemplate(t(lang, "feed.live.sold"), vars);
  }
  return fillTemplate(t(lang, "feed.live.newListing"), vars);
}

function tickerEmoji(kind: LiveTickerItem["kind"]): string {
  if (kind === "deposit") return "🎉";
  if (kind === "sold") return "🏠";
  if (kind === "new_batch") return "⚡";
  return "✨";
}

export function LiveActivityTicker({
  lang,
  listings,
  labelKey = "feed.live.label",
}: {
  lang: Lang;
  listings: Listing[];
  labelKey?: "feed.live.label" | "breeders.live.label";
}) {
  const items = useMemo(() => buildLiveTickerItems(listings), [listings]);
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

  return (
    <div
      className="mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-r from-[#FFF7ED] via-white to-[#FEF3C7] px-3.5 py-2.5 shadow-[0_8px_24px_-18px_rgba(234,88,12,0.55)]"
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
          <span className="mr-1.5">{tickerEmoji(current.kind)}</span>
          {tickerText(current, lang)}
        </Link>
      ) : (
        <p className="min-w-0 flex-1 truncate text-sm text-[#6E5A51]">
          {t(lang, "feed.live.empty")}
        </p>
      )}
    </div>
  );
}
