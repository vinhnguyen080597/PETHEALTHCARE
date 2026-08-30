"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { formatPriceVnd } from "@/lib/formatPrice";
import { farmPetAvailability } from "@/lib/farmPets";
import {
  isListingSpecies,
  listingSpeciesEmoji,
} from "@/lib/listingFormOptions";
import {
  formatListingCardPostedDate,
  listingBreederFooterMetrics,
  listingHotBadges,
  listingPreviewImages,
} from "@/lib/marketplaceSocialProof";
import { startChatAndOpenUi } from "@/lib/startFarmChat";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";

function fill(template: string, n: number | string): string {
  return template.replaceAll("{{n}}", String(n));
}

export function ListingCard({
  listing,
  lang,
  showFavorite = false,
  interactive = true,
  compact = false,
  showEscrowUi = false,
  onFavoriteChange,
}: {
  listing: Listing;
  lang: Lang;
  showFavorite?: boolean;
  /** When false, render static card (review preview) without links/favorite. */
  interactive?: boolean;
  /** Narrower rail cards (horizontal marketplace sections). */
  compact?: boolean;
  /** Escrow/deposit marketing — only when marketplace_escrow is on. */
  showEscrowUi?: boolean;
  /** Lift favorite state so rails + grid stay in sync for the same post. */
  onFavoriteChange?: (next: {
    listingId: string;
    saved: boolean;
    favoriteCount: number;
  }) => void;
}) {
  const router = useRouter();
  const dock = useOptionalChatDock();
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
  const locationLabel = listing.location?.trim() ?? "";
  const breederFooter = listingBreederFooterMetrics(listing);
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
  const postedDateLabel = formatListingCardPostedDate(listing.createdAt, lang);
  const mediaHeight = compact ? "h-40" : "h-72";
  const holdLabel = showEscrowUi
    ? t(lang, "listing.status.deposit_hold")
    : t(lang, "listing.status.reserved");

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
      const result = await startChatAndOpenUi({
        listingId: listing.id,
        farmName: listing.breeder.name,
        listingTitle: title,
        openChat: dock?.openChat,
        replaceChat: dock?.replaceChat,
        abortChat: dock?.abortChat,
        navigate: (next) => router.push(next),
      });
      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(detailHref)}`;
          return;
        }
        router.push(detailHref);
      }
    } catch {
      router.push(detailHref);
    } finally {
      setChatBusy(false);
    }
  };

  const activeSrc = previewImages[mediaIndex] || listing.mediaUrl;

  const infoBlock: ReactNode = (
    <>
      <h3 className="font-semibold text-[#2B1E19] text-sm leading-snug line-clamp-2">
        {title}
      </h3>

      {locationLabel || price ? (
        <div className="mt-2 flex items-center gap-2">
          {locationLabel ? (
            <span className="min-w-0 flex-1 truncate text-xs text-[#2B1E19]/70">
              📍 {locationLabel}
            </span>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {price ? (
            <span className="shrink-0 text-sm font-bold text-[#D97706]">
              {price}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2 border-t border-[#F3E2C8]/80 pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.breeder.avatar}
          alt={listing.breeder.name}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {listing.breeder.verified ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              title={t(lang, "feed.card.onlineTrust")}
            />
          ) : null}
          <span className="truncate text-xs font-medium text-[#2B1E19]">
            {listing.breeder.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {breederFooter.ratingText ? (
            <span className="whitespace-nowrap text-[11px] font-medium text-[#2B1E19]/55">
              ⭐ {breederFooter.ratingText}
            </span>
          ) : null}
          <span className="whitespace-nowrap text-[11px] font-medium text-[#2B1E19]/55">
            🛡️ {breederFooter.trustScore}/100
          </span>
        </div>
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
            return null;
          })}
          {isHold ? (
            <span className="bg-amber-500/95 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              {holdLabel}
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
          {postedDateLabel ? (
            <span className="inline-flex items-center gap-1 bg-slate-700/90 text-slate-50 text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm w-fit">
              <span aria-hidden className="opacity-90">
                📅
              </span>
              {postedDateLabel}
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
