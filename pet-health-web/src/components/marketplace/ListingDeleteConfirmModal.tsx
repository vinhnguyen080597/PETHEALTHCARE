"use client";

import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import { DialogActions } from "@/components/ui/DialogActions";

export function ListingDeleteConfirmModal({
  lang,
  open,
  mode = "confirm",
  blockedMessage = "",
  busy = false,
  onCancel,
  onConfirm,
}: {
  lang: Lang;
  open: boolean;
  mode?: "confirm" | "blocked";
  blockedMessage?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const blocked = mode === "blocked";
  return (
    <div
      className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-delete-confirm-title"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="listing-delete-confirm-title"
          className="font-bold text-slate-900"
        >
          {t(
            lang,
            blocked ? "detail.deleteBlockedTitle" : "detail.deleteConfirmTitle",
          )}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {blocked
            ? blockedMessage
            : t(lang, "detail.deleteConfirmBody")}
        </p>
        {blocked ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 w-full py-2.5 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309]"
          >
            {t(lang, "detail.deleteBlockedOk")}
          </button>
        ) : (
          <DialogActions>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full disabled:opacity-60"
            >
              {t(lang, "common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? t(lang, "detail.deleting") : t(lang, "detail.delete")}
            </button>
          </DialogActions>
        )}
      </div>
    </div>
  );
}
