"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

const DISMISSED_KEY = "pet-marketplace:disclaimer-dismissed:v1";

export function DisclaimerBanner({
  lang,
  className = "",
}: {
  lang: Lang;
  className?: string;
}) {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSED_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Hide for this session even if storage fails.
    }
  };

  if (visible !== true) return null;

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl pl-4 pr-2 py-3 text-sm text-amber-900 leading-relaxed ${className}`}
    >
      <p className="min-w-0 flex-1 pr-1">
        <span className="font-semibold mr-1">⚠</span>
        {t(lang, "feed.disclaimer")}
        <Link
          href="/marketplace-guidelines"
          className="underline font-medium hover:text-amber-800 transition-colors"
        >
          {t(lang, "feed.guidelines")}
        </Link>
        {t(lang, "feed.disclaimerEnd")}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t(lang, "legal.dismissDisclaimer")}
        className="shrink-0 -mt-0.5 rounded-full p-1.5 text-amber-800/80 hover:bg-amber-100 hover:text-amber-950 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
