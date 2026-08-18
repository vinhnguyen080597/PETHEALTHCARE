"use client";

import { useMemo, useState } from "react";
import type { BreederProfile, Lang, Listing } from "@/lib/types";
import {
  BREEDER_SORT_KEYS,
  BREEDER_SPECIES_FILTERS,
  DEFAULT_BREEDER_SORT,
  DEFAULT_BREEDER_SPECIES,
  filterBreedersByProvince,
  filterBreedersBySpecies,
  parseBreederSort,
  parseBreederSpecies,
  sortBreeders,
  type BreederSortKey,
  type BreederSpeciesFilter,
} from "@/lib/breederDirectorySort";
import {
  groupBreederPetThumbs,
  pickHallOfFameBreeders,
} from "@/lib/marketplaceFeedSections";
import {
  resolveProvinceSelection,
} from "@/lib/vietnamProvinceSelection";
import { VIETNAM_PROVINCES } from "@/constants/vietnamProvinces";
import { BreederDirectoryCard } from "./BreederDirectoryCard";
import { BreederHallOfFame } from "./BreederHallOfFame";
import { LiveActivityTicker } from "./LiveActivityTicker";
import { t, type EnKey } from "@/i18n";
import { breedersDirectoryHeading } from "@/lib/breedersPageChrome";

const SORT_I18N: Record<BreederSortKey, EnKey> = {
  trust: "breeders.sort.trust",
  listings: "breeders.sort.listings",
  sold: "breeders.sort.sold",
  name: "breeders.sort.name",
};

const selectCls =
  "text-sm border border-[#F3E2C8] rounded-xl px-3 py-2 bg-white text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-200 shrink-0";

export function BreederDirectoryView({
  breeders,
  lang,
  loadError = "",
  listings = [],
}: {
  breeders: BreederProfile[];
  lang: Lang;
  loadError?: string;
  /** Optional public listings used for live ticker + pet mini-gallery. */
  listings?: Listing[];
}) {
  const [species, setSpecies] = useState<BreederSpeciesFilter>(DEFAULT_BREEDER_SPECIES);
  const [sortBy, setSortBy] = useState<BreederSortKey>(DEFAULT_BREEDER_SORT);
  const [province, setProvince] = useState("");

  const hallOfFame = useMemo(
    () => pickHallOfFameBreeders(breeders, 3),
    [breeders],
  );

  const visible = useMemo(() => {
    const bySpecies = filterBreedersBySpecies(breeders, species);
    const byProvince = filterBreedersByProvince(bySpecies, province);
    return sortBreeders(byProvince, sortBy);
  }, [breeders, species, province, sortBy]);

  const thumbsByBreeder = useMemo(
    () => groupBreederPetThumbs(listings, 4),
    [listings],
  );

  const directoryHeading = breedersDirectoryHeading();

  return (
    <>
      {listings.length > 0 ? (
        <LiveActivityTicker
          lang={lang}
          listings={listings}
          labelKey="breeders.live.label"
        />
      ) : null}

      {loadError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(lang, "breeders.loadError")}: {loadError}
        </div>
      ) : null}

      <BreederHallOfFame lang={lang} entries={hallOfFame} />

      {breeders.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#F3E2C8] bg-white/80 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#9A3412] mr-1">
            🔍
          </span>
          <label htmlFor="breeder-species" className="sr-only">
            {t(lang, "breeders.speciesLabel")}
          </label>
          <select
            id="breeder-species"
            value={species}
            onChange={(e) => setSpecies(parseBreederSpecies(e.target.value))}
            className={selectCls}
            aria-label={t(lang, "breeders.speciesLabel")}
          >
            {BREEDER_SPECIES_FILTERS.map((id) => (
              <option key={id} value={id}>
                {t(lang, "breeders.speciesLabel")}{" "}
                {id === "all"
                  ? t(lang, "breeders.species.all")
                  : t(lang, `listing.new.species.${id}` as EnKey)}
              </option>
            ))}
          </select>
          <label htmlFor="breeder-province" className="sr-only">
            {t(lang, "breeders.provinceLabel")}
          </label>
          <select
            id="breeder-province"
            value={province}
            onChange={(e) =>
              setProvince(resolveProvinceSelection(e.target.value))
            }
            className={selectCls}
            aria-label={t(lang, "breeders.provinceLabel")}
          >
            <option value="">
              {t(lang, "breeders.provinceLabel")} {t(lang, "feed.province.all")}
            </option>
            {VIETNAM_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label htmlFor="breeder-sort" className="sr-only">
            {t(lang, "breeders.sortLabel")}
          </label>
          <select
            id="breeder-sort"
            value={sortBy}
            onChange={(e) => setSortBy(parseBreederSort(e.target.value))}
            className={selectCls}
            aria-label={t(lang, "breeders.sortLabel")}
          >
            {BREEDER_SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(lang, "breeders.sortLabel")} {t(lang, SORT_I18N[key])}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-[#2B1E19]">
          {t(lang, directoryHeading.titleKey)}
        </h2>
        <p className="text-sm text-[#6E5A51] mt-1">
          {t(lang, directoryHeading.subtitleKey)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((b) => (
          <BreederDirectoryCard
            key={b.id}
            breeder={b}
            lang={lang}
            petThumbs={thumbsByBreeder[b.id] || []}
          />
        ))}
      </div>

      {breeders.length === 0 && !loadError ? (
        <p className="text-center text-[#6E5A51] py-16">
          {t(lang, "breeders.empty")}
        </p>
      ) : null}

      {breeders.length > 0 && visible.length === 0 ? (
        <p className="text-center text-[#6E5A51] py-16">
          {t(lang, "breeders.emptySpecies")}
        </p>
      ) : null}
    </>
  );
}
