"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BreederProfile, Lang, Listing } from "@/lib/types";
import { isBlankDisplayValue } from "@/lib/formatPrice";
import { getBreederPublicTrustMetrics } from "@/lib/breederTrust";
import { t } from "@/i18n";
import { ListingCard } from "./ListingCard";
import { DisclaimerBanner } from "./DisclaimerBanner";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1600&h=500&fit=crop&auto=format";

const BREEDER_REPORT_REASONS = [
  "scam",
  "misleading_health_claims",
  "abusive_content",
  "fake_contact",
  "unsafe_transaction",
] as const;

type TabKey = "listings" | "reviews" | "facility" | "warranty";

function specialtyText(breeder: BreederProfile, lang: Lang): string {
  const breeds = breeder.mainBreeds.filter(Boolean).slice(0, 2);
  if (breeds.length) return `🐱 ${breeds.join(" & ")}`;
  const species = breeder.primarySpecies
    .map((s) =>
      s === "cat"
        ? lang === "VI"
          ? "Mèo"
          : "Cat"
        : s === "dog"
          ? lang === "VI"
            ? "Chó"
            : "Dog"
          : s,
    )
    .filter(Boolean);
  return species.length
    ? `🐾 ${species.join(" & ")}`
    : lang === "VI"
      ? "🐾 Thú cưng"
      : "🐾 Pets";
}

