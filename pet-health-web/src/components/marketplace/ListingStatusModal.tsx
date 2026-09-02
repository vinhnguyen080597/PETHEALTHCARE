"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import {
  listingStatusChoiceI18nKey,
  type SaleChannelChoice,
} from "@/lib/listingAvailabilityBadge";
import {
  listingStatusChoicesExcludingCurrent,
  type ListingStatusChoice,
} from "@/lib/listingStatusChoices";

export type ListingStatusSubmitPayload =
  | { type: "published" | "deposit_hold" }
  | {
      type: "sold";
      saleChannel: SaleChannelChoice;
      buyerEmail?: string;
    };

type Step = "choose" | "sold";

type ChoiceVisual = {
  icon: React.ReactNode;
  iconBg: string;
};

function StatusIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

const CHOICE_VISUALS: Record<ListingStatusChoice, ChoiceVisual> = {
  published: {
    iconBg: "bg-emerald-50",
    icon: (
      <StatusIcon className="bg-emerald-50 text-emerald-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </StatusIcon>
    ),
  },
  deposit_hold: {
    iconBg: "bg-amber-50",
    icon: (
      <StatusIcon className="bg-amber-50 text-amber-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4v16M18 4v16M6 12h12" strokeLinecap="round" />
        </svg>
      </StatusIcon>
    ),
  },
  sold: {
    iconBg: "bg-slate-100",
    icon: (
      <StatusIcon className="bg-slate-100 text-slate-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8h15l-1.5 9H7.5L6 8Z" strokeLinejoin="round" />
          <path d="M6 8 5 4H2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </StatusIcon>
    ),
  },
};

const SALE_CHANNEL_VISUALS: Record<
  SaleChannelChoice,
  ChoiceVisual
> = {
  on_platform: {
    iconBg: "bg-orange-50",
    icon: (
      <StatusIcon className="bg-orange-50 text-orange-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
          <path d="M3 9l2-5h14l2 5" strokeLinejoin="round" />
        </svg>
      </StatusIcon>
    ),
  },
  off_platform: {
    iconBg: "bg-slate-100",
    icon: (
      <StatusIcon className="bg-slate-100 text-slate-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round" />
        </svg>
      </StatusIcon>
    ),
  },
};

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
  onSubmit: (payload: ListingStatusSubmitPayload) => void | Promise<void>;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [saleChannel, setSaleChannel] = useState<SaleChannelChoice | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");

  const choices = useMemo(
    () => listingStatusChoicesExcludingCurrent(currentStatus),
    [currentStatus],
  );

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setSaleChannel(null);
    setBuyerEmail("");
  }, [open, currentStatus]);

  if (!open) return null;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleChooseStatus = (choice: ListingStatusChoice) => {
    if (busy) return;
    if (choice === "sold") {
      setStep("sold");
      return;
    }
    void onSubmit({ type: choice });
  };

  const handleConfirmSold = () => {
    if (busy || !saleChannel) return;
    void onSubmit({
      type: "sold",
      saleChannel,
      buyerEmail:
        saleChannel === "on_platform" ? buyerEmail.trim() || undefined : undefined,
    });
  };

  const title =
    step === "choose"
      ? t(lang, "listing.statusModal.title")
      : t(lang, "listing.statusModal.saleChannel");

  const subtitle =
    step === "choose"
      ? t(lang, "listing.statusModal.subtitle")
      : t(lang, "listing.statusModal.saleChannelHint");

  return (
    <div
      className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-6`}
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {step === "sold" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("choose");
                  setSaleChannel(null);
                  setBuyerEmail("");
                }}
                className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t(lang, "common.back")}
              </button>
            ) : null}
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            aria-label={t(lang, "common.cancel")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {step === "choose" ? (
          <div className="mt-4 space-y-2.5">
            {choices.map((choice) => {
              const visual = CHOICE_VISUALS[choice];
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={busy}
                  onClick={() => handleChooseStatus(choice)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {visual.icon}
                  <span className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                    {t(lang, listingStatusChoiceI18nKey(choice))}
                  </span>
                  {choice === "sold" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2">
                      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {(["on_platform", "off_platform"] as const).map((channel) => {
              const visual = SALE_CHANNEL_VISUALS[channel];
              const selected = saleChannel === channel;
              return (
                <button
                  key={channel}
                  type="button"
                  disabled={busy}
                  onClick={() => setSaleChannel(channel)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
                    selected
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  {visual.icon}
                  <span className="min-w-0 flex-1 text-base font-semibold text-slate-900">
                    {t(
                      lang,
                      channel === "on_platform"
                        ? "listing.statusModal.onPlatform"
                        : "listing.statusModal.offPlatform",
                    )}
                  </span>
                  {selected ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12.5 2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
              );
            })}

            {saleChannel === "on_platform" ? (
              <div className="mt-1 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {t(lang, "listing.statusModal.buyerEmailOptional")}
                </p>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                  placeholder={t(lang, "listing.statusModal.buyerEmailPlaceholder")}
                  value={buyerEmail}
                  disabled={busy}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {step === "choose" && busy ? (
          <div className="mt-4 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
          </div>
        ) : null}

        {step === "sold" ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {t(lang, "common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || !saleChannel}
              onClick={handleConfirmSold}
              className="flex-1 rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309] disabled:opacity-60"
            >
              {busy ? t(lang, "listing.statusModal.saving") : t(lang, "listing.statusModal.update")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="mt-4 w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60"
          >
            {t(lang, "common.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
