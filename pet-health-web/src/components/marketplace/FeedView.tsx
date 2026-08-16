"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lang, Listing } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { parsePriceVnd } from "@/lib/formatPrice";
import { listingMatchesProvince, resolveProvinceSelection } from "@/lib/vietnamProvinceSelection";
import { VIETNAM_PROVINCES } from "@/constants/vietnamProvinces";
import { LISTING_SPECIES } from "@/lib/listingFormOptions";
import {
  pickJustArrivedListings,
  pickTopInterestedListings,
} from "@/lib/marketplaceFeedSections";
import {
  listingMatchesQuickCategory,
  parseQuickCategory,
  type QuickCategoryId,
} from "@/lib/marketplaceQuickCategories";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { ListingCard } from "./ListingCard";
import { MarketplaceListingRail } from "./MarketplaceListingRail";
import { MarketplaceQuickCategories } from "./MarketplaceQuickCategories";

const filterSelectCls =
  "appearance-none pl-3 pr-10 py-2 bg-white border border-[#F3E2C8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";

type FavState = { saved: boolean; favoriteCount: number };

export function FeedView({
  lang,
  listings,
  initialSpecies = "all",
  initialQ = "",
  initialProvince = "",
  hideDisclaimer = false,
}: {
  lang: Lang;
  listings: Listing[];
  breeders?: unknown;
  initialSpecies?: string;
  initialQ?: string;
  initialProvince?: string;
  hideDisclaimer?: boolean;
}) {
  const [activeSpecies, setActiveSpecies] = useState(
    initialSpecies && initialSpecies !== "" ? initialSpecies : "all",
  );
  const [sortBy, setSortBy] = useState("date");
  const [q] = useState(initialQ);
  const [province, setProvince] = useState(resolveProvinceSelection(initialProvince));
  const [quickCategory, setQuickCategory] = useState<QuickCategoryId>("all");
  const [favById, setFavById] = useState<Record<string, FavState>>(() => {
    const init: Record<string, FavState> = {};
    for (const listing of listings) {
      init[listing.id] = {
        saved: Boolean(listing.saved),
        favoriteCount: Math.max(0, Math.floor(Number(listing.favoriteCount) || 0)),
      };
    }
    return init;
  });

  const applyFavorite = useCallback(
    (next: { listingId: string; saved: boolean; favoriteCount: number }) => {
      setFavById((prev) => ({
        ...prev,
        [next.listingId]: {
          saved: next.saved,
          favoriteCount: next.favoriteCount,
        },
      }));
    },
    [],
  );

  const withFavorite = useCallback(
    (listing: Listing): Listing => {
      const fav = favById[listing.id];
      if (!fav) return listing;
      return {
        ...listing,
        saved: fav.saved,
        favoriteCount: fav.favoriteCount,
      };
    },
    [favById],
  );

  const listingsWithFav = useMemo(
    () => listings.map(withFavorite),
    [listings, withFavorite],
  );

  const topListings = useMemo(
    () => pickTopInterestedListings(listingsWithFav, 8),
    [listingsWithFav],
  );
  const arrivedListings = useMemo(
    () => pickJustArrivedListings(listingsWithFav, 8),
    [listingsWithFav],
  );

  const filtered = useMemo(() => {
    let rows = listingsWithFav.filter((l) => {
      if (activeSpecies !== "all" && l.species !== activeSpecies) return false;
      if (province && !listingMatchesProvince(l, province)) return false;
      if (!listingMatchesQuickCategory(l, quickCategory)) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay =
          `${l.title} ${l.breed} ${l.location} ${l.breeder.name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sortBy === "price") {
      rows = [...rows].sort((a, b) => {
        const pa = parsePriceVnd(a.price) ?? Number.POSITIVE_INFINITY;
        const pb = parsePriceVnd(b.price) ?? Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortBy === "trust") {
      rows = [...rows].sort(
        (a, b) => (b.breeder.trustScore || 0) - (a.breeder.trustScore || 0),
      );
    }
    return rows;
  }, [listingsWithFav, activeSpecies, sortBy, q, province, quickCategory]);

  const showMarketSections =
    !q.trim() &&
    activeSpecies === "all" &&
    !province &&
    quickCategory === "all";

  return (
    <div className={hideDisclaimer ? undefined : "min-h-screen bg-[#FDFBF7]"}>
      <div className={hideDisclaimer ? undefined : "max-w-[1200px] mx-auto px-5 lg:px-8 py-6"}>
        {!hideDisclaimer ? (
          <div className="mb-5">
            <DisclaimerBanner lang={lang} />
          </div>
        ) : null}

        <MarketplaceQuickCategories
          lang={lang}
          value={quickCategory}
          onChange={(id) => setQuickCategory(parseQuickCategory(id))}
        />

        {showMarketSections ? (
          <>
            <MarketplaceListingRail
              lang={lang}
              title={`🔥 ${t(lang, "feed.section.top.title")}`}
              subtitle={t(lang, "feed.section.top.subtitle")}
              listings={topListings}
              onFavoriteChange={applyFavorite}
            />
            <MarketplaceListingRail
              lang={lang}
              title={`✨ ${t(lang, "feed.section.arrived.title")}`}
              subtitle={t(lang, "feed.section.arrived.subtitle")}
              listings={arrivedListings}
              onFavoriteChange={applyFavorite}
            />
          </>
        ) : null}

        <div className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="min-w-0 shrink-0">
              <h2 className="font-display text-lg font-semibold text-[#2B1E19]">
                {t(lang, "feed.section.grid.title")}
              </h2>
              <p className="text-sm text-[#6E5A51] mt-0.5">
                {t(lang, "feed.showingPrefix")}{" "}
                <span className="font-semibold text-[#2B1E19]">
                  {filtered.length}
                </span>{" "}
                {t(lang, "feed.showingSuffix")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:max-w-[70%]">
              <select
                value={activeSpecies}
                onChange={(e) => setActiveSpecies(e.target.value)}
                className={filterSelectCls}
                aria-label={t(lang, "feed.species")}
              >
                <option value="all">{t(lang, "landing.species.all")}</option>
                {LISTING_SPECIES.map((id) => (
                  <option key={id} value={id}>
                    {t(lang, `listing.new.species.${id}` as EnKey)}
                  </option>
                ))}
              </select>
              <select
                value={province}
                onChange={(e) => setProvince(resolveProvinceSelection(e.target.value))}
                className={filterSelectCls}
                aria-label={t(lang, "feed.province")}
              >
                <option value="">{t(lang, "feed.province.all")}</option>
                {VIETNAM_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={filterSelectCls}
                aria-label={t(lang, "feed.sortLabel")}
              >
                <option value="date">
                  {t(lang, "feed.sortLabel")} {t(lang, "feed.sort.newest")}
                </option>
                <option value="price">
                  {t(lang, "feed.sortLabel")} {t(lang, "feed.sort.priceAsc")}
                </option>
                <option value="trust">
                  {t(lang, "feed.sortLabel")} {t(lang, "feed.sort.trust")}
                </option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 feed-results-enter">
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                lang={lang}
                showFavorite
                onFavoriteChange={applyFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🐾</p>
            <p className="font-semibold text-[#2B1E19]">
              {t(lang, "feed.empty")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
