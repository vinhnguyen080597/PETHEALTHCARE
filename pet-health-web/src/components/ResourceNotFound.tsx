import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";

export function ResourceNotFound({
  lang,
  titleKey,
  bodyKey,
  primaryHref,
  primaryLabelKey,
  secondaryHref,
  secondaryLabelKey,
}: {
  lang: Lang;
  titleKey: EnKey;
  bodyKey: EnKey;
  primaryHref: string;
  primaryLabelKey: EnKey;
  secondaryHref?: string;
  secondaryLabelKey?: EnKey;
}) {
  return (
    <div className="min-h-[55vh] bg-[#FDFBF7] flex items-center">
      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#D97706] mb-3">
          404
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2B1E19] tracking-tight">
          {t(lang, titleKey)}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5C4A3A]">
          {t(lang, bodyKey)}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
          >
            {t(lang, primaryLabelKey)}
          </Link>
          {secondaryHref && secondaryLabelKey ? (
            <Link
              href={secondaryHref}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-[#F0E6D8] text-[#2B1E19] text-sm font-medium hover:bg-white"
            >
              {t(lang, secondaryLabelKey)}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
