"use client";

import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function FarmReviewFromListingBadge({ lang }: { lang: Lang }) {
  return (
    <span
      tabIndex={0}
      className="group relative inline-flex cursor-help items-center gap-1 text-xs font-medium text-[#6E5A51] outline-none focus-visible:ring-2 focus-visible:ring-[#FED7AA] focus-visible:ring-offset-1 rounded"
    >
      <span>{t(lang, "farm.review.fromListingBadge")}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden w-max max-w-[260px] rounded-lg border border-[#F3E2C8] bg-white px-2.5 py-2 text-[11px] font-normal leading-snug text-[#6E5A51] shadow-md group-hover:block group-focus-within:block"
      >
        {t(lang, "farm.review.fromListingTooltip")}
      </span>
    </span>
  );
}
