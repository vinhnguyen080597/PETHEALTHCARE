import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { formatPriceVnd, parsePriceVnd } from "@/lib/formatPrice";
import { VerifiedBadge } from "./Badges";

function ratingFromTrust(score: number): string {
  const clamped = Math.min(100, Math.max(0, score || 0));
  return (Math.round((clamped / 20) * 10) / 10).toFixed(1);
}

function depositLabel(price: string, lang: Lang): string | null {
  const n = parsePriceVnd(price);
  if (n == null || n <= 0) return null;
  const deposit = Math.round(n * 0.2);
  const formatted = formatPriceVnd(deposit);
  if (!formatted) return null;
  return lang === "VI" ? `(Cọc: ${formatted.replace(" VNĐ", "đ")})` : `(Deposit: ${formatted})`;
}

export function ListingCard({
  listing,
  lang,
}: {
  listing: Listing;
  lang: Lang;
}) {
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
  const rating = ratingFromTrust(listing.breeder.trustScore);
  const ageGender = [
    listing.ageMonths > 0
      ? `${listing.ageMonths} ${lang === "VI" ? "tháng" : t(lang, "common.mo")}`
      : "",
    genderLabel(lang, listing.gender),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/app/pet-feed/posts/${listing.id}`}
      className="bg-white rounded-2xl overflow-hidden border border-[#F3E2C8] hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 group block"
    >
      <div className="relative overflow-hidden h-48 bg-amber-50/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.mediaUrl}
          alt={listing.breed || title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#2B1E19] text-xs font-medium px-2.5 py-1 rounded-full border border-[#F3E2C8]/80">
          {listing.species === "cat"
            ? "🐱"
            : listing.species === "dog"
              ? "🐶"
              : "🐾"}{" "}
          {speciesLabel}
        </span>
        {listing.escrowEnabled ? (
          <span className="absolute top-3 right-3 bg-emerald-50/95 text-emerald-800 text-[10px] font-semibold px-2 py-1 rounded-full border border-emerald-200 shadow-sm">
            🛡️ {lang === "VI" ? "Cọc Bảo Chứng" : "Escrow"}
          </span>
        ) : null}
      </div>
      <div className="p-4">
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
              <svg
                width="10"
                height="10"
                viewBox="0 0 11 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M5.5 1a3 3 0 0 1 3 3C8.5 7 5.5 10 5.5 10S2.5 7 2.5 4a3 3 0 0 1 3-3Z" />
                <circle cx="5.5" cy="4" r=".8" />
              </svg>
              {listing.location}
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
            ⭐ {rating}
          </span>
        </div>
      </div>
    </Link>
  );
}
