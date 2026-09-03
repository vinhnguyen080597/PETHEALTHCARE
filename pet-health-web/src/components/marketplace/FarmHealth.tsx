"use client";

import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import { getEffectiveTrust } from "@/lib/types";
import {
  computeBreederTrustScore,
  getTrustTier,
  transparencyInputFromBreeder,
} from "@/lib/breederTrust";
import {
  farmComplianceGuideHref,
  farmTrustGuideHref,
} from "@/lib/farmTrustGuide";
import { transparencyProfileCompletionPercent } from "@/lib/breederTransparencyScore";
import {
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandForScore,
  complianceBandLabel,
  complianceBandMeaning,
} from "@/lib/breederComplianceScore";
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
  const profileProgress = transparencyProfileCompletionPercent(computed);
  const complianceScore =
    typeof breeder.complianceScore === "number"
      ? breeder.complianceScore
      : COMPLIANCE_SCORE_DEFAULT;
  const complianceBand = complianceBandForScore(complianceScore);
  const complianceBandText = complianceBandLabel(
    complianceBand,
    lang === "VI" ? "VI" : "EN",
  );
  const complianceMeaning = complianceBandMeaning(
    complianceBand,
    lang === "VI" ? "VI" : "EN",
  );
  const gaugeSize = embedded ? 180 : 220;

  const isPending = breeder.verificationStatus === "pending_review";
  const isRejected =
    breeder.verificationStatus === "rejected" ||
    breeder.verificationStatus === "suspended";

  const ctaClassName =
    "inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-[#F3E2C8] bg-[#FDFBF7] text-sm font-semibold text-[#B45309] hover:bg-[#FEF3C7] transition-colors";

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Left: Transparency */}
        <div className="flex flex-col items-center md:items-stretch gap-4 md:border-r md:border-[#F3E2C8] md:pr-6 lg:pr-8">
          <div className="flex flex-col items-center text-center">
            <TrustTicksGauge
              score={eff}
              caption={t(lang, "farm.trust.gaugeCaption")}
              size={gaugeSize}
            />
          </div>
          <div className="w-full space-y-3">
            <TrustLevelChip
              level={tier.level}
              label={tierLabel}
              showLevelPrefix={false}
            />
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">
                  {t(lang, "farm.trust.profileProgress")}
                </span>
                <span className="text-sm font-semibold tabular-nums text-[#B45309]">
                  {profileProgress}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3E2C8]">
                <div
                  className="h-full rounded-full bg-[#D97706]"
                  style={{ width: `${profileProgress}%` }}
                />
              </div>
            </div>
            {isOwner ? (
              <Link href={farmTrustGuideHref(breeder.id)} className={ctaClassName}>
                📋 {t(lang, "farm.trust.guide.cta")}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Right: Compliance */}
        <div className="flex flex-col items-center md:items-stretch gap-4">
          <div className="flex flex-col items-center text-center">
            <TrustTicksGauge
              score={complianceScore}
              caption={t(lang, "farm.trust.complianceGaugeCaption")}
              size={gaugeSize}
            />
          </div>
          <div className="w-full space-y-3">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {complianceBandText}
              <span className="ml-1.5 tabular-nums text-slate-500">
                {complianceScore}/100
              </span>
            </span>
            <p className="text-sm text-slate-600 leading-relaxed">
              {complianceMeaning}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t(lang, "farm.trust.complianceHint")}
            </p>
            {isOwner ? (
              <Link
                href={farmComplianceGuideHref(breeder.id)}
                className={ctaClassName}
              >
                📋 {t(lang, "farm.compliance.guide.cta")}
              </Link>
            ) : null}
          </div>
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
