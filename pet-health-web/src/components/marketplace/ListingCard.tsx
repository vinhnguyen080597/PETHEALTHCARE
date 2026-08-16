"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t, type EnKey } from "@/i18n";
import { formatPriceVnd, parsePriceVnd } from "@/lib/formatPrice";
import { VerifiedBadge } from "./Badges";
import { farmPetAvailability } from "@/lib/farmPets";
import {
  isListingSpecies,
  listingSpeciesEmoji,
} from "@/lib/listingFormOptions";
import {
  listingHotBadges,
  listingPreviewImages,
  listingTrustTags,
} from "@/lib/marketplaceSocialProof";

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

function fill(template: string, n: number | string): string {
  return template.replaceAll("{{n}}", String(n));
}

export function ListingCard({
  listing,
  lang,
  showFavorite = false,
  interactive = true,
  compact = false,
  onFavoriteChange,
}: {
  listing: Listing;
  lang: Lang;
  showFavorite?: boolean;
  /** When false, render static card (review preview) without links/favorite. */
  interactive?: boolean;
  /** Narrower rail cards (horizontal marketplace sections). */
  compact?: boolean;
  /** Lift favorite state so rails + grid stay in sync for the same post. */
  onFavoriteChange?: (next: {
    listingId: string;
    saved: boolean;
    favoriteCount: number;
  }) => void;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(Boolean(listing.saved));
  const [favCount, setFavCount] = useState(
    Math.max(0, Math.floor(Number(listing.favoriteCount) || 0)),
  );
  const [favBusy, setFavBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setSaved(Boolean(listing.saved));
    setFavCount(Math.max(0, Math.floor(Number(listing.favoriteCount) || 0)));
  }, [listing.id, listing.saved, listing.favoriteCount]);

  const title = lang === "VI" ? listing.titleVI : listing.title;
  const speciesSlug = listing.species?.trim().toLowerCase() ?? "";
  const speciesLabel = isListingSpecies(speciesSlug)
    ? t(lang, `listing.new.species.${speciesSlug}` as EnKey)
    : listing.species;
  const speciesEmoji = listingSpeciesEmoji(speciesSlug);
  const price = formatPriceVnd(listing.price) || listing.price;
  const deposit = listing.escrowEnabled ? depositLabel(listing.price, lang) : null;
  const qualityIndex = Math.max(
    0,
    Math.min(100, Math.round(listing.breeder.trustScore || 0)),
  );
  const reviewAvg = listing.breeder.reviewAverage;
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
  const isCancelled =
    listing.status === "cancelled" || Boolean(listing.metadataCancelled);
  const isSold = availability === "completed" && !isCancelled;
  const isHold = availability === "deposit_hold";
  const detailHref = `/app/pet-feed/posts/${listing.id}`;
  const previewImages = listingPreviewImages(listing, 4);
  const hotBadges = listingHotBadges({
    ...listing,
    favoriteCount: favCount,
  });
  const trustTags = listingTrustTags(listing);
  const mediaHeight = compact ? "h-40" : "h-48";

  useEffect(() => {
    if (!hovering || previewImages.length <= 1) return;
    const id = window.setInterval(() => {
      setMediaIndex((i) => (i + 1) % previewImages.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [hovering, previewImages.length]);

  const toggleFavorite = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favBusy) return;
    const next = !saved;
    const nextCount = Math.max(0, favCount + (next ? 1 : -1));
    setSaved(next);
    setFavCount(nextCount);
    onFavoriteChange?.({
      listingId: listing.id,
      saved: next,
      favoriteCount: nextCount,
    });
    setFavBusy(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (res.status === 401) {
        setSaved(!next);
        setFavCount(favCount);
        onFavoriteChange?.({
          listingId: listing.id,
          saved: !next,
          favoriteCount: favCount,
        });
        window.location.href = `/login?next=/app/pet-feed/posts/${listing.id}`;
        return;
      }
      if (!res.ok && res.status !== 204) {
        setSaved(!next);
        setFavCount(favCount);
        onFavoriteChange?.({
          listingId: listing.id,
          saved: !next,
          favoriteCount: favCount,
        });
      }
    } catch {
      setSaved(!next);
      setFavCount(favCount);
      onFavoriteChange?.({
        listingId: listing.id,
        saved: !next,
        favoriteCount: favCount,
      });
    } finally {
      setFavBusy(false);
    }
  };

  const startChat = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (chatBusy || !interactive) return;
    setChatBusy(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/conversations`, {
        method: "POST",
      });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(detailHref)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        router.push(detailHref);
        return;
      }
      const conversationId = data?.data?.id;
      router.push(
        conversationId
          ? `/app/messages?c=${encodeURIComponent(conversationId)}`
          : "/app/messages",
      );
    } catch {
      router.push(detailHref);
    } finally {
      setChatBusy(false);
    }
  };

  const activeSrc = previewImages[mediaIndex] || listing.mediaUrl;

  const infoBlock: ReactNode = (
    <>
      <h3 className="font-semibold text-[#2B1E19] text-sm leading-snug mb-2 line-clamp-2">
        {title}
      </h3>
      {price ? (
        <p className="mb-2">
          <span className="text-[#D97706] font-bold text-base">{price}</span>
          {deposit ? (
            <span className="ml-1.5 text-xs font-medium text-[#2B1E19]/45">
              {deposit}
            </span>
          ) : null}
        </p>
      ) : null}

      {trustTags.length ? (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {trustTags.map((tag) => {
            if (tag.kind === "warranty") {
              return (
                <span
                  key="warranty"
                  className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800"
                >
                  🛡️ {fill(t(lang, "feed.card.warranty"), tag.days)}
                </span>
              );
            }
            if (tag.kind === "escrow") {
              return (
                <span
                  key="escrow"
                  className="inline-flex items-center px-2 py-1 rounded-full bg-[#FEF3C7] border border-amber-300 text-[11px] font-medium text-[#92400E]"
                >
                  🔒 {t(lang, "feed.card.escrow")}
                </span>
              );
            }
            return (
              <span
                key={`vac-${tag.label}`}
                className="inline-flex items-center px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70"
              >
                💉 {tag.label}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {listing.location ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70">
              📍 {listing.location}
            </span>
          ) : null}
          {ageGender ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#FDFBF7] border border-[#F3E2C8] text-[11px] text-[#2B1E19]/70">
              {ageGender}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-[#F3E2C8]/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.breeder.avatar}
          alt={listing.breeder.name}
          className="w-6 h-6 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {listing.breeder.verified ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
                title={t(lang, "feed.card.onlineTrust")}
              />
            ) : null}
            <span className="text-xs text-[#2B1E19] font-medium truncate">
              {listing.breeder.name}
            </span>
            {listing.breeder.verified && <VerifiedBadge size="xs" />}
          </div>
        </div>
        <span className="text-[11px] text-[#2B1E19]/55 font-medium whitespace-nowrap">
          {reviewAvg != null && (listing.breeder.reviewCount || 0) > 0
            ? `⭐ ${reviewAvg.toFixed(1)}`
            : `${qualityIndex}/100`}
        </span>
      </div>
    </>
  );

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-[#F3E2C8] hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 group flex flex-col h-full">
      <div
        className={`relative overflow-hidden ${mediaHeight} bg-amber-50/40`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          setMediaIndex(0);
        }}
      >
        {interactive ? (
          <Link href={detailHref} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSrc}
              alt={listing.breed || title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        ) : (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSrc}
              alt={listing.breed || title}
              className="w-full h-full object-cover"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
        {previewImages.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 pointer-events-none">
            {previewImages.map((url, i) => (
              <span
                key={url}
                className={`h-1 rounded-full transition-all ${
                  i === mediaIndex ? "w-3 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        ) : null}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none max-w-[75%]">
          <span className="bg-white/95 backdrop-blur-sm text-[#2B1E19] text-xs font-medium px-2.5 py-1 rounded-full border border-[#F3E2C8]/80 w-fit">
            {speciesEmoji} {speciesLabel}
          </span>
          {hotBadges.map((badge) => {
            if (badge.kind === "saves") {
              return (
                <span
                  key="saves"
                  className="bg-[#EA580C]/95 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit"
                >
                  🔥 {fill(t(lang, "feed.card.saves"), badge.count)}
                </span>
              );
            }
            if (badge.kind === "new") {
              return (
                <span
                  key="new"
                  className="bg-amber-400/95 text-[#78350F] text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit"
                >
                  ✨ {t(lang, "feed.card.new")}
                </span>
              );
            }
            return (
              <span
                key="video"
                className="bg-slate-900/85 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit"
              >
                🎬 {t(lang, "feed.card.video")}
              </span>
            );
          })}
          {isHold ? (
            <span className="bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "listing.status.deposit_hold")}
            </span>
          ) : null}
          {listing.status === "pending_review" ? (
            <span className="bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "listing.status.pending_review")}
            </span>
          ) : null}
          {isSold ? (
            <span className="bg-slate-900/85 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "farm.listings.sold")}
            </span>
          ) : null}
          {isCancelled ? (
            <span className="bg-rose-700/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {t(lang, "farm.listings.cancelled")}
            </span>
          ) : null}
        </div>
      </div>

      {interactive ? (
        <div className="flex flex-col flex-1 p-4">
          <Link href={detailHref} className="block flex-1">
            {infoBlock}
          </Link>
          <div className="mt-3 flex items-center gap-2">
            {showFavorite ? (
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favBusy}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${
                  saved
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-white border-[#F3E2C8] text-[#6E5A51] hover:text-rose-500"
                }`}
                aria-label={t(lang, "detail.save")}
              >
                {saved ? "♥" : "♡"}
                <span>{favCount}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={startChat}
              disabled={chatBusy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D97706] px-3 py-2 text-xs font-semibold text-white hover:bg-[#B45309] transition-colors disabled:opacity-60"
            >
              💬 {t(lang, "feed.card.chat")}
            </button>
          </div>
        </div>
      ) : (
        <div className="block p-4">{infoBlock}</div>
      )}
    </article>
  );
}
