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
import type { BreederPetThumb } from "@/lib/marketplaceFeedSections";
import { t, type EnKey } from "@/i18n";
import {
  startChatAndOpenUi,
  startChatMessageKey,
} from "@/lib/startFarmChat";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { FarmReviewModal } from "@/components/marketplace/FarmReviewModal";
import {
  BREEDER_CARD_EDIT_PROFILE_HREF,
  canShowBreederEditProfileAction,
  canShowBreederMessageAction,
  canShowBreederReviewFarmAction,
  canShowBreederVisitFarmAction,
} from "@/lib/listingOwnerActions";
import {
  BREEDER_CARD_ACTIONS_CLASS,
  BREEDER_CARD_ACTION_BTN_CLASS,
  BREEDER_CARD_PETS_PREVIEW_CLASS,
  breederCardHasPetPreview,
  breederCardPetsPreviewTitleKey,
  breederCardRatingText,
  breederCardSocialLinks,
  breederCardVisitCtaClass,
  type BreederCardSocialId,
} from "@/lib/breederDirectoryCard";

const FALLBACK_COVER = DEFAULT_BREEDER_COVER_PATH;

function SocialGlyph({ id }: { id: BreederCardSocialId }) {
  if (id === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.492 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073"
        />
      </svg>
    );
  }
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#E4405F"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.411 2.175 8.791 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
        />
      </svg>
    );
  }
  if (id === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#111827"
          d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.89 2.89 2.896 2.896 0 0 1-2.89-2.89 2.896 2.896 0 0 1 2.89-2.89c.28 0 .552.04.81.114v-3.5a6.374 6.374 0 0 0-.81-.054 6.336 6.336 0 0 0-6.335 6.336 6.336 6.336 0 0 0 6.335 6.334c3.493 0 6.331-2.833 6.331-6.334V8.37a8.2 8.2 0 0 0 4.774 1.526V6.451a4.82 4.82 0 0 1-1-.765z"
        />
      </svg>
    );
  }
  if (id === "twitter") {
    return <span className="text-[13px] font-extrabold leading-none text-slate-900">𝕏</span>;
  }
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-[#0068FF] text-[9px] font-extrabold leading-none text-white">
      Z
    </span>
  );
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [hasReviewedFarm, setHasReviewedFarm] = useState(false);
  const cover = breeder.coverUrl || FALLBACK_COVER;
  const card = getBreederCardMetrics(breeder);
  const activity = breederActivityCue(breeder);
  const href = `/app/breeders/${breeder.id}`;
  const socialLinks = breederCardSocialLinks(breeder.contact);
  const showMessageButton = canShowBreederMessageAction(
    dock?.currentUserId,
    breeder.userId,
  );
  const showEditProfileButton = canShowBreederEditProfileAction(
    dock?.currentUserId,
    breeder.userId,
  );
  const showVisitButton = canShowBreederVisitFarmAction(
    dock?.currentUserId,
    breeder.userId,
  );
  const showReviewButton = canShowBreederReviewFarmAction(
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

  const promptFarmReview = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showVisitButton) return;
    if (!dock?.currentUserId) {
      window.location.href = `/login?next=${encodeURIComponent("/app/breeders")}`;
      return;
    }
    setReviewError("");
    setReviewNotice("");
    setHasReviewedFarm(false);
    setReviewOpen(true);
    try {
      const res = await fetch(
        `/api/breeders/${encodeURIComponent(breeder.id)}/reviews/me`,
      );
      const json = await res.json().catch(() => ({}));
      setHasReviewedFarm(Boolean(json?.data?.hasReviewed));
    } catch {
      setHasReviewedFarm(false);
    }
  };

  const submitFarmReview = async (payload: {
    rating: number;
    body: string;
    photoUrls: string[];
  }) => {
    setReviewBusy(true);
    setReviewError("");
    try {
      const res = await fetch(
        `/api/breeders/${encodeURIComponent(breeder.id)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t(lang, "farm.review.failed"));
      }
      setReviewOpen(false);
      setReviewNotice(t(lang, "farm.review.pendingSubmitted"));
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : t(lang, "farm.review.failed"),
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const ratingText = breederCardRatingText(card.rating, card.reviewCount);
  const locationLabel = breeder.location
    ? `📍 ${breeder.location}`
    : lang === "VI"
      ? "📍 Việt Nam"
      : "📍 Vietnam";

  const socialLabel = (id: BreederCardSocialId) =>
    t(lang, `farm.facility.${id === "twitter" ? "twitter" : id}` as EnKey);

  return (
    <article
      className={`group bg-white rounded-2xl border overflow-hidden hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex h-full flex-col ${
        featured
          ? "border-amber-300 ring-1 ring-amber-200/70"
          : "border-[#F3E2C8]"
      }`}
    >
      <div className="relative h-32 bg-amber-50/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="w-full h-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="absolute -bottom-7 left-4 w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
        />
        <span className="absolute top-3 left-3 max-w-[52%] truncate rounded-full border border-[#F3E2C8] bg-[#F8EEDD]/95 px-2.5 py-1 text-[11px] font-medium text-[#6E5A51]">
          {breederCardSpecialtyLabel(breeder, lang)}
        </span>
      </div>

      <div className="pt-9 px-4 pb-4 flex flex-col flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="truncate text-lg font-bold leading-snug tracking-tight text-[#050505] [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif]">
              {breeder.name}
            </h3>
            {activity.kind === "active_kennel" || activity.kind === "fast_response" ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                title={t(lang, "breeders.card.activeKennel")}
              />
            ) : null}
          </div>
          {ratingText ? (
            <span className="shrink-0 text-[11px] font-medium text-slate-600">
              ⭐ {ratingText}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm text-gray-500">
            {locationLabel}
          </p>
          <div className="ml-auto flex max-w-[58%] shrink-0 flex-wrap items-center justify-end gap-2">
            {socialLinks.map((link) => {
              const glyph = <SocialGlyph id={link.id} />;
              const label = socialLabel(link.id);
              if (!link.href) {
                return (
                  <span key={link.id} title={label} className="inline-flex h-5 w-5 items-center justify-center">
                    {glyph}
                  </span>
                );
              }
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  aria-label={label}
                  className="inline-flex h-5 w-5 items-center justify-center hover:opacity-80"
                >
                  {glyph}
                </a>
              );
            })}
          </div>
        </div>

        <div className={BREEDER_CARD_PETS_PREVIEW_CLASS}>
          <p
            className={`text-[11px] font-medium text-[#6E5A51] ${
              breederCardHasPetPreview(petThumbs.length) ? "mb-2" : "mb-0"
            }`}
          >
            {t(lang, breederCardPetsPreviewTitleKey(petThumbs.length)).replaceAll(
              "{{n}}",
              String(petThumbs.length),
            )}
          </p>
          {breederCardHasPetPreview(petThumbs.length) ? (
            <div className="flex flex-wrap gap-1">
              {petThumbs.map((pet) => (
                <Link
                  key={pet.listingId}
                  href={`/app/pet-feed/posts/${pet.listingId}`}
                  className="group/pet"
                  title={pet.title}
                >
                  <span className="relative inline-block h-11 w-11 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-[#F3E2C8] transition-transform group-hover/pet:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pet.mediaUrl}
                      alt={pet.title}
                      className="h-full w-full object-cover"
                    />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className={BREEDER_CARD_ACTIONS_CLASS}>
          {showMessageButton ? (
            <button
              type="button"
              onClick={startMessage}
              disabled={messageBusy}
              className={`${BREEDER_CARD_ACTION_BTN_CLASS} border border-[#F3E2C8] bg-white text-[#2B1E19] hover:bg-[#FDFBF7] transition-colors disabled:opacity-60`}
            >
              💬 {t(lang, "breeders.card.message")}
            </button>
          ) : showEditProfileButton ? (
            <Link
              href={BREEDER_CARD_EDIT_PROFILE_HREF}
              className={`${BREEDER_CARD_ACTION_BTN_CLASS} border border-[#F3E2C8] bg-white text-[#2B1E19] hover:bg-[#FDFBF7] transition-colors`}
            >
              ✏️ {t(lang, "farm.owner.editProfile")}
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {showVisitButton ? (
            <Link
              href={href}
              className={`${BREEDER_CARD_ACTION_BTN_CLASS} ${breederCardVisitCtaClass()} bg-[#D97706] text-white hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60`}
            >
              🏪 {t(lang, "breeders.card.cta")}
            </Link>
          ) : showReviewButton ? (
            <button
              type="button"
              onClick={(e) => void promptFarmReview(e)}
              className={`${BREEDER_CARD_ACTION_BTN_CLASS} ${breederCardVisitCtaClass()} bg-[#D97706] text-white hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60`}
            >
              ⭐ {t(lang, "breeders.card.sendReview")}
            </button>
          ) : (
            <span aria-hidden />
          )}
        </div>
        {showMessageButton && messageError ? (
          <p className="mt-2 text-[11px] text-red-600">{messageError}</p>
        ) : null}
        {reviewNotice ? (
          <p className="mt-2 text-[11px] text-emerald-700">{reviewNotice}</p>
        ) : null}
      </div>
      <FarmReviewModal
        lang={lang}
        open={reviewOpen}
        busy={reviewBusy}
        error={reviewError}
        alreadyReviewed={hasReviewedFarm}
        onClose={() => {
          if (!reviewBusy) setReviewOpen(false);
        }}
        onSubmit={(payload) => void submitFarmReview(payload)}
      />
    </article>
  );
}
