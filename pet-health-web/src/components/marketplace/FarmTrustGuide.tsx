"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BreederProfile, Lang } from "@/lib/types";
import { getEffectiveTrust } from "@/lib/types";
import {
  computeBreederTrustScore,
  getTrustTier,
  parseTransparencyActivityFromMeta,
  transparencyInputFromBreeder,
} from "@/lib/breederTrust";
import {
  formatTransparencyBreakdownPoints,
  transparencyBreakdownLabel,
  visibleTransparencyBreakdownLines,
} from "@/lib/transparencyBreakdownDisplay";
import {
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  pickLangText,
  trustGuideTierSummary,
} from "@/lib/farmTrustGuide";
import {
  buildTrustGuideEarnRowStates,
  earnRowCtaLabelKey,
  trustGuideEarnActionForId,
} from "@/lib/trustGuideEarnStatus";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";
import { t } from "@/i18n";
import { TrustLevelChip } from "./Badges";
import { TrustTicksGauge } from "./TrustTicksGauge";
import { TrustGuideEarnModal } from "./TrustGuideEarnModal";

export function FarmTrustGuide({
  breeder,
  lang,
  profileMetadata = {},
  submissions = [],
}: {
  breeder: BreederProfile;
  lang: Lang;
  profileMetadata?: Record<string, unknown>;
  submissions?: BreederProfileSubmission[];
}) {
  const [earnModalRowId, setEarnModalRowId] = useState<string | null>(null);
  const activityMeta = parseTransparencyActivityFromMeta(profileMetadata);
  const input = transparencyInputFromBreeder(breeder, profileMetadata, {
    senConfirmedCompletions:
      activityMeta.senConfirmedCompletions || (breeder.petsRehomed ?? 0),
    fiveStarReviewCount: activityMeta.fiveStarReviewCount,
  });
  const computed = computeBreederTrustScore(input);
  const earnRows = useMemo(
    () =>
      buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
        isVerified: breeder.verified,
        meta: profileMetadata,
        senConfirmedCompletions:
          activityMeta.senConfirmedCompletions || (breeder.petsRehomed ?? 0),
        fiveStarReviewCount: activityMeta.fiveStarReviewCount,
        lang,
        verificationStatus: breeder.verificationStatus,
        submissions,
        contact: {
          facebook: breeder.contact.facebook,
          zalo: breeder.contact.zalo,
          tiktok: breeder.contact.tiktok,
          instagram: breeder.contact.instagram,
        },
        warrantyPolicies: breeder.warrantyPolicies,
      }),
    [
      breeder.verified,
      breeder.verificationStatus,
      breeder.petsRehomed,
      breeder.contact.facebook,
      breeder.contact.zalo,
      breeder.contact.tiktok,
      breeder.contact.instagram,
      breeder.warrantyPolicies,
      profileMetadata,
      activityMeta.senConfirmedCompletions,
      activityMeta.fiveStarReviewCount,
      lang,
      submissions,
    ],
  );
  const earnModalRow = TRUST_GUIDE_HOW_TO_EARN.find((row) => row.id === earnModalRowId);
  const earnModalAction = earnModalRowId
    ? trustGuideEarnActionForId(earnModalRowId)
    : null;
  const eff = Number.isFinite(breeder.trustScore)
    ? getEffectiveTrust(breeder.trustScore, 0)
    : computed.score;
  const tier = getTrustTier(eff);
  const tierLabel = lang === "VI" ? tier.nameVI : tier.nameEN;
  const tierRows = trustGuideTierSummary(lang);

  return (
    <div className="max-w-[900px] mx-auto px-5 lg:px-8 py-8 space-y-6">
      <Link
        href={`/app/breeders/${breeder.id}`}
        className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            d="M10 12 6 8l4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t(lang, "farm.trust.guide.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
          {t(lang, "farm.trust.guide.ownerOnly")}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {t(lang, "farm.trust.guide.title")}
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
          {t(lang, "farm.trust.guide.intro")}
        </p>
      </header>

      {/* Current score snapshot */}
      <section className="bg-white border border-[#F3E2C8] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <TrustTicksGauge
          score={eff}
          caption={t(lang, "farm.trust.gaugeCaption")}
          size={180}
        />
        <div className="min-w-0 text-center sm:text-left space-y-2">
          <TrustLevelChip level={tier.level} label={tierLabel} />
          <p className="text-sm text-slate-600">
            {lang === "VI"
              ? `Điểm hiện tại: ${eff}/100 · Hồ sơ ${computed.profilePoints} · Hoạt động ${computed.activityPoints} · Phạt −${computed.violationPoints}`
              : `Current: ${eff}/100 · Profile ${computed.profilePoints} · Activity ${computed.activityPoints} · Penalties −${computed.violationPoints}`}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "VI" ? tier.meaningVI : tier.meaningEN}
          </p>
        </div>
      </section>

      {/* Live breakdown */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-3">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          📋 {t(lang, "farm.trust.breakdownTitle")}
        </h2>
        <p className="text-sm text-slate-500">
          {t(lang, "farm.trust.guide.breakdownHint")}
        </p>
        <ul className="space-y-1">
          {visibleTransparencyBreakdownLines(computed.lines).map((line) => (
            <li
              key={line.key}
              className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={
                    line.done ? "text-emerald-600" : "text-slate-300"
                  }
                  aria-hidden
                >
                  {line.done ? "✓" : "○"}
                </span>
                <span className="text-sm text-slate-700 truncate">
                  {transparencyBreakdownLabel(lang, line.key)}
                </span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-500 shrink-0">
                {formatTransparencyBreakdownPoints(line, lang)}
              </span>
            </li>
          ))}
        </ul>
        {breeder.violations.length > 0 ? (
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-red-800">
              {t(lang, "farm.trust.guide.confirmedViolations")}
            </p>
            {breeder.violations.map((v) => (
              <div
                key={v.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div>
                  <p className="text-red-800 font-medium">{v.reason}</p>
                  <p className="text-xs text-red-400">{v.date}</p>
                </div>
                <span className="text-red-600 font-bold shrink-0">
                  −{v.points}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* How to improve */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          ✅ {t(lang, "farm.trust.guide.earnTitle")}
        </h2>
        <p className="text-sm text-slate-500">
          {t(lang, "farm.trust.guide.earnIntro")}
        </p>
        <ul className="space-y-3">
          {TRUST_GUIDE_HOW_TO_EARN.map((row) => {
            const state = earnRows.find((item) => item.id === row.id);
            const done = state?.done ?? false;
            const cta = state?.cta ?? "none";
            const pointsLabel = state?.pointsLabel ?? `+${row.points}đ`;
            const description =
              state?.description ?? pickLangText(lang, row.howVI, row.howEN);
            const descriptionHref = state?.descriptionHref ?? null;
            return (
            <li
              key={row.id}
              className={`rounded-xl border px-4 py-3 ${
                done
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-slate-100 bg-slate-50/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`text-sm font-semibold ${
                    done ? "text-emerald-800" : "text-slate-800"
                  }`}
                >
                  {pickLangText(lang, row.titleVI, row.titleEN)}
                </p>
                <span
                  className={`text-xs font-bold tabular-nums shrink-0 ${
                    done ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {pointsLabel}
                </span>
              </div>
              <div className="mt-1 flex items-start justify-between gap-3">
                {descriptionHref ? (
                  <a
                    href={descriptionHref}
                    target={descriptionHref.startsWith("tel:") ? undefined : "_blank"}
                    rel={
                      descriptionHref.startsWith("tel:")
                        ? undefined
                        : "noopener noreferrer"
                    }
                    className={`text-sm leading-relaxed min-w-0 break-all hover:underline ${
                      done ? "text-emerald-700/80" : "text-slate-600"
                    }`}
                  >
                    {description}
                  </a>
                ) : description ? (
                  <p
                    className={`text-sm leading-relaxed min-w-0 break-all ${
                      done ? "text-emerald-700/80" : "text-slate-600"
                    }`}
                  >
                    {description}
                  </p>
                ) : (
                  <span className="min-w-0 flex-1" />
                )}
                {cta === "pending" ? (
                  <span className="shrink-0 text-[11px] font-semibold text-amber-800">
                    {t(lang, earnRowCtaLabelKey(cta)!)}
                  </span>
                ) : cta === "rejected" || cta === "update" ? (
                  <button
                    type="button"
                    onClick={() => setEarnModalRowId(row.id)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      cta === "rejected"
                        ? "border border-red-200 text-red-700 hover:bg-red-50"
                        : "border border-[#D97706] text-[#D97706] hover:bg-[#FFF7ED]"
                    }`}
                  >
                    {t(lang, earnRowCtaLabelKey(cta)!)}
                  </button>
                ) : null}
              </div>
              {state?.mediaKind === "video" && state.mediaUrl ? (
                <video
                  src={state.mediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="mt-2 w-full max-h-56 rounded-lg bg-black"
                >
                  {t(lang, "farm.trust.guide.earnVideoFallback")}
                </video>
              ) : state?.mediaKind === "image" && state.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.mediaUrl}
                  alt=""
                  className="mt-2 max-h-56 w-full rounded-lg object-contain bg-white"
                />
              ) : null}
            </li>
            );
          })}
        </ul>
        {earnModalRow && earnModalAction ? (
          <TrustGuideEarnModal
            lang={lang}
            row={earnModalRow}
            action={earnModalAction}
            open={Boolean(earnModalRowId)}
            onClose={() => setEarnModalRowId(null)}
          />
        ) : null}
      </section>

      {/* Rules / avoid penalties */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          ⚠️ {t(lang, "farm.trust.guide.rulesTitle")}
        </h2>
        <p className="text-sm text-slate-500">
          {t(lang, "farm.trust.guide.rulesIntro")}
        </p>
        <ul className="space-y-3">
          {TRUST_GUIDE_PENALTIES.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-red-50 bg-red-50/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  {pickLangText(lang, row.titleVI, row.titleEN)}
                </p>
                <span className="text-xs font-bold text-red-700 shrink-0">
                  −{row.points}đ
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {pickLangText(lang, row.actionVI, row.actionEN)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Impact */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          🎯 {t(lang, "farm.trust.guide.impactTitle")}
        </h2>
        <ul className="space-y-3">
          {TRUST_GUIDE_IMPACT.map((row) => (
            <li key={row.id} className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {pickLangText(lang, row.titleVI, row.titleEN)}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {pickLangText(lang, row.bodyVI, row.bodyEN)}
              </p>
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            {t(lang, "farm.trust.guide.tiersTitle")}
          </p>
          {tierRows.map((line) => (
            <p key={line} className="text-xs text-slate-600 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
