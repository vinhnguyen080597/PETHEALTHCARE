"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

/** Add new locales here when ready (code must match `Lang` + i18n catalogs). */
export const SUPPORTED_LANGUAGES: {
  code: Lang;
  label: string;
  nativeLabel: string;
}[] = [
  { code: "VI", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "EN", label: "English", nativeLabel: "English" },
];

export function LanguageSwitcher({
  lang,
  compact = false,
}: {
  lang: Lang;
  /** Tighter trigger for mobile menu rows */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const setLang = async (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    router.refresh();
  };

  return (
    <div ref={rootRef} className={`relative ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t(lang, "nav.language")}
        className={
          compact
            ? "w-full flex items-center justify-between gap-2 pl-3 pr-3.5 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
            : "flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold text-stone-500 hover:bg-amber-50 hover:text-stone-900 transition-colors border border-[#F0E6D8]"
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
          </svg>
          {compact ? t(lang, "nav.language") : current.code}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t(lang, "nav.language")}
          className={`absolute z-50 mt-1.5 min-w-[11rem] rounded-xl border border-[#F0E6D8] bg-white py-1 shadow-[0_12px_32px_-16px_rgba(43,30,25,0.35)] ${
            compact ? "left-0 right-0" : "right-0"
          }`}
        >
          {SUPPORTED_LANGUAGES.map((item) => {
            const selected = item.code === lang;
            return (
              <li key={item.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => setLang(item.code)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 transition-colors ${
                    selected
                      ? "bg-amber-50 text-amber-900 font-medium"
                      : "text-stone-700 hover:bg-amber-50/70"
                  }`}
                >
                  <span>
                    <span className="block leading-tight">{item.nativeLabel}</span>
                    <span className="block text-[11px] text-stone-400 font-normal">
                      {item.label}
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-stone-400">
                    {item.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
