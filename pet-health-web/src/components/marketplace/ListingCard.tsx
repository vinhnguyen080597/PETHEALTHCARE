import Link from "next/link";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { formatPriceVnd } from "@/lib/formatPrice";
import { EscrowBadge, VerifiedBadge } from "./Badges";

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

  return (
    <Link
      href={`/app/pet-feed/posts/${listing.id}`}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
    >
      <div className="relative overflow-hidden h-48 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.mediaUrl}
          alt={listing.breed || title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {listing.species === "cat"
            ? "🐱"
            : listing.species === "dog"
              ? "🐶"
              : "🐾"}{" "}
          {speciesLabel}
        </span>
        {listing.escrowEnabled ? (
          <span className="absolute top-3 right-3">
            <EscrowBadge lang={lang} size="xs" />
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">
          {title}
        </h3>
        {price ? (
          <p className="text-[#1E6FE8] font-bold text-base mb-2">{price}</p>
        ) : null}
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M5.5 1a3 3 0 0 1 3 3C8.5 7 5.5 10 5.5 10S2.5 7 2.5 4a3 3 0 0 1 3-3Z" />
            <circle cx="5.5" cy="4" r=".8" />
          </svg>
          {listing.location} · {listing.ageMonths}
          {t(lang, "common.mo")} · {genderLabel(lang, listing.gender)}
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.breeder.avatar}
            alt={listing.breeder.name}
            className="w-5 h-5 rounded-full object-cover"
          />
          <span className="text-xs text-slate-500 truncate max-w-[100px]">
            {listing.breeder.name}
          </span>
          {listing.breeder.verified && <VerifiedBadge size="xs" />}
        </div>
      </div>
    </Link>
  );
}
