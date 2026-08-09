"use client";

import { useState } from "react";
import type { BreederProfile, Lang } from "@/lib/types";
import {
  BREEDER_SORT_KEYS,
  DEFAULT_BREEDER_SORT,
  parseBreederSort,
  sortBreeders,
  type BreederSortKey,
} from "@/lib/breederDirectorySort";
import { BreederDirectoryCard } from "./BreederDirectoryCard";
import { t, type EnKey } from "@/i18n";

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
}: {
  breeders: BreederProfile[];
  lang: Lang;
  loadError?: string;
}) {
  const [sortBy, setSortBy] = useState<BreederSortKey>(DEFAULT_BREEDER_SORT);
  const sorted = sortBreeders(breeders, sortBy);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] tracking-tight">
          {t(lang, "breeders.title")}
        </h1>
        {breeders.length > 0 ? (
          <div className="flex items-center">
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
      </div>
      <p className="text-sm text-[#6E5A51] mb-7">{t(lang, "breeders.subtitle")}</p>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(lang, "breeders.loadError")}: {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sorted.map((b) => (
          <BreederDirectoryCard key={b.id} breeder={b} lang={lang} />
        ))}
      </div>

      {breeders.length === 0 && !loadError ? (
        <p className="text-center text-[#6E5A51] py-16">
          {t(lang, "breeders.empty")}
        </p>
      ) : null}
    </>
  );
}
