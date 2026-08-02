"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { formatPriceVnd, isBlankDisplayValue } from "@/lib/formatPrice";
import type { PublicComment } from "@/lib/api/public";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { EscrowBadge, VerifiedBadge } from "./Badges";

const REPORT_REASONS = [
  "scam",
  "misleading_health_claims",
  "abusive_content",
  "fake_contact",
  "unsafe_transaction",
] as const;

type UiComment = {
  id: string;
  author: string;
  text: string;
  time: string;
  isBreeder: boolean;
};

function SpecCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  if (isBlankDisplayValue(value)) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
      <span className="text-lg leading-none mt-0.5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-900 leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCommentTime(iso: string, lang: Lang): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "VI" ? "Vừa xong" : "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function mapApiComment(
  c: PublicComment,
  breederUserId: string | undefined,
  lang: Lang,
): UiComment {
  return {
    id: c.id,
    author: c.author_display_name || (lang === "VI" ? "Người dùng" : "User"),
    text: c.body,
    time: formatCommentTime(c.created_at, lang),
                    isBreeder: Boolean(breederUserId && c.user_id === breederUserId),
  };
}

export function ListingDetail({
  listing,
  lang,
  isLoggedIn = false,
  initialComments = [],
}: {
  listing: Listing;
  lang: Lang;
  isLoggedIn?: boolean;
  initialComments?: PublicComment[];
}) {
  const router = useRouter();
  const breederUserId = listing.breeder.userId;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<UiComment[]>(() =>
    initialComments.map((c) => mapApiComment(c, breederUserId, lang)),
  );
  const [activeMedia, setActiveMedia] = useState(0);
  const [saved, setSaved] = useState(Boolean(listing.saved));
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState("");
  const [reportDone, setReportDone] = useState(false);

  const title = lang === "VI" ? listing.titleVI : listing.title;
  const description =
    lang === "VI" ? listing.descriptionVI : listing.description;
  const personality =
    lang === "VI" ? listing.personalityVI : listing.personality;
  const media = listing.mediaUrls.length
    ? listing.mediaUrls
    : [listing.mediaUrl];
  const price = formatPriceVnd(listing.price) || listing.price;

  const reasonLabels = useMemo(
    () => ({
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
    }),
    [lang],
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${listing.id}/favorite`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSaved(Boolean(data?.data?.favorited));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, listing.id]);

  const requireLogin = () => {
    router.push(`/login?next=/app/pet-feed/posts/${listing.id}`);
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("comment");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const created = data.data as PublicComment | undefined;
      if (created?.id) {
        setComments((prev) => [
          ...prev,
          mapApiComment(created, breederUserId, lang),
        ]);
      }
      setComment("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const messageSeller = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("message");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/conversations`, {
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy("favorite");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
    } catch (err) {
      setSaved(!next);
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("report");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          note: reportNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
        setReportNote("");
      }, 1200);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const shareListing = async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setActionError(
          lang === "VI" ? "Đã sao chép link" : "Link copied",
        );
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <Link
        href="/app/pet-feed"
        className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-5"
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
        {t(lang, "detail.back")}
      </Link>
      <div className="mb-5">
        <DisclaimerBanner lang={lang} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:flex-[1.4]">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media[activeMedia] || listing.mediaUrl}
              alt={listing.breed}
              className="w-full h-full object-cover"
            />
            {listing.escrowEnabled ? (
              <span className="absolute top-3 right-3">
                <EscrowBadge lang={lang} />
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {media.slice(0, 3).map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActiveMedia(i)}
                className={`rounded-xl overflow-hidden aspect-square bg-slate-100 ${
                  i === activeMedia
                    ? "ring-2 ring-[#1E6FE8]"
                    : "opacity-60 hover:opacity-100 transition-opacity"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {listing.evidenceUrls && listing.evidenceUrls.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {t(lang, "detail.evidence")}
              </p>
              <div className="flex gap-2">
                {listing.evidenceUrls.map((url, i) => (
                  <div
                    key={i}
                    className="w-20 h-16 rounded-lg overflow-hidden bg-amber-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Vaccine evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
                  {title}
                </h1>
                {price ? (
                  <p className="text-2xl font-bold text-[#1E6FE8]">{price}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={busy === "favorite"}
                className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  saved
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                }`}
                aria-label={t(lang, "detail.save")}
              >
                {saved ? "♥" : "♡"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <SpecCard
                icon="🧬"
                label={t(lang, "detail.breed")}
                value={listing.breed}
              />
              <SpecCard
                icon="📅"
                label={t(lang, "detail.age")}
                value={
                  listing.ageMonths > 0
                    ? `${listing.ageMonths} ${t(lang, "detail.months")}`
                    : ""
                }
              />
              <SpecCard
                icon="⚥"
                label={t(lang, "detail.gender")}
                value={genderLabel(lang, listing.gender)}
              />
              <SpecCard
                icon="📍"
                label={t(lang, "detail.location")}
                value={listing.location}
              />
              <SpecCard
                icon="💉"
                label="Vaccine"
                value={listing.vaccineStatus}
              />
              <SpecCard
                icon="💊"
                label={t(lang, "detail.deworming")}
                value={listing.dewormingStatus}
              />
            </div>
            {personality.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {personality.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-blue-50 text-[#1E6FE8] text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {!isBlankDisplayValue(description) && (
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                {description}
              </p>
            )}
            <Link
              href={`/app/breeders/${listing.breeder.id}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5 hover:bg-slate-100 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.breeder.avatar}
                alt={listing.breeder.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {listing.breeder.name}
                  </p>
                  {listing.breeder.verified && <VerifiedBadge />}
                </div>
                <p className="text-xs text-slate-400">
                  {listing.breeder.location}
                </p>
              </div>
            </Link>

            {actionError ? (
              <p className="mb-3 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {actionError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-lg">
                    🛡️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-900 mb-1">
                      {t(lang, "escrow.card.title")}
                    </p>
                    <p className="text-xs text-emerald-800/90 leading-relaxed">
                      {t(lang, "escrow.card.body")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full py-2.5 bg-emerald-600/70 text-white text-sm font-semibold rounded-full cursor-not-allowed"
                  title={t(lang, "escrow.card.soon")}
                >
                  {t(lang, "escrow.card.soon")}
                </button>
              </div>

              <button
                type="button"
                onClick={messageSeller}
                disabled={busy === "message"}
                className="w-full py-3 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                💬 {t(lang, "detail.message")}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shareListing}
                  className="py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:border-slate-300 transition-colors"
                >
                  {t(lang, "detail.share")}
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
                  className="py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-full hover:border-red-200 hover:text-red-500 transition-colors"
                >
                  {t(lang, "detail.report")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-5">
          {t(lang, "detail.comments")} ({comments.length})
        </h2>
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-400">
              {lang === "VI"
                ? "Chưa có bình luận nào."
                : "No comments yet."}
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    c.isBreeder
                      ? "bg-[#1E6FE8] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {(c.author[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-900">
                      {c.author}
                    </p>
                    {c.isBreeder && <VerifiedBadge size="xs" />}
                    <p className="text-[10px] text-slate-400">{c.time}</p>
                  </div>
                  <p className="text-sm text-slate-600">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E6FE8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {isLoggedIn ? "Y" : "?"}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendComment();
              }}
              placeholder={
                isLoggedIn
                  ? t(lang, "detail.writeComment")
                  : t(lang, "detail.loginToComment")
              }
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all"
            />
            <button
              type="button"
              onClick={() => void sendComment()}
              disabled={busy === "comment"}
              className="px-4 py-2 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
            >
              {t(lang, "detail.send")}
            </button>
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
              {t(lang, "detail.report")}
            </h2>
            {reportDone ? (
              <p className="text-sm text-emerald-700 mb-4">
                {t(lang, "detail.reportSuccess")}
              </p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="reason"
                        className="accent-[#1E6FE8]"
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                      />
                      {reasonLabels[r]}
                    </label>
                  ))}
                </div>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder={
                    lang === "VI"
                      ? "Ghi chú thêm (tuỳ chọn)"
                      : "Optional note"
                  }
                  rows={2}
                  className="w-full mb-4 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full"
              >
                {t(lang, "common.cancel")}
              </button>
              {!reportDone && (
                <button
                  type="button"
                  onClick={() => void submitReport()}
                  disabled={busy === "report"}
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
