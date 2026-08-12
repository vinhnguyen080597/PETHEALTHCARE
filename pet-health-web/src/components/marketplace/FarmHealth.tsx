"use client";

import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import { getEffectiveTrust } from "@/lib/types";
import {
  computeBreederTrustScore,
  getTrustTier,
  transparencyInputFromBreeder,
} from "@/lib/breederTrust";
import { farmTrustGuideHref } from "@/lib/farmTrustGuide";
import { formatBreederReviewLabel } from "@/lib/breederDealReviews";
import { t } from "@/i18n";
import { TrustLevelChip } from "./Badges";
import { TrustTicksGauge } from "./TrustTicksGauge";

export function FarmHealth({
  breeder,
  lang,
  embedded = false,
  isOwner = false,
}: {
  breeder: BreederProfile;
  lang: Lang;
  /** When true, render score summary for Hồ sơ trại overview tab. */
  embedded?: boolean;
  /** Owner-only CTA to the detailed trust guide. */
  isOwner?: boolean;
}) {
  const input = transparencyInputFromBreeder(breeder, {}, {
    senConfirmedCompletions: breeder.petsRehomed ?? 0,
  });
  const computed = computeBreederTrustScore(input);
  const eff = Number.isFinite(breeder.trustScore)
    ? getEffectiveTrust(breeder.trustScore, 0)
    : computed.score;
  const tier = getTrustTier(eff);
  const tierLabel = lang === "VI" ? tier.nameVI : tier.nameEN;
  const tierMeaning = lang === "VI" ? tier.meaningVI : tier.meaningEN;
  const reviewLabel = formatBreederReviewLabel(
    breeder.reviewAverage ?? 0,
    breeder.reviewCount ?? 0,
    lang,
  );

  const isPending = breeder.verificationStatus === "pending_review";
  const isRejected =
    breeder.verificationStatus === "rejected" ||
    breeder.verificationStatus === "suspended";

  const body = (
    <div
      className={
        embedded
          ? "bg-white rounded-2xl border border-[#F3E2C8] p-5 lg:p-6"
          : "bg-white rounded-2xl border border-slate-100 p-5 lg:p-8"
      }
    >
      <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase mb-1">
        {t(lang, "farm.trust.scoreTitle")}
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-5 max-w-3xl">
        {t(lang, "farm.trust.scoreSubtitle")}
      </p>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm text-amber-800 font-medium">
            {lang === "VI"
              ? "Hồ sơ đang chờ admin xác minh. Điểm sẽ cập nhật sau khi được duyệt."
              : "Profile is pending admin review. Score updates after approval."}
          </p>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-red-500 text-lg">⛔</span>
          <p className="text-sm text-red-800 font-medium">
            {lang === "VI"
              ? "Hồ sơ bị từ chối / tạm khóa. Liên hệ hỗ trợ để biết thêm chi tiết."
              : "Profile rejected or suspended. Contact support for details."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        <div className="flex flex-col items-center text-center">
          <TrustTicksGauge
            score={eff}
            caption={t(lang, "farm.trust.gaugeCaption")}
            size={embedded ? 200 : 240}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <TrustLevelChip level={tier.level} label={tierLabel} />
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {lang === "VI"
                ? `Điểm minh bạch: ${eff}/100`
                : `Transparency score: ${eff}/100`}
            </p>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {tierMeaning}
            </p>
            {reviewLabel ? (
              <p className="mt-2 text-sm font-medium text-amber-700">{reviewLabel}</p>
            ) : null}
          </div>

          {isOwner ? (
            <Link
              href={farmTrustGuideHref(breeder.id)}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#F3E2C8] bg-[#FDFBF7] text-sm font-semibold text-[#B45309] hover:bg-[#FEF3C7] transition-colors"
            >
              📋 {t(lang, "farm.trust.guide.cta")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
      <Link
        href={`/app/breeders/${breeder.id}`}
        className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-6"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M10 12 6 8l4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {lang === "VI" ? "Quay lại hồ sơ trại" : "Back to farm profile"}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t(lang, "farm.trust.scoreTitle")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{breeder.name}</p>
      </div>

      {body}
    </div>
  );
}
