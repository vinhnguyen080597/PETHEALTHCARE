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
import { t } from "@/i18n";
import { TrustLevelChip } from "./Badges";
import { TrustTicksGauge } from "./TrustTicksGauge";

function lineLabel(lang: Lang, key: string): string {
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
  if (!row) return key;
  return lang === "VI" ? row.vi : row.en;
}

function formatLinePoints(line: TrustScoreBreakdownLine): string {
  if (line.group === "penalty") {
    return line.val === 0 ? "−0đ" : `${line.val}đ`;
  }
  const sign = line.val > 0 ? "+" : "";
  return `${sign}${line.val} / ${line.max}đ`;
}

export function FarmHealth({
  breeder,
  lang,
  embedded = false,
}: {
  breeder: BreederProfile;
  lang: Lang;
  /** When true, render score content only (for Hồ sơ trại overview tab). */
  embedded?: boolean;
}) {
  const input = qualitySignalsFromBreeder(breeder);
  const computed = computeBreederTrustScore(input);
  const eff = Number.isFinite(breeder.trustScore)
    ? getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints)
    : computed.score;
  const tier = getTrustTier(eff);
  const tierLabel = lang === "VI" ? tier.nameVI : tier.nameEN;
  const tierMeaning = lang === "VI" ? tier.meaningVI : tier.meaningEN;
  const transparencyPct = Math.round(
    (computed.missionPoints / 50) * 100,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Left: gauge */}
        <div className="flex flex-col items-center text-center">
          <TrustTicksGauge
            score={eff}
            caption={t(lang, "farm.trust.gaugeCaption")}
            size={embedded ? 200 : 240}
          />
        </div>

        {/* Right: tier + breakdown */}
        <div className="min-w-0 space-y-4">
          <div>
            <TrustLevelChip level={tier.level} label={tierLabel} />
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {lang === "VI"
                ? `Mức độ minh bạch hồ sơ đạt ${transparencyPct}%`
                : `Profile transparency at ${transparencyPct}%`}
            </p>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {tierMeaning}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold tracking-wide text-slate-700 uppercase mb-3 flex items-center gap-1.5">
              <span aria-hidden>📋</span>
              {t(lang, "farm.trust.breakdownTitle")}
            </h3>
            <ul className="space-y-2">
              {computed.lines.map((line) => (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0"
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
                      {lineLabel(lang, line.key)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      line.group === "penalty" && line.val < 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {formatLinePoints(line)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {breeder.violations.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-red-800">
                {lang === "VI" ? "Vi phạm đã xác nhận" : "Confirmed violations"}
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
          )}
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
        <p className="text-slate-500 text-sm mt-1">
          {breeder.name}
        </p>
      </div>

      {body}
    </div>
  );
}
