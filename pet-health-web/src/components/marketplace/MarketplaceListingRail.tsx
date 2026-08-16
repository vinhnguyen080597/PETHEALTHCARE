"use client";

import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { ListingCard } from "./ListingCard";

export function MarketplaceListingRail({
  lang,
  title,
  subtitle,
  listings,
  showFavorite = true,
}: {
  lang: Lang;
  title: string;
  subtitle?: string;
  listings: Listing[];
  showFavorite?: boolean;
}) {
  if (!listings.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#2B1E19] tracking-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[#6E5A51]">{subtitle}</p>
          ) : null}
        </div>
        <span className="text-xs font-medium text-[#B45309] shrink-0">
          {listings.length} {t(lang, "feed.results")}
        </span>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="w-[260px] sm:w-[280px] shrink-0 snap-start"
          >
            <ListingCard
              listing={listing}
              lang={lang}
              showFavorite={showFavorite}
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
}
