"use client";

import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import { getEffectiveTrust, getTrustLevel } from "@/lib/types";
import {
  computeBreederQualityIndex,
  qualitySignalsFromBreeder,
} from "@/lib/breederTrust";
import { TrustLevelChip } from "./Badges";

export function FarmHealth({
  breeder,
  lang,
}: {
  breeder: BreederProfile;
  lang: Lang;
}) {
  const signals = qualitySignalsFromBreeder(breeder);
  const signalScore = computeBreederQualityIndex(signals);
  // Prefer mapped score (metadata or signals); keep breakdown from live signals.
  const eff = getEffectiveTrust(
    Number.isFinite(breeder.trustScore) ? breeder.trustScore : signalScore,
    breeder.penaltyPoints,
  );
  const { level, label } = getTrustLevel(eff, breeder.verified);
  const isPending = breeder.verificationStatus === "pending_review";
  const isRejected =
    breeder.verificationStatus === "rejected" ||
    breeder.verificationStatus === "suspended";

  const scoreBreakdown = [
    {
      label: "Xác minh",
      key: "verified",
      max: 30,
      val: breeder.verified ? 30 : 0,
      done: breeder.verified,
    },
    {
      label: "Checklist chăm sóc",
      key: "checklist",
      max: 15,
      val: Math.min(breeder.checklist.filter((c) => c.done).length * 3, 15),
      done: breeder.checklist.filter((c) => c.done).length >= 3,
    },
    {
      label: "Cam kết",
      key: "commitments",
      max: 15,
      val: Math.min(breeder.commitments.length * 7.5, 15),
      done: breeder.commitments.length >= 2,
    },
    {
      label: "Liên hệ (phone/zalo/FB)",
      key: "contact",
      max: 15,
      val:
        Object.values(breeder.contact).filter(Boolean).length >= 2
          ? 15
          : Object.values(breeder.contact).filter(Boolean).length >= 1
            ? 7
            : 0,
      done: Object.values(breeder.contact).filter(Boolean).length >= 1,
    },
    {
      label: "Môi trường chăm sóc",
      key: "care",
      max: 15,
      val: breeder.careEnvironment || breeder.bio ? 15 : 0,
      done: !!(breeder.careEnvironment || breeder.bio),
    },
    {
      label: "Tin đăng active",
      key: "listings",
      max: 10,
      val: Math.min(breeder.activeListings * 2, 10),
      done: breeder.activeListings > 0,
    },
  ];

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === "VI" ? "Sức khỏe trại" : "Farm Health"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Farm Health · {breeder.name}
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg">
          NEW
        </span>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm text-amber-800 font-medium">
            Hồ sơ đang chờ admin xác minh. Điểm sẽ cập nhật sau khi được duyệt.
          </p>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-red-500 text-lg">⛔</span>
          <p className="text-sm text-red-800 font-medium">
            Hồ sơ bị từ chối / tạm khóa. Liên hệ hỗ trợ để biết thêm chi tiết.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-5">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="9"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={
                  eff >= 70 ? "#059669" : eff >= 40 ? "#1E6FE8" : "#94A3B8"
                }
                strokeWidth="9"
                strokeDasharray={`${(eff / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{eff}</span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
              <TrustLevelChip level={level} label={label} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Điểm tin cậy: {eff}/100
            </h2>
            {breeder.penaltyPoints > 0 && (
              <p className="text-sm text-red-600 font-medium mb-2">
                −{breeder.penaltyPoints} từ vi phạm đã xác nhận (Điểm gốc:{" "}
                {breeder.trustScore}/100)
              </p>
            )}
            <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
              Điểm này là tín hiệu tham khảo nội bộ, dựa trên mức độ minh bạch
              hồ sơ và bài đăng. Không phải đánh giá giao dịch hay sức khỏe thú.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Điểm tin cậy",
            value: `${eff}/100`,
            sub:
              breeder.penaltyPoints > 0
                ? `−${breeder.penaltyPoints}`
                : "Không vi phạm",
            color: "text-[#1E6FE8]",
          },
          {
            label: "Cấp",
            value: level,
            sub: label,
            color:
              level === "L3"
                ? "text-amber-600"
                : level === "L2"
                  ? "text-emerald-600"
                  : "text-slate-500",
          },
          {
            label: "Vi phạm active",
            value: `${breeder.violations.length}`,
            sub:
              breeder.violations.length === 0 ? "Chưa có" : "Đã xác nhận",
            color:
              breeder.violations.length > 0
                ? "text-red-600"
                : "text-emerald-600",
          },
          {
            label: "Tin đang đăng",
            value: `${breeder.activeListings}`,
            sub: "Published",
            color: "text-slate-900",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="bg-white rounded-xl border border-slate-100 p-5"
          >
            <p className="text-xs text-slate-400 font-medium mb-1">
              {tile.label}
            </p>
            <p className={`text-2xl font-bold mb-0.5 ${tile.color}`}>
              {tile.value}
            </p>
            <p className="text-xs text-slate-400">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Vi phạm đã xác nhận
          </h3>
          {breeder.violations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-medium text-slate-700 text-sm">
                Chưa có báo cáo được xác nhận
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {breeder.violations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between p-3 bg-red-50 border border-red-100 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {v.reason}
                    </p>
                    <p className="text-xs text-red-400 mt-0.5">{v.date}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 flex-shrink-0 ml-3">
                    −{v.points} điểm
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Tín hiệu tin cậy
          </h3>
          <div className="space-y-2">
            {scoreBreakdown.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      s.done ? "text-emerald-600" : "text-slate-300"
                    }
                  >
                    {s.done ? "✓" : "○"}
                  </span>
                  <span className="text-sm text-slate-700">{s.label}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {s.val}/{s.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
