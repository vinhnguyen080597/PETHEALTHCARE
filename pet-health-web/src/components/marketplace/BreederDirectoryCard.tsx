"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BreederProfile, Lang } from "@/lib/types";
import {
  breederCardSpecialtyLabel,
  getBreederCardMetrics,
} from "@/lib/breederCardMetrics";
import { breederActivityCue } from "@/lib/breederActivityCue";
import { DEFAULT_BREEDER_COVER_PATH } from "@/lib/breederProfileImages";
import { formatPriceVnd, parsePriceVnd } from "@/lib/formatPrice";
import { listingSpeciesEmoji } from "@/lib/listingFormOptions";
import type { BreederPetThumb } from "@/lib/marketplaceFeedSections";
import { t } from "@/i18n";
import {
  startChatAndOpenUi,
  startChatMessageKey,
} from "@/lib/startFarmChat";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { canShowBreederMessageAction } from "@/lib/listingOwnerActions";

const FALLBACK_COVER = DEFAULT_BREEDER_COVER_PATH;

function shortPriceLabel(price: string): string {
  const n = parsePriceVnd(price);
  if (n == null || n <= 0) return "";
  if (n >= 1_000_000) {
    const mil = n / 1_000_000;
    const text =
      Number.isInteger(mil) ? String(mil) : mil.toFixed(1).replace(/\.0$/, "");
    return `${text}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return formatPriceVnd(n) || "";
}

export function BreederDirectoryCard({
  breeder,
  lang,
  petThumbs = [],
  featured = false,
}: {
  breeder: BreederProfile;
  lang: Lang;
  petThumbs?: BreederPetThumb[];
  featured?: boolean;
}) {
  const router = useRouter();
  const dock = useOptionalChatDock();
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState("");
  const cover = breeder.coverUrl || FALLBACK_COVER;
  const card = getBreederCardMetrics(breeder);
  const activity = breederActivityCue(breeder);
  const href = `/app/breeders/${breeder.id}`;
  const showMessageButton = canShowBreederMessageAction(
    dock?.currentUserId,
    breeder.userId,
  );

  const startMessage = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (messageBusy) return;
    setMessageBusy(true);
    setMessageError("");
    try {
      const result = await startChatAndOpenUi({
        breederId: breeder.id,
        farmName: breeder.name,
        openChat: dock?.openChat,
        replaceChat: dock?.replaceChat,
        abortChat: dock?.abortChat,
        navigate: (next) => router.push(next),
      });
      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(href)}`;
          return;
        }
        setMessageError(t(lang, startChatMessageKey(result.status, result.code)));
        return;
      }
    } catch {
      setMessageError(t(lang, "messages.startChatFailed"));
    } finally {
      setMessageBusy(false);
    }
  };

  return (
    <article
      className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${
        featured
          ? "border-amber-300 ring-1 ring-amber-200/70"
          : "border-[#F3E2C8]"
      }`}
    >
      <div className="relative h-32 bg-amber-50/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E19]/35 via-transparent to-transparent" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="absolute -bottom-7 left-4 w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
        />
        {activity.kind !== "none" ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#F3E2C8] px-2.5 py-1 text-[10px] font-semibold text-[#2B1E19] shadow-sm">
            {activity.kind === "fast_response" ? (
              <>
                <span className="text-amber-500">⚡</span>
                {t(lang, "breeders.card.fastResponse")}
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                {t(lang, "breeders.card.activeKennel")}
              </>
            )}
          </span>
        ) : null}
      </div>

      <div className="pt-9 px-4 pb-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-lg font-bold text-[#050505] leading-snug truncate tracking-tight [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif]">
            {breeder.name}
          </h3>
          {activity.kind === "active_kennel" || activity.kind === "fast_response" ? (
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title={t(lang, "breeders.card.activeKennel")} />
          ) : null}
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate">
          {breeder.location
            ? `📍 ${breeder.location}`
            : lang === "VI"
              ? "📍 Việt Nam"
              : "📍 Vietnam"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F8EEDD] text-[#6E5A51] text-[11px] font-medium border border-[#F3E2C8] line-clamp-1 max-w-full">
            {breederCardSpecialtyLabel(breeder, lang)}
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2B1E19]/75">
            <span>
              {card.rating != null && card.reviewCount > 0 ? (
                <>
                  ⭐ {card.rating.toFixed(1)}/5{" "}
                  <span className="text-[#6E5A51]">
                    ({card.reviewCount} {t(lang, "breeders.card.reviews")})
                  </span>
                </>
              ) : (
                <>⭐ {t(lang, "farm.trust.ratingEmpty")}</>
              )}
            </span>
            {card.showSold ? (
              <span>
                🐾 {card.petsRehomed} {t(lang, "breeders.card.sold")}
              </span>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-[#6E5A51] mb-1">
              <span>🛡️ {t(lang, "breeders.card.trustIndex")}</span>
              <span className="font-semibold text-[#B45309]">
                {card.trustScore}/100
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F3E2C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D97706] transition-all"
                style={{ width: `${card.trustScore}%` }}
              />
            </div>
          </div>
        </div>

        {petThumbs.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] font-medium text-[#6E5A51] mb-2">
              {t(lang, "breeders.card.petsPreviewCount").replaceAll(
                "{{n}}",
                String(petThumbs.length),
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {petThumbs.map((pet) => {
                const price = shortPriceLabel(pet.price);
                const emoji = listingSpeciesEmoji(pet.species);
                return (
                  <Link
                    key={pet.listingId}
                    href={`/app/pet-feed/posts/${pet.listingId}`}
                    className="group/pet flex flex-col items-center gap-1 w-[4.25rem]"
                    title={pet.title}
                  >
                    <span className="relative h-11 w-11 rounded-full border-2 border-white overflow-hidden shadow-sm ring-1 ring-[#F3E2C8] group-hover/pet:scale-105 transition-transform">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pet.mediaUrl}
                        alt={pet.title}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    {price ? (
                      <span className="text-[10px] font-semibold text-[#9A3412] truncate max-w-full">
                        {emoji} {price}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          {showMessageButton ? (
            <button
              type="button"
              onClick={startMessage}
              disabled={messageBusy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#F3E2C8] bg-white py-2.5 text-sm font-semibold text-[#2B1E19] hover:bg-[#FDFBF7] transition-colors disabled:opacity-60"
            >
              💬 {t(lang, "breeders.card.message")}
            </button>
          ) : null}
          <Link
            href={href}
            className={`${showMessageButton ? "flex-1" : "w-full"} inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60`}
          >
            🏪 {t(lang, "breeders.card.cta")}
          </Link>
        </div>
        {showMessageButton && messageError ? (
          <p className="mt-2 text-[11px] text-red-600">{messageError}</p>
        ) : null}
      </div>
    </article>
  );
}
