"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import {
  isPendingBreederTransparencyWarning,
  transparencyWarningBody,
  transparencyWarningTitle,
  type TransparencyWarning,
} from "@/lib/transparencyWarnings";

export function TransparencyWarningModal({ lang }: { lang: Lang }) {
  const [warning, setWarning] = useState<TransparencyWarning | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/breeder/transparency-warning", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setWarning(json.data ?? null);
    } catch {
      // Silent — gate is best-effort.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isPendingBreederTransparencyWarning(warning) && !doneMessage) return null;

  const act = async (kind: "confirm" | "appeal") => {
    if (!warning?.id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/breeder/transparency-warning/${encodeURIComponent(warning.id)}/${kind}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t(lang, "common.error"));
      setWarning(null);
      setDoneMessage(
        kind === "confirm"
          ? t(lang, "transparencyWarning.confirmed")
          : t(lang, "transparencyWarning.appealed"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusy(false);
    }
  };

  if (doneMessage) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-[#E8DFD0] p-5 shadow-xl">
          <p className="text-sm text-[#2B1E19]">{doneMessage}</p>
          <button
            type="button"
            className="mt-4 w-full py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold"
            onClick={() => setDoneMessage("")}
          >
            {t(lang, "common.ok")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white border border-red-200 p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="transparency-warning-title"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
          {t(lang, "transparencyWarning.badge")}
        </p>
        <h2
          id="transparency-warning-title"
          className="mt-2 text-base font-bold text-[#2B1E19]"
        >
          {transparencyWarningTitle(lang, warning!.score_at_trigger)}
        </h2>
        <p className="mt-2 text-sm text-[#6E5A51] leading-relaxed">
          {transparencyWarningBody(lang)}
        </p>
        {error ? (
          <p className="mt-3 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("confirm")}
            className="w-full py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {t(lang, "transparencyWarning.confirm")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("appeal")}
            className="w-full py-2.5 rounded-full border border-[#E8DFD0] text-sm font-semibold text-[#5C4A3A] disabled:opacity-60"
          >
            {t(lang, "transparencyWarning.appeal")}
          </button>
        </div>
      </div>
    </div>
  );
}
