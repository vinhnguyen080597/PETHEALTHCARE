import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function DisclaimerBanner({ lang }: { lang: Lang }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed">
      <span className="font-semibold mr-1">⚠</span>
      {t(lang, "feed.disclaimer")}
      <Link
        href="/marketplace-guidelines"
        className="underline font-medium hover:text-amber-800 transition-colors"
      >
        {t(lang, "feed.guidelines")}
      </Link>
      {t(lang, "feed.disclaimerEnd")}
    </div>
  );
}
