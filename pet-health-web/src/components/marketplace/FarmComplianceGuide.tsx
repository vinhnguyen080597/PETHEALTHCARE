"use client";

import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import {
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandForScore,
  complianceBandLabel,
  complianceBandMeaning,
  complianceTickColor,
  getComplianceScoreFromMetadata,
} from "@/lib/breederComplianceScore";
import {
  COMPLIANCE_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  complianceGuideBandSummary,
  pickLangText,
} from "@/lib/farmTrustGuide";
import { t } from "@/i18n";
import { TrustTicksGauge } from "./TrustTicksGauge";

export function FarmComplianceGuide({
  breeder,
  lang,
  profileMetadata = {},
}: {
  breeder: BreederProfile;
  lang: Lang;
  profileMetadata?: Record<string, unknown>;
}) {
  const complianceScore =
    typeof breeder.complianceScore === "number"
      ? breeder.complianceScore
      : getComplianceScoreFromMetadata(profileMetadata) ?? COMPLIANCE_SCORE_DEFAULT;
  const complianceBand = complianceBandForScore(complianceScore);
  const complianceBandText = complianceBandLabel(
    complianceBand,
    lang === "VI" ? "VI" : "EN",
  );
  const complianceMeaning = complianceBandMeaning(
    complianceBand,
    lang === "VI" ? "VI" : "EN",
  );
  const bandRows = complianceGuideBandSummary(lang);

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
        {t(lang, "farm.compliance.guide.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
          {t(lang, "farm.compliance.guide.ownerOnly")}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {t(lang, "farm.compliance.guide.title")}
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
          {t(lang, "farm.compliance.guide.intro")}
        </p>
      </header>

      <section className="bg-white border border-[#F3E2C8] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <TrustTicksGauge
          score={complianceScore}
          caption={t(lang, "farm.trust.complianceGaugeCaption")}
          size={180}
          tickColor={complianceTickColor}
        />
        <div className="min-w-0 text-center sm:text-left space-y-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {complianceBandText}
            <span className="ml-1.5 tabular-nums text-slate-500">
              {complianceScore}/100
            </span>
          </span>
          <p className="text-sm text-slate-600">{complianceMeaning}</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t(lang, "farm.trust.complianceHint")}
          </p>
        </div>
      </section>

      {breeder.violations.length > 0 ? (
        <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
            ⚠️ {t(lang, "farm.trust.guide.confirmedViolations")}
          </h2>
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 space-y-2">
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
        </section>
      ) : null}

      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          ⚠️ {t(lang, "farm.compliance.guide.rulesTitle")}
        </h2>
        <p className="text-sm text-slate-500">
          {t(lang, "farm.compliance.guide.rulesIntro")}
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
              {row.behaviorsVI ? (
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                  {pickLangText(
                    lang,
                    row.behaviorsVI,
                    row.behaviorsEN || row.behaviorsVI,
                  )}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {pickLangText(lang, row.actionVI, row.actionEN)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
          🎯 {t(lang, "farm.compliance.guide.impactTitle")}
        </h2>
        <ul className="space-y-3">
          {COMPLIANCE_GUIDE_IMPACT.map((row) => (
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
            {t(lang, "farm.compliance.guide.bandsTitle")}
          </p>
          {bandRows.map((line) => (
            <p key={line} className="text-xs text-slate-600 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
