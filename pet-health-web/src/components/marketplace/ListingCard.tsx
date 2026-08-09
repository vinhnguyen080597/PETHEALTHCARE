"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { formatPriceVnd, parsePriceVnd } from "@/lib/formatPrice";
import { VerifiedBadge } from "./Badges";
import { farmPetAvailability } from "@/lib/farmPets";

function depositLabel(price: string, lang: Lang): string | null {
  const n = parsePriceVnd(price);
  if (n == null || n <= 0) return null;
  const deposit = Math.round(n * 0.2);
  if (lang === "VI") {
    if (deposit >= 1_000_000) {
      const mil = deposit / 1_000_000;
      const text =
        Number.isInteger(mil) ? String(mil) : mil.toFixed(1).replace(/\.0$/, "");
      return `(Cọc Escrow: ${text}tr)`;
    }
    if (deposit >= 1000) {
      return `(Cọc Escrow: ${Math.round(deposit / 1000)}k)`;
    }
    return `(Cọc Escrow: ${deposit}đ)`;
  }
  const formatted = formatPriceVnd(deposit);
  return formatted ? `(Escrow: ${formatted})` : null;
}

export function ListingCard({
  listing,
  lang,
  showFavorite = false,
  interactive = true,
}: {
  listing: Listing;
  lang: Lang;
  showFavorite?: boolean;
  /** When false, render static card (review preview) without links/favorite. */
  interactive?: boolean;
}) {
  const [saved, setSaved] = useState(Boolean(listing.saved));
  const [favBusy, setFavBusy] = useState(false);
  const title = lang === "VI" ? listing.titleVI : listing.title;
  const speciesLabel =
    listing.species === "cat"
      ? lang === "VI"
        ? "Mèo"
        : "Cat"
      : listing.species === "dog"
        ? lang === "VI"
          ? "Chó"
          : "Dog"
        : listing.species;
  const price = formatPriceVnd(listing.price) || listing.price;
  const deposit = listing.escrowEnabled ? depositLabel(listing.price, lang) : null;
  const vaccine = listing.vaccineStatus?.trim();
  const qualityIndex = Math.max(
    0,
    Math.min(100, Math.round(listing.breeder.trustScore || 0)),
  );
  const genderEmoji =
    listing.gender === "male" ? "♂️" : listing.gender === "female" ? "♀️" : "";
  const ageGender = [
    genderEmoji,
    listing.ageMonths > 0
      ? `${listing.ageMonths} ${lang === "VI" ? "tháng" : t(lang, "common.mo")}`
      : "",
    !genderEmoji ? genderLabel(lang, listing.gender) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const availability = farmPetAvailability(listing);
  const isSold = availability === "completed";
  const isHold = availability === "deposit_hold";
  const detailHref = `/app/pet-feed/posts/${listing.id}`;

  const toggleFavorite = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favBusy) return;
    const next = !saved;
    setSaved(next);
    setFavBusy(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (res.status === 401) {
        setSaved(!next);
        window.location.href = `/login?next=/app/pet-feed/posts/${listing.id}`;
        return;
      }
      if (!res.ok && res.status !== 204) {
        setSaved(!next);
      }
    } catch {
      setSaved(!next);
    } finally {
      setFavBusy(false);
    }
  };

  const media = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={listing.mediaUrl}
        alt={listing.breed || title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </>
  );

  const body = (
    <>
      <h3 className="font-semibold text-[#2B1E19] text-sm leading-snug mb-2 line-clamp-2">
        {title}
      </h3>
      {price ? (
        <p className="mb-3">
          <span className="text-[#D97706] font-bold text-base">{price}</span>
          {deposit ? (
            <span className="ml-1.5 text-xs font-medium text-[#2B1E19]/45">
              {deposit}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {listing.location ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70">
            📍 {listing.location}
          </span>
        ) : null}
        {vaccine && vaccine !== "—" ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70">
            💉 {vaccine}
          </span>
        ) : null}
        {ageGender ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70">
            {ageGender}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#F3E2C8]/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.breeder.avatar}
          alt={listing.breeder.name}
          className="w-6 h-6 rounded-full object-cover"
        />
        <span className="text-xs text-[#2B1E19] font-medium truncate max-w-[90px]">
          {listing.breeder.name}
        </span>
        {listing.breeder.verified && <VerifiedBadge size="xs" />}
        <span className="ml-auto text-[11px] text-[#2B1E19]/55 font-medium whitespace-nowrap">
          {qualityIndex}/100
        </span>
      </div>
    </>
  );

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-[#F3E2C8] hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="relative overflow-hidden h-48 bg-amber-50/40">
        {interactive ? (
          <Link href={detailHref} className="absolute inset-0">
            {media}
          </Link>
        ) : (
          <div className="absolute inset-0">{media}</div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          <span className="bg-white/95 backdrop-blur-sm text-[#2B1E19] text-xs font-medium px-2.5 py-1 rounded-full border border-[#F3E2C8]/80 w-fit">
            {listing.species === "cat"
              ? "🐱"
              : listing.species === "dog"
                ? "🐶"
                : "🐾"}{" "}
            {speciesLabel}
          </span>
          {listing.escrowEnabled && !isSold ? (
            <span className="bg-[#FEF3C7]/95 text-[#92400E] text-[10px] font-semibold px-2 py-1 rounded-full border border-amber-300 shadow-sm w-fit">
              🛡️ {lang === "VI" ? "Cọc Escrow" : "Escrow"}
            </span>
          ) : null}
          {isHold ? (
            <span className="bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "listing.status.deposit_hold")}
            </span>
          ) : null}
          {isSold ? (
            <span className="bg-slate-900/85 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "farm.listings.sold")}
            </span>
          ) : null}
        </div>
        {interactive && showFavorite ? (
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favBusy}
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              saved
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-white/95 border-[#F3E2C8] text-[#6E5A51] hover:text-rose-500"
            }`}
            aria-label={t(lang, "detail.save")}
          >
            {saved ? "♥" : "♡"}
          </button>
        ) : null}
      </div>

      {interactive ? (
        <Link href={detailHref} className="block p-4">
          {body}
        </Link>
      ) : (
        <div className="block p-4">{body}</div>
      )}
    </article>
  );
}
