"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BreederProfile, Lang, Listing } from "@/lib/types";
import { t } from "@/i18n";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { ListingCard } from "./ListingCard";
import { TrustLevelChip, VerifiedBadge } from "./Badges";
import { getTrustLevel } from "@/lib/types";

export function FeedView({
  lang,
  listings,
  breeders,
  initialSpecies = "all",
  initialQ = "",
}: {
  lang: Lang;
  listings: Listing[];
  breeders: BreederProfile[];
  initialSpecies?: string;
  initialQ?: string;
}) {
  const [activeTab, setActiveTab] = useState<"pets" | "news" | "breeders">(
    "pets",
  );
  const [activeSpecies, setActiveSpecies] = useState(initialSpecies || "all");
  const [activeGender, setActiveGender] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [q, setQ] = useState(initialQ);

  const filtered = useMemo(() => {
    let rows = listings.filter((l) => {
      if (activeSpecies !== "all" && l.species !== activeSpecies) return false;
      if (activeGender !== "all" && l.gender !== activeGender) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${l.title} ${l.breed} ${l.location} ${l.breeder.name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sortBy === "price") {
      rows = [...rows].sort((a, b) => a.price.localeCompare(b.price));
    } else if (sortBy === "age") {
      rows = [...rows].sort((a, b) => a.ageMonths - b.ageMonths);
    }
    return rows;
  }, [listings, activeSpecies, activeGender, sortBy, q]);

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
      <div className="flex flex-wrap gap-2 mb-5">
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
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
        {(
          [
            ["pets", "feed.tab.pets"],
            ["news", "feed.tab.news"],
            ["breeders", "feed.tab.breeders"],
          ] as const
        ).map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-[#1E6FE8] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t(lang, labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "pets" && (
        <>
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
              <p className="font-semibold text-slate-700">
                {t(lang, "feed.empty")}
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "news" && (
        <div className="space-y-4">
          {[
            {
              title:
                lang === "VI"
                  ? "Cách chọn thức ăn cho mèo con đúng cách"
                  : "How to choose the right food for your kitten",
              date: "24/07/2026",
              img: "https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=400&h=200&fit=crop&auto=format",
            },
            {
              title:
                lang === "VI"
                  ? "Tải app Pet Health Care để theo dõi sức khỏe thú cưng"
                  : "Download Pet Health Care to track your pet's health",
              date: "10/07/2026",
              img: "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=200&fit=crop&auto=format",
            },
          ].map((n) => (
            <div
              key={n.title}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden flex hover:shadow-sm transition-all"
            >
              <div className="w-32 h-24 flex-shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.img} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex flex-col justify-center">
                <p className="font-semibold text-slate-900 text-sm mb-1">
                  {n.title}
                </p>
                <p className="text-xs text-slate-400">{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "breeders" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {breeders.map((b) => {
            const trust = getTrustLevel(b.trustScore, b.verified);
            return (
              <Link
                key={b.id}
                href={`/app/breeders/${b.id}`}
                className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-sm hover:border-blue-100 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.avatar}
                    alt={b.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {b.name}
                      </h3>
                      {b.verified && <VerifiedBadge size="xs" />}
                    </div>
                    <p className="text-xs text-slate-400">{b.location}</p>
                    <div className="mt-1">
                      <TrustLevelChip level={trust.level} label={trust.label} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {b.activeListings} {t(lang, "feed.activeListings")}
                  </span>
                  <span className="text-[#1E6FE8] font-medium">
                    {b.trustScore}/100
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