export function FarmDetail({
  breeder,
  lang,
  isOwner = false,
  isLoggedIn = false,
  listings,
}: {
  breeder: BreederProfile;
  lang: Lang;
  isOwner?: boolean;
  isLoggedIn?: boolean;
  listings: Listing[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("listings");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(
    BREEDER_REPORT_REASONS[0],
  );
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);

  const trustMetrics = getBreederPublicTrustMetrics(breeder, {
    listingCount: listings.length,
  });
  const trust = trustMetrics.qualityIndex;
  const reviewCount = trustMetrics.reviewCount;
  const cover = breeder.coverUrl || FALLBACK_COVER;
  const bioText = (lang === "VI" ? breeder.bioVI : breeder.bio).trim();

  const tabs: { key: TabKey; label: string }[] = [
    {
      key: "listings",
      label: `${t(lang, "farm.tab.listings")} (${listings.length})`,
    },
    {
      key: "reviews",
      label: `${t(lang, "farm.tab.reviews")} (${reviewCount})`,
    },
    { key: "facility", label: t(lang, "farm.tab.facility") },
    { key: "warranty", label: t(lang, "farm.tab.warranty") },
  ];

  const requireLogin = () => {
    router.push(`/login?next=/app/breeders/${breeder.id}`);
  };

  const messageBreeder = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const listingId = listings[0]?.id;
    if (!listingId) {
      router.push("/app/messages");
      return;
    }
    setMessageBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/conversations`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const conversationId = data?.data?.id;
      router.push(
        conversationId
          ? `/app/messages?c=${encodeURIComponent(conversationId)}`
          : "/app/messages",
      );
    } catch {
      router.push("/app/messages");
    } finally {
      setMessageBusy(false);
    }
  };

  const submitReport = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setReportBusy(true);
    setReportError("");
    try {
      const res = await fetch(`/api/breeders/${breeder.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
      }, 1200);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed");
    } finally {
      setReportBusy(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    scam: lang === "VI" ? "Lừa đảo / đáng ngờ" : "Scam or suspicious",
    misleading_health_claims:
      lang === "VI"
        ? "Thông tin sức khỏe sai lệch"
        : "Misleading health claims",
    abusive_content:
      lang === "VI" ? "Nội dung không phù hợp" : "Abusive content",
    fake_contact:
      lang === "VI" ? "Liên hệ giả / không liên lạc được" : "Fake contact",
    unsafe_transaction:
      lang === "VI" ? "Giao dịch không an toàn" : "Unsafe transaction",
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Cover + identity */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pt-6">
        <div className="relative h-44 sm:h-56 lg:h-64 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(43,30,25,0.15) 0%, rgba(43,30,25,0.55) 100%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(217,119,6,0.35), transparent 55%)",
            }}
          />
        </div>

        <div className="relative -mt-14 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 pb-2">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={breeder.avatar}
              alt={breeder.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-[4px] border-white shadow-lg bg-white"
            />
            {breeder.verified ? (
              <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center text-white text-sm shadow">
                ✓
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] tracking-tight truncate">
              {breeder.name}
            </h1>
            <p className="text-sm text-[#6E5A51] mt-1">
              {breeder.location
                ? `📍 ${breeder.location}`
                : lang === "VI"
                  ? "📍 Việt Nam"
                  : "📍 Vietnam"}
            </p>
            <p className="text-sm text-[#2B1E19]/70 mt-0.5">
              {specialtyText(breeder, lang)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(breeder.verified || breeder.verificationTier >= 2) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold border border-amber-200">
                  🛡️ {t(lang, "farm.badge.inspected")}
                </span>
              )}
              {breeder.verified && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  ✓ {t(lang, "farm.badge.idVerified")}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6 space-y-5">
        {isOwner && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#B45309] font-medium">
              {t(lang, "farm.owner.banner")}
            </p>
            <div className="flex gap-2">
              <Link
                href="/app/account/breeder/template"
                className="px-3 py-1.5 bg-white border border-amber-200 text-[#B45309] text-xs font-medium rounded-full hover:bg-amber-50 transition-colors"
              >
                🎨 {t(lang, "farm.owner.template")}
              </Link>
              <Link
                href={`/app/breeders/${breeder.id}/health`}
                className="px-3 py-1.5 bg-white border border-amber-200 text-[#B45309] text-xs font-medium rounded-full hover:bg-amber-50 transition-colors"
              >
                📊 {t(lang, "farm.owner.health")}
              </Link>
            </div>
          </div>
        )}

        <DisclaimerBanner lang={lang} />

        <div className="rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] px-4 py-3.5 text-sm text-[#92400E] leading-relaxed">
          <span className="font-semibold">
            🛡️ {t(lang, "farm.escrow.title")}
          </span>{" "}
          {t(lang, "farm.escrow.body")}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left 70% */}
          <div className="w-full lg:w-[70%] min-w-0 space-y-5">
            <div className="flex gap-1 overflow-x-auto border-b border-[#F3E2C8] pb-px">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    tab === item.key
                      ? "border-[#D97706] text-[#B45309]"
                      : "border-transparent text-[#6E5A51] hover:text-[#2B1E19]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "listings" && (
              <div>
                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((l) => (
                      <ListingCard key={l.id} listing={l} lang={lang} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6E5A51] py-10 text-center">
                    {t(lang, "farm.listings.empty")}
                  </p>
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-3">
                {reviewCount > 0 && trustMetrics.rating != null ? (
                  <p className="text-sm text-[#2B1E19]">
                    ⭐ {trustMetrics.rating.toFixed(1)} / 5.0{" "}
                    <span className="text-[#6E5A51]">
                      ({reviewCount} {t(lang, "breeders.card.reviews")})
                    </span>
                  </p>
                ) : null}
                <p className="text-sm text-[#6E5A51] py-10 text-center">
                  {t(lang, "farm.reviews.empty")}
                </p>
              </div>
            )}

            {tab === "facility" && (
              <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5 space-y-4">
                {!isBlankDisplayValue(bioText) && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B1E19] mb-1">
                      {t(lang, "farm.facility.about")}
                    </h3>
                    <p className="text-sm text-[#6E5A51] leading-relaxed">
                      {bioText}
                    </p>
                  </div>
                )}
                {!isBlankDisplayValue(breeder.careEnvironment) && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B1E19] mb-1">
                      {t(lang, "farm.facility.env")}
                    </h3>
                    <p className="text-sm text-[#6E5A51] leading-relaxed">
                      {breeder.careEnvironment}
                    </p>
                  </div>
                )}
                {!isBlankDisplayValue(breeder.scale) && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#2B1E19] mb-1">
                      {t(lang, "farm.facility.scale")}
                    </h3>
                    <p className="text-sm text-[#6E5A51]">{breeder.scale}</p>
                  </div>
                )}
                {breeder.checklist.length > 0 && (
                  <ul className="space-y-2">
                    {breeder.checklist.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-start gap-2 text-sm text-[#2B1E19]/80"
                      >
                        <span className="text-emerald-600 mt-0.5">
                          {item.done ? "✓" : "○"}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                )}
                {isBlankDisplayValue(bioText) &&
                  isBlankDisplayValue(breeder.careEnvironment) &&
                  isBlankDisplayValue(breeder.scale) &&
                  breeder.checklist.length === 0 && (
                    <p className="text-sm text-[#6E5A51]">
                      {t(lang, "farm.facility.empty")}
                    </p>
                  )}
              </div>
            )}

            {tab === "warranty" && (
              <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5">
                {breeder.commitments.length > 0 ? (
                  <ul className="space-y-2.5">
                    {breeder.commitments.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-sm text-[#2B1E19]/80"
                      >
                        <span className="text-[#D97706]">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#6E5A51] leading-relaxed">
                    {t(lang, "farm.warranty.fallback")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right 30% sticky */}
          <aside className="w-full lg:w-[30%] lg:sticky lg:top-24 space-y-4">
            {!isOwner && (
              <div className="bg-white border border-[#F3E2C8] rounded-2xl p-4 space-y-2.5 shadow-[0_10px_30px_-24px_rgba(217,119,6,0.35)]">
                <button
                  type="button"
                  onClick={() => void messageBreeder()}
                  disabled={messageBusy}
                  className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-xl hover:bg-[#B45309] transition-colors disabled:opacity-60"
                >
                  💬 {t(lang, "farm.cta.message")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      requireLogin();
                      return;
                    }
                    void messageBreeder();
                  }}
                  className="w-full py-2.5 border border-[#F3E2C8] text-[#2B1E19] text-sm font-medium rounded-xl hover:bg-[#FDFBF7] transition-colors"
                >
                  📹 {t(lang, "farm.cta.video")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      requireLogin();
                      return;
                    }
                    setReportOpen(true);
                  }}
                  className="w-full py-2 text-[#6E5A51] text-xs font-medium hover:text-red-600 transition-colors"
                >
                  {t(lang, "detail.report")}
                </button>
              </div>
            )}

            <div className="bg-white border border-[#F3E2C8] rounded-2xl p-4 space-y-4">
              <h2 className="text-xs font-semibold tracking-[0.12em] uppercase text-[#6E5A51]">
                {t(lang, "farm.trust.title")}
              </h2>
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-sm text-[#2B1E19]">
                    {t(lang, "farm.trust.quality")}
                  </span>
                  <span className="font-display text-xl font-semibold text-[#D97706]">
                    {trust}/100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F3E2C8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D97706]"
                    style={{ width: `${Math.min(100, trust)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-[#2B1E19]">
                {trustMetrics.rating != null && reviewCount > 0 ? (
                  <>
                    ⭐ {trustMetrics.rating.toFixed(1)} / 5.0{" "}
                    <span className="text-[#6E5A51]">
                      ({reviewCount} {t(lang, "breeders.card.reviews")})
                    </span>
                  </>
                ) : (
                  <>
                    ⭐ {t(lang, "farm.trust.ratingEmpty")}
                  </>
                )}
              </p>
              <p className="text-sm text-[#2B1E19]">
                ⚡{" "}
                {trustMetrics.responseMinutes != null
                  ? t(lang, "farm.trust.response").replace(
                      "{minutes}",
                      String(trustMetrics.responseMinutes),
                    )
                  : t(lang, "farm.trust.responseEmpty")}
              </p>
              <p className="text-sm text-[#2B1E19]">
                📦 {trustMetrics.petsRehomed} {t(lang, "farm.trust.adopted")}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setReportOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-[#F3E2C8]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-[#2B1E19] mb-4">
              {t(lang, "farm.report.title")}
            </h2>
            {reportDone ? (
              <p className="text-sm text-emerald-700 mb-4">
                {t(lang, "detail.reportSuccess")}
              </p>
            ) : (
              <div className="space-y-2 mb-5">
                {BREEDER_REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#FDFBF7] cursor-pointer text-sm text-[#2B1E19]"
                  >
                    <input
                      type="radio"
                      name="reason"
                      className="accent-[#D97706]"
                      checked={reportReason === r}
                      onChange={() => setReportReason(r)}
                    />
                    {reasonLabels[r]}
                  </label>
                ))}
              </div>
            )}
            {reportError ? (
              <p className="text-xs text-red-600 mb-3">{reportError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 border border-[#F3E2C8] text-[#6E5A51] text-sm font-medium rounded-full"
              >
                {t(lang, "common.cancel")}
              </button>
              {!reportDone && (
                <button
                  type="button"
                  onClick={() => void submitReport()}
                  disabled={reportBusy}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {lang === "VI" ? "Gửi báo cáo" : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
