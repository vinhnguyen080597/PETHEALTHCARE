"use client";

import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import { getEffectiveTrust } from "@/lib/types";
import {
  computeBreederTrustScore,
  getTrustTier,
  qualitySignalsFromBreeder,
  type TrustScoreBreakdownLine,
} from "@/lib/breederTrust";
import {
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  pickLangText,
  trustGuideTierSummary,
} from "@/lib/farmTrustGuide";
import { t } from "@/i18n";
import { TrustLevelChip } from "./Badges";
import { TrustTicksGauge } from "./TrustTicksGauge";

function breakdownLabel(lang: Lang, key: string): string {
  const map: Record<string, { vi: string; en: string }> = {
    ekycLicense: {
      vi: "Xác minh eKYC & Giấy phép",
      en: "eKYC & business license",
    },
    social: {
      vi: "Liên kết MXH (FB/Zalo/TT)",
      en: "Social links (FB/Zalo/TT)",
    },
    farmFacility: {
      vi: "Địa chỉ & video cơ sở",
      en: "Facility address & video",
    },
    healthDocs: {
      vi: "Bảo trợ sức khỏe (sổ tiêm)",
      en: "Health docs (vaccine book)",
    },
    reviews: {
      vi: "Đánh giá 5 sao từ khách",
      en: "5★ buyer reviews",
    },
    response: {
      vi: "Phản hồi tin nhắn < 15 phút",
      en: "Reply rate under 15 min",
    },
    penalty: {
      vi: "Lịch sử phạt",
      en: "Penalty history",
    },
  };
  const row = map[key];
  return row ? (lang === "VI" ? row.vi : row.en) : key;
}

function formatLinePoints(line: TrustScoreBreakdownLine): string {
  if (line.group === "penalty") {
    return line.val === 0 ? "−0đ" : `${line.val}đ`;
  }
  const sign = line.val > 0 ? "+" : "";
  return `${sign}${line.val} / ${line.max}đ`;
}

export function FarmTrustGuide({
  breeder,
  lang,
}: {
  breeder: BreederProfile;
  lang: Lang;
}) {
  const input = qualitySignalsFromBreeder(breeder);
  const computed = computeBreederTrustScore(input);
  const eff = Number.isFinite(breeder.trustScore)
    ? getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints)
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
              ? `Điểm hiện tại: ${eff}/100 · Nhiệm vụ ${computed.missionPoints} · Hoạt động ${computed.transactionPoints} · Phạt −${computed.violationPoints}`
              : `Current: ${eff}/100 · Missions ${computed.missionPoints} · Activity ${computed.transactionPoints} · Penalties −${computed.violationPoints}`}
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
          {computed.lines.map((line) => (
            <li
              key={line.key}
              className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={
                    line.group === "penalty"
                      ? line.val === 0
                        ? "text-emerald-600"
                        : "text-amber-600"
                      : line.done
                        ? "text-emerald-600"
                        : "text-slate-300"
                  }
                  aria-hidden
                >
                  {line.group === "penalty"
                    ? line.val === 0
                      ? "✓"
                      : "⚠️"
                    : line.done
                      ? "✓"
                      : "○"}
                </span>
                <span className="text-sm text-slate-700 truncate">
                  {breakdownLabel(lang, line.key)}
                </span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-500 shrink-0">
                {formatLinePoints(line)}
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
          {TRUST_GUIDE_HOW_TO_EARN.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  {pickLangText(lang, row.titleVI, row.titleEN)}
                </p>
                <span className="text-xs font-bold text-emerald-700 shrink-0">
                  +{row.points}đ
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {pickLangText(lang, row.howVI, row.howEN)}
              </p>
            </li>
          ))}
        </ul>
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
