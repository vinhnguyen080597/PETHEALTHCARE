"use client";

import { useMemo, useState } from "react";
import type { Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { parsePriceVnd } from "@/lib/formatPrice";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { ListingCard } from "./ListingCard";

type PriceFilter = "all" | "under5" | "5to15" | "over15";
type VaccineFilter = "all" | "vaccinated" | "unknown";

function matchesPrice(listing: Listing, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  const n = parsePriceVnd(listing.price);
  if (n == null) return true;
  if (filter === "under5") return n < 5_000_000;
  if (filter === "5to15") return n >= 5_000_000 && n <= 15_000_000;
  if (filter === "over15") return n > 15_000_000;
  return true;
}

function isVaccinatedStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  if (!s || s === "—" || s === "-" || s === "unknown" || s === "chưa rõ") return false;
  if (
    s.includes("chưa") ||
    s.includes("not") ||
    s.includes("none") ||
    s.includes("unvacc")
  ) {
    return false;
  }
  return (
    s.includes("đã") ||
    s.includes("tiêm") ||
    s.includes("vaccin") ||
    s.includes("fvrcp") ||
    s.includes("dhppl") ||
    /\d/.test(s)
  );
}

export function FeedView({
  lang,
  listings,
  initialSpecies = "all",
  initialQ = "",
  initialProvince = "",
}: {
  lang: Lang;
  listings: Listing[];
  breeders?: unknown;
  initialSpecies?: string;
  initialQ?: string;
  initialProvince?: string;
}) {
  const [activeSpecies, setActiveSpecies] = useState(initialSpecies || "all");
  const [activeGender, setActiveGender] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [vaccineFilter, setVaccineFilter] = useState<VaccineFilter>("all");
  const [sortBy, setSortBy] = useState("date");
  const [q, setQ] = useState(initialQ);

  const filtered = useMemo(() => {
    let rows = listings.filter((l) => {
      if (activeSpecies !== "all" && l.species !== activeSpecies) return false;
      if (activeGender !== "all" && l.gender !== activeGender) return false;
      if (initialProvince) {
        if (!l.location.toLowerCase().includes(initialProvince.toLowerCase())) {
          return false;
        }
      }
      if (!matchesPrice(l, priceFilter)) return false;
      if (vaccineFilter === "vaccinated" && !isVaccinatedStatus(l.vaccineStatus)) {
        return false;
      }
      if (vaccineFilter === "unknown") {
        const s = l.vaccineStatus.trim();
        if (s && isVaccinatedStatus(s)) return false;
      }
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
    } else if (sortBy === "age") {
      rows = [...rows].sort((a, b) => a.ageMonths - b.ageMonths);
    }
    return rows;
  }, [
    listings,
    activeSpecies,
    activeGender,
    priceFilter,
    vaccineFilter,
    sortBy,
    q,
    initialProvince,
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <div className="mb-5">
        <DisclaimerBanner lang={lang} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="m10.5 10.5 3 3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(lang, "feed.search")}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20"
        >
          <option value="date">{t(lang, "feed.sort.newest")}</option>
          <option value="price">{t(lang, "feed.sort.price")}</option>
          <option value="age">{t(lang, "feed.sort.age")}</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-slate-400 font-medium py-1.5 mr-1">
          {t(lang, "feed.filter")}
        </span>
        {(
          [
            ["all", "feed.all"],
            ["cat", "feed.cat"],
            ["dog", "feed.dog"],
            ["bird", "feed.bird"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSpecies(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeSpecies === key
                ? "bg-[#1E6FE8] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]"
            }`}
          >
            {t(lang, labelKey)}
          </button>
        ))}
        {(
          [
            ["all", "feed.all"],
            ["male", "feed.male"],
            ["female", "feed.female"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={`g-${key}`}
            type="button"
            onClick={() => setActiveGender(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeGender === key
                ? "bg-[#1E6FE8] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]"
            }`}
          >
            {t(lang, labelKey)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-slate-400 font-medium py-1.5 mr-1">
          {t(lang, "feed.price")}
        </span>
        {(
          [
            ["all", "feed.price.all"],
            ["under5", "feed.price.under5"],
            ["5to15", "feed.price.5to15"],
            ["over15", "feed.price.over15"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPriceFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              priceFilter === key
                ? "bg-[#1E6FE8] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]"
            }`}
          >
            {t(lang, labelKey)}
          </button>
        ))}
        <span className="text-xs text-slate-400 font-medium py-1.5 mr-1 ml-2">
          {t(lang, "feed.vaccine")}
        </span>
        {(
          [
            ["all", "feed.vaccine.all"],
            ["vaccinated", "feed.vaccine.yes"],
            ["unknown", "feed.vaccine.unknown"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setVaccineFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              vaccineFilter === key
                ? "bg-[#1E6FE8] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-[#1E6FE8] hover:text-[#1E6FE8]"
            }`}
          >
            {t(lang, labelKey)}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        {filtered.length} {t(lang, "feed.results")}
      </p>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🐾</p>
          <p className="font-semibold text-slate-700">{t(lang, "feed.empty")}</p>
        </div>
      )}
    </div>
  );
}
