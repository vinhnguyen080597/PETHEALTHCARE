"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import { DialogActions } from "@/components/ui/DialogActions";
import { validateFarmReviewInput } from "@/lib/breederFarmReviews";

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none ${value >= n ? "text-amber-500" : "text-slate-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function FarmReviewModal({
  lang,
  open,
  busy = false,
  error = "",
  onClose,
  onSubmit,
}: {
  lang: Lang;
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; body: string; photoUrls: string[] }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");

  if (!open) return null;

  const submit = () => {
    const err = validateFarmReviewInput({ rating, body, photoUrls: [] });
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError("");
    onSubmit({ rating, body: body.trim(), photoUrls: [] });
  };

  return (
    <div
      className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-slate-900">{t(lang, "farm.review.modalTitle")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t(lang, "farm.review.modalHint")}</p>
        <div className="mt-4">
          <StarRow value={rating} onChange={setRating} />
        </div>
        <textarea
          className="mt-4 w-full min-h-[96px] rounded-xl border border-slate-200 p-3 text-sm"
          placeholder={t(lang, "farm.review.bodyPlaceholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
        />
        {localError || error ? (
          <p className="mt-2 text-sm text-red-600">{localError || error}</p>
        ) : null}
        <DialogActions>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full disabled:opacity-60"
          >
            {t(lang, "common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="flex-1 py-2.5 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] disabled:opacity-60"
          >
            {busy ? t(lang, "farm.review.submitting") : t(lang, "farm.review.submit")}
          </button>
        </DialogActions>
      </div>
    </div>
  );
}
