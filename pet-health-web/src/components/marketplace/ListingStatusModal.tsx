"use client";

import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import { DialogActions } from "@/components/ui/DialogActions";
import {
  LISTING_STATUS_CHOICES,
  listingStatusChoiceI18nKey,
  validateListingStatusPayload,
  type ListingStatusChoice,
  type SaleChannelChoice,
} from "@/lib/listingAvailabilityBadge";

export function ListingStatusModal({
  lang,
  open,
  currentStatus,
  busy = false,
  error = "",
  onClose,
  onSubmit,
}: {
  lang: Lang;
  open: boolean;
  currentStatus: string;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: {
    status: ListingStatusChoice;
    saleChannel?: SaleChannelChoice;
    buyerEmail?: string;
  }) => void;
}) {
  const [status, setStatus] = useState<ListingStatusChoice>(
    (LISTING_STATUS_CHOICES.includes(currentStatus as ListingStatusChoice)
      ? currentStatus
      : "published") as ListingStatusChoice,
  );
  const [saleChannel, setSaleChannel] = useState<SaleChannelChoice>("on_platform");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [localError, setLocalError] = useState("");

  if (!open) return null;

  const submit = () => {
    const err = validateListingStatusPayload({
      status,
      saleChannel: status === "sold" ? saleChannel : undefined,
    });
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError("");
    onSubmit({
      status,
      saleChannel: status === "sold" ? saleChannel : undefined,
      buyerEmail: status === "sold" && saleChannel === "on_platform" ? buyerEmail.trim() : undefined,
    });
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
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-slate-900">{t(lang, "listing.statusModal.title")}</h2>
        <div className="mt-4 space-y-2">
          {LISTING_STATUS_CHOICES.map((choice) => (
            <label
              key={choice}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer"
            >
              <input
                type="radio"
                name="listing-status"
                checked={status === choice}
                onChange={() => setStatus(choice)}
              />
              <span className="text-sm font-medium text-slate-800">
                {t(lang, listingStatusChoiceI18nKey(choice))}
              </span>
            </label>
          ))}
        </div>
        {status === "sold" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {t(lang, "listing.statusModal.saleChannel")}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sale-channel"
                checked={saleChannel === "on_platform"}
                onChange={() => setSaleChannel("on_platform")}
              />
              {t(lang, "listing.statusModal.onPlatform")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sale-channel"
                checked={saleChannel === "off_platform"}
                onChange={() => setSaleChannel("off_platform")}
              />
              {t(lang, "listing.statusModal.offPlatform")}
            </label>
            {saleChannel === "on_platform" ? (
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={t(lang, "listing.statusModal.buyerEmailOptional")}
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
            ) : null}
          </div>
        ) : null}
        {localError || error ? (
          <p className="mt-3 text-sm text-red-600">{localError || error}</p>
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
            {busy ? t(lang, "listing.statusModal.saving") : t(lang, "listing.statusModal.save")}
          </button>
        </DialogActions>
      </div>
    </div>
  );
}
