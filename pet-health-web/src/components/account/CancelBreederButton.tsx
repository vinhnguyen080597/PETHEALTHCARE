"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function CancelBreederButton({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCancel = async () => {
    if (
      !window.confirm(
        `${t(lang, "account.senIntro.cancelTitle")}\n\n${t(lang, "account.senIntro.cancelBody")}`,
      )
    ) {
      return;
    }
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
        onClick={() => void onCancel()}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
      >
        {busy
          ? t(lang, "common.loading")
          : t(lang, "account.senIntro.cancelCta")}
      </button>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
