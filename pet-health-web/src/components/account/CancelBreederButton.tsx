"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function CancelBreederButton({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const confirmCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/breeder/cancel", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || t(lang, "account.senIntro.cancelFailed"));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t(lang, "account.senIntro.cancelFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 min-w-[150px]">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
      >
        {t(lang, "account.senIntro.cancelCta")}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/45 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-breeder-title"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#F0E6D8] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="cancel-breeder-title"
              className="text-base font-bold text-[#2B1E19]"
            >
              {t(lang, "account.senIntro.cancelTitle")}
            </h2>
            <p className="mt-2 text-sm text-[#5C4A3A] leading-relaxed">
              {t(lang, "account.senIntro.cancelBody")}
            </p>
            {error ? (
              <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className="flex-1 rounded-xl border border-[#F0E6D8] bg-white py-2.5 text-sm font-semibold text-[#2B1E19] hover:bg-[#FDFBF7] disabled:opacity-60"
              >
                {t(lang, "account.senIntro.cancelKeep")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmCancel()}
                className="flex-1 rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                {busy
                  ? t(lang, "common.loading")
                  : t(lang, "account.senIntro.cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
