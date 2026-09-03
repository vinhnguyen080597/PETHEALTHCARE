"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
import {
  transparencyProfileCompletionPercent,
  transparencyScoreColor,
} from "@/lib/breederTransparencyScore";
import {
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandChipClass,
  complianceBandForScore,
  complianceBandLabel,
  complianceBandMeaning,
  complianceScoreColor,
  complianceTickColor,
} from "@/lib/breederComplianceScore";
import { t } from "@/i18n";
import { TrustTicksGauge } from "./TrustTicksGauge";

function ScoreColumn({
  icon,
  title,
  badge,
  gauge,
  metricLabel,
  metricValue,
  metricPercent,
  metricColor,
  hint,
  cta,
}: {
  icon: ReactNode;
  title: string;
  badge: ReactNode;
  gauge: ReactNode;
  metricLabel: string;
  metricValue: string;
  metricPercent: number;
  metricColor: string;
  hint: string;
  cta: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
          {icon}
          {title}
        </span>
        {badge}
      </div>

      <div className="flex justify-center">{gauge}</div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span className="text-slate-600">{metricLabel}</span>
          <span className="tabular-nums" style={{ color: metricColor }}>
            {metricValue}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, Math.min(100, metricPercent))}%`,
              backgroundColor: metricColor,
            }}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">{hint}</p>
      </div>

      {cta ? <div className="mt-4 pt-1">{cta}</div> : null}
    </div>
  );
}

function TransparencyIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}

function ComplianceIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

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
  /** Owner-only CTA to the detailed guides. */
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
  const transparencyColor = transparencyScoreColor(eff);

  const complianceScore =
    typeof breeder.complianceScore === "number"
      ? breeder.complianceScore
      : COMPLIANCE_SCORE_DEFAULT;
  const complianceBand = complianceBandForScore(complianceScore);
  const complianceLocale = lang === "VI" ? "VI" : "EN";
  const complianceBandText = complianceBandLabel(complianceBand, complianceLocale);
  const complianceMeaning = complianceBandMeaning(complianceBand, complianceLocale);
  const complianceColor = complianceScoreColor(complianceScore);

  const gaugeSize = embedded ? 168 : 200;
  const gaugeCaption = t(lang, "farm.trust.gaugeOutOf");

  const isPending = breeder.verificationStatus === "pending_review";
  const isRejected =
    breeder.verificationStatus === "rejected" ||
    breeder.verificationStatus === "suspended";

  const ctaClassName =
    "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold transition-colors";

  const chevron = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );

  const body = (
    <div
      className={
        embedded
          ? "bg-white rounded-2xl border border-[#F3E2C8] p-5 lg:p-6"
          : "bg-white rounded-2xl border border-slate-100 p-5 lg:p-8"
      }
    >
      <div className="mb-5">
        <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
          {t(lang, "farm.trust.sectionTitle")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-2xl">
          {t(lang, "farm.trust.sectionSubtitle")}
        </p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <ScoreColumn
          icon={<TransparencyIcon />}
          title={t(lang, "farm.trust.gaugeCaption")}
          badge={
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tier.chipClass}`}
            >
              {tierLabel}
            </span>
          }
          gauge={
            <TrustTicksGauge
              score={eff}
              caption={gaugeCaption}
              size={gaugeSize}
            />
          }
          metricLabel={t(lang, "farm.trust.profileProgress")}
          metricValue={`${profileProgress}%`}
          metricPercent={profileProgress}
          metricColor={transparencyColor}
          hint={lang === "VI" ? tier.meaningVI : tier.meaningEN}
          cta={
            isOwner ? (
              <Link
                href={farmTrustGuideHref(breeder.id)}
                className={`${ctaClassName} text-[#B45309] hover:bg-[#FFF7ED]`}
              >
                {t(lang, "farm.trust.guide.cta")}
                {chevron}
              </Link>
            ) : null
          }
        />

        <ScoreColumn
          icon={<ComplianceIcon />}
          title={t(lang, "farm.trust.complianceGaugeCaption")}
          badge={
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${complianceBandChipClass(
                complianceBand,
              )}`}
            >
              {complianceBandText} · {complianceScore}/100
            </span>
          }
          gauge={
            <TrustTicksGauge
              score={complianceScore}
              caption={gaugeCaption}
              size={gaugeSize}
              tickColor={complianceTickColor}
            />
          }
          metricLabel={t(lang, "farm.trust.accountStatus")}
          metricValue={complianceBandText}
          metricPercent={complianceScore}
          metricColor={complianceColor}
          hint={`${complianceMeaning} ${t(lang, "farm.trust.complianceHint")}`}
          cta={
            isOwner ? (
              <Link
                href={farmComplianceGuideHref(breeder.id)}
                className={`${ctaClassName} text-emerald-700 hover:bg-emerald-50`}
              >
                {t(lang, "farm.compliance.guide.cta")}
                {chevron}
              </Link>
            ) : null
          }
        />
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
          {t(lang, "farm.trust.sectionTitle")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{breeder.name}</p>
      </div>

      {body}
    </div>
  );
}
