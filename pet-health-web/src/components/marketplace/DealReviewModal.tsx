"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { validateDealReviewInput } from "@/lib/breederDealReviews";

export function DealReviewModal({
  lang,
  open,
  busy,
  onClose,
  onSubmit,
}: {
  lang: Lang;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: { rating: number; body?: string }) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async () => {
    const validation = validateDealReviewInput({ rating, body });
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    await onSubmit({
      rating,
      ...(body.trim() ? { body: body.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white border border-[#E8DFD0] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-review-title"
      >
        <h2 id="deal-review-title" className="text-base font-bold text-[#2B1E19]">
          {t(lang, "deal.reviewTitle")}
        </h2>
        <p className="mt-1 text-sm text-[#6E5A51]">{t(lang, "deal.reviewHint")}</p>

        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star}`}
              disabled={busy}
              onClick={() => setRating(star)}
              className={`text-2xl leading-none ${star <= rating ? "text-amber-500" : "text-slate-300"}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t(lang, "deal.reviewPlaceholder")}
          className="mt-4 w-full min-h-[88px] px-3 py-2.5 rounded-xl border border-[#F0E6D8] text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25"
        />

        {error ? (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex-1 py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? t(lang, "common.loading") : t(lang, "deal.reviewSubmit")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-[#E8DFD0] text-sm font-semibold text-[#5C4A3A]"
          >
            {t(lang, "deal.reviewSkip")}
          </button>
        </div>
      </div>
    </div>
  );
}
