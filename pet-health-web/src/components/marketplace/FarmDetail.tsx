"use client";

import { useState } from "react";
import Link from "next/link";
import type { BreederProfile, Lang, Listing, TemplateId } from "@/lib/types";
import {
  getEffectiveTrust,
  getTrustLevel,
  templateMeta,
} from "@/lib/types";
import { VerifiedBadge, PendingBadge, TrustLevelChip } from "./Badges";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { ListingCard } from "./ListingCard";

function HeroT1({ breeder }: { breeder: BreederProfile }) {
  const eff = getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints);
  const { level, label } = getTrustLevel(eff, breeder.verified);
  return (
    <div className="bg-gradient-to-r from-[#1E6FE8] to-[#2563EB] text-white px-6 lg:px-12 py-10 lg:py-14">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-8">
        <div className="flex-shrink-0">
          <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl border-4 border-white/30 overflow-hidden bg-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={breeder.avatar}
              alt={breeder.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="flex-1 text-center lg:text-left">
          <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold">{breeder.name}</h1>
            {breeder.verified ? <VerifiedBadge /> : <PendingBadge />}
          </div>
          <p className="text-blue-100 text-sm mb-4">
            {breeder.location} · {breeder.primarySpecies.join(", ")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <div className="text-center">
              <p className="text-2xl font-bold">{eff}/100</p>
              <p className="text-xs text-blue-200">Điểm tin cậy</p>
            </div>
            <div className="w-px bg-white/20 hidden sm:block" />
            <div className="text-center">
              <TrustLevelChip level={level} label={label} />
              <p className="text-xs text-blue-200 mt-1">Cấp</p>
            </div>
            <div className="w-px bg-white/20 hidden sm:block" />
            <div className="text-center">
              <p className="text-2xl font-bold">{breeder.activeListings}</p>
              <p className="text-xs text-blue-200">Tin đăng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroT2({ breeder }: { breeder: BreederProfile }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ aspectRatio: "21/6", maxHeight: "400px" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          breeder.coverUrl ||
          "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=1400&h=400&fit=crop&auto=format"
        }
        alt="Farm cover"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-6 lg:px-12 pb-8 flex items-end gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl object-cover flex-shrink-0"
        />
        <div className="text-white">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold">{breeder.name}</h1>
            {breeder.verified && <VerifiedBadge />}
          </div>
          <p className="text-white/80 text-sm">
            {breeder.location} · {breeder.primarySpecies.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroT3({ breeder }: { breeder: BreederProfile }) {
  return (
    <div className="bg-violet-50 border-b-4 border-violet-600 px-6 lg:px-12 py-6 flex items-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={breeder.avatar}
        alt={breeder.name}
        className="w-16 h-16 rounded-xl border-2 border-violet-200 object-cover flex-shrink-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-violet-900">{breeder.name}</h1>
          {breeder.verified ? <VerifiedBadge /> : <PendingBadge />}
        </div>
        <p className="text-violet-600 text-sm">
          {breeder.location} · {breeder.mainBreeds.join(", ")}
        </p>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-3xl font-bold text-violet-700">
          {breeder.activeListings}
        </p>
        <p className="text-xs text-violet-500">Tin đang đăng</p>
      </div>
    </div>
  );
}

function HeroT4({ breeder }: { breeder: BreederProfile }) {
  return (
    <div className="bg-white border-b border-emerald-100 px-6 lg:px-12 py-10">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <div className="w-20 h-20 rounded-full border-4 border-emerald-200 overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={breeder.avatar}
            alt={breeder.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-emerald-200">
            🐾 Cứu hộ & Foster
          </div>
          <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
            <h1 className="text-2xl font-bold text-slate-900">{breeder.name}</h1>
            {breeder.verified && <VerifiedBadge />}
          </div>
          <p className="text-slate-500 text-sm">
            {breeder.location} · Mạng lưới foster phi lợi nhuận
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroT5({ breeder }: { breeder: BreederProfile }) {
  return (
    <div className="bg-amber-900 text-white px-6 lg:px-12 py-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber-700/50 border border-amber-600 px-4 py-2 rounded-lg mb-5 text-sm font-semibold">
          🏆 Trại đăng ký chính thức
        </div>
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={breeder.avatar}
            alt={breeder.name}
            className="w-20 h-20 rounded-xl border-2 border-amber-600 object-cover flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl lg:text-3xl font-bold">{breeder.name}</h1>
              {breeder.verified && <VerifiedBadge />}
            </div>
            <p className="text-amber-200 text-sm">
              {breeder.location} · {breeder.mainBreeds.join(" · ")}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {["FCI Member", "VKA Registered", "DNA Tested"].map((c) => (
            <span
              key={c}
              className="bg-amber-700/50 border border-amber-600 text-amber-100 text-xs font-medium px-3 py-1.5 rounded-lg"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderHero(template: TemplateId, breeder: BreederProfile) {
  switch (template) {
    case "T1":
      return <HeroT1 breeder={breeder} />;
    case "T2":
      return <HeroT2 breeder={breeder} />;
    case "T3":
      return <HeroT3 breeder={breeder} />;
    case "T4":
      return <HeroT4 breeder={breeder} />;
    case "T5":
      return <HeroT5 breeder={breeder} />;
  }
}

export function FarmDetail({
  breeder,
  lang,
  isOwner = false,
  listings,
}: {
  breeder: BreederProfile;
  lang: Lang;
  isOwner?: boolean;
  listings: Listing[];
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const eff = getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints);
  const { level, label } = getTrustLevel(eff, breeder.verified);
  const tmeta = templateMeta[breeder.template];

  const typeLabels: Record<string, string> = {
    registered_kennel: "Trại đăng ký chính thức",
    home_breeder: "Hộ gia đình nuôi sinh sản nhỏ",
    rescue_foster: "Cứu hộ / Foster",
    rehoming: "Cá nhân tìm nhà mới",
    other: "Khác",
  };

  return (
    <div className="min-h-screen">
      {renderHero(breeder.template, breeder)}

      {isOwner && (
        <div className="bg-blue-50 border-b border-blue-100 px-5 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[#1E6FE8] font-medium">
            Đây là trang của bạn
          </div>
          <div className="flex gap-2">
            <Link
              href="/app/account/breeder/template"
              className="px-3 py-1.5 bg-white border border-blue-200 text-[#1E6FE8] text-xs font-medium rounded-full hover:bg-blue-50 transition-colors"
            >
              🎨 Đổi template
            </Link>
            <Link
              href={`/app/breeders/${breeder.id}/health`}
              className="px-3 py-1.5 bg-white border border-blue-200 text-[#1E6FE8] text-xs font-medium rounded-full hover:bg-blue-50 transition-colors"
            >
              📊 Sức khỏe trại
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
        <div className="mb-6">
          <DisclaimerBanner lang={lang} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5">
              <h2 className="font-semibold text-slate-900 mb-4">
                Thông tin trại
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                {[
                  {
                    label: "Loại hình",
                    value: typeLabels[breeder.breederType] || breeder.breederType,
                  },
                  { label: "Quy mô", value: breeder.scale },
                  { label: "Khu vực", value: breeder.location },
                  {
                    label: "Loài",
                    value: breeder.primarySpecies
                      .map((s) =>
                        s === "cat" ? "Mèo" : s === "dog" ? "Chó" : s,
                      )
                      .join(", "),
                  },
                  { label: "Giống", value: breeder.mainBreeds.join(", ") },
                  {
                    label: "Template",
                    value: `${breeder.template} — ${tmeta.nameVI}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-slate-50 rounded-lg px-3 py-2.5"
                  >
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {item.value || "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">
                  Giới thiệu
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {lang === "VI" ? breeder.bioVI : breeder.bio}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6 mb-5">
              <h2 className="font-semibold text-slate-900 mb-3">
                Môi trường chăm sóc
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {breeder.careEnvironment || "—"}
              </p>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-2">
                  Chăm sóc checklist
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breeder.checklist.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                        item.done ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.done
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100"
                        }`}
                      >
                        {item.done ? "✓" : "○"}
                      </span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {breeder.breederType === "rescue_foster" &&
              breeder.commitments.length > 0 && (
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-6 mb-5">
                  <h2 className="font-semibold text-emerald-900 mb-3">
                    Cam kết
                  </h2>
                  <ul className="space-y-2">
                    {breeder.commitments.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-sm text-emerald-800"
                      >
                        <span className="mt-0.5 text-emerald-500">✓</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">
                  Tin đăng ({listings.length})
                </h2>
                {!isOwner && (
                  <Link
                    href={`/app/breeders/${breeder.id}/health`}
                    className="text-xs text-[#1E6FE8] font-medium"
                  >
                    Farm Health →
                  </Link>
                )}
              </div>
              {listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {listings.map((l) => (
                    <ListingCard key={l.id} listing={l} lang={lang} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="font-medium text-slate-700">Chưa có tin đăng</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Điểm tin cậy
                  </p>
                  <TrustLevelChip level={level} label={label} />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-lg font-bold text-slate-900">
                    {eff}/100
                  </p>
                  {breeder.penaltyPoints > 0 && (
                    <p className="text-xs text-red-500 font-medium">
                      −{breeder.penaltyPoints} từ vi phạm
                    </p>
                  )}
                </div>
              </div>

              {!isOwner && (
                <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
                  <Link
                    href="/app/messages"
                    className="block w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors text-center"
                  >
                    💬 {lang === "VI" ? "Nhắn tin" : "Message"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="w-full py-2 border border-slate-200 text-slate-500 text-xs font-medium rounded-full hover:border-red-200 hover:text-red-500 transition-colors"
                  >
                    Báo cáo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setReportOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900 mb-4">
              Báo cáo hồ sơ trại
            </h2>
            <div className="space-y-2 mb-5">
              {[
                "Thông tin sai lệch",
                "Thông tin vaccine không chính xác",
                "Lừa đảo / gian lận",
                "Nội dung không phù hợp",
                "Khác",
              ].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                >
                  <input type="radio" name="reason" className="accent-[#1E6FE8]" />{" "}
                  {r}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
