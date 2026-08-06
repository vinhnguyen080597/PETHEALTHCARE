"use client";

import { useMemo, useState } from "react";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { parsePriceVnd } from "@/lib/formatPrice";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { ListingCard } from "./ListingCard";
import { MarketplaceSearchBar } from "./MarketplaceSearchBar";

type PriceFilter = "all" | "under5" | "5to15" | "over15";

function matchesPrice(listing: Listing, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  const n = parsePriceVnd(listing.price);
  if (n == null) return true;
  if (filter === "under5") return n < 5_000_000;
  if (filter === "5to15") return n >= 5_000_000 && n <= 15_000_000;
  if (filter === "over15") return n > 15_000_000;
  return true;
}

const filterSelectCls =
  "px-3 py-2 bg-white border border-[#F3E2C8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";

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
  const [activeGender, setActiveGender] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [escrowOnly, setEscrowOnly] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [q, setQ] = useState(initialQ);
  const [province, setProvince] = useState(initialProvince);

  const filtered = useMemo(() => {
    let rows = listings.filter((l) => {
      if (activeSpecies !== "all" && l.species !== activeSpecies) return false;
      if (activeGender !== "all" && l.gender !== activeGender) return false;
      if (province) {
        if (!l.location.toLowerCase().includes(province.toLowerCase())) {
          return false;
        }
      }
      if (!matchesPrice(l, priceFilter)) return false;
      if (escrowOnly && !l.escrowEnabled) return false;
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
  }, [
    listings,
    activeSpecies,
    activeGender,
    priceFilter,
    escrowOnly,
    sortBy,
    q,
    province,
  ]);

  return (
    <div className={hideDisclaimer ? undefined : "min-h-screen bg-[#FDFBF7]"}>
      <div className={hideDisclaimer ? undefined : "max-w-[1200px] mx-auto px-5 lg:px-8 py-6"}>
        {!hideDisclaimer ? (
          <div className="mb-5">
            <DisclaimerBanner lang={lang} />
          </div>
        ) : null}

        <div className="mb-5 w-full">
          <MarketplaceSearchBar
            lang={lang}
            variant="feed"
            controlled
            q={q}
            species={activeSpecies}
            province={province}
            onQChange={setQ}
            onSpeciesChange={setActiveSpecies}
            onProvinceChange={setProvince}
          />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <p className="text-sm text-[#6E5A51] shrink-0">
            {t(lang, "feed.showingPrefix")}{" "}
            <span className="font-semibold text-[#2B1E19]">
              {filtered.length}
            </span>{" "}
            {t(lang, "feed.showingSuffix")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeGender}
              onChange={(e) => setActiveGender(e.target.value)}
              className={filterSelectCls}
              aria-label={t(lang, "feed.gender")}
            >
              <option value="all">
                {t(lang, "feed.gender")}: {t(lang, "feed.all")}
              </option>
              <option value="male">
                {t(lang, "feed.gender")}: {t(lang, "feed.male")}
              </option>
              <option value="female">
                {t(lang, "feed.gender")}: {t(lang, "feed.female")}
              </option>
            </select>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              className={filterSelectCls}
              aria-label={t(lang, "feed.price")}
            >
              <option value="all">{t(lang, "feed.price.all")}</option>
              <option value="under5">{t(lang, "feed.price.under5")}</option>
              <option value="5to15">{t(lang, "feed.price.5to15")}</option>
              <option value="over15">{t(lang, "feed.price.over15")}</option>
            </select>
            <select
              value={escrowOnly ? "escrow" : "all"}
              onChange={(e) => setEscrowOnly(e.target.value === "escrow")}
              className={filterSelectCls}
              aria-label={t(lang, "feed.perks")}
            >
              <option value="all">
                {t(lang, "feed.perks")}: {t(lang, "feed.all")}
              </option>
              <option value="escrow">🛡️ {t(lang, "feed.escrow")}</option>
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

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 feed-results-enter">
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} lang={lang} showFavorite />
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
