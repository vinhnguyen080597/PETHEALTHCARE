import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { BRAND_AVATAR_PATH, BRAND_NAME } from "@/lib/brand";
import { BrandWordmark } from "@/components/BrandWordmark";
import { AppDownloadBanner } from "@/components/marketplace/AppDownloadBanner";

const STATS = [
  ["2,400+", "landing.stat.listings"],
  ["156+", "landing.stat.breeders"],
  ["34", "landing.stat.provinces"],
  ["12K+", "landing.stat.owners"],
] as const;

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <div>
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pt-12 pb-16">
        <AppDownloadBanner lang={lang} />
      </section>

      <footer className="bg-[#1C1917] text-white">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map(([num, key]) => (
            <div key={num}>
              <p className="font-display text-3xl font-semibold text-amber-300 mb-1">
                {num}
              </p>
              <p className="text-sm text-stone-400">{t(lang, key)}</p>
            </div>
          ))}
        </div>

        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_AVATAR_PATH}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <BrandWordmark text={t(lang, "nav.brand")} tone="onDark" />
              </div>
              <p className="text-stone-400 text-sm leading-relaxed max-w-xs">
                {t(lang, "landing.footer.blurb")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3 text-stone-300">
                Marketplace
              </p>
              <div className="space-y-2">
                <Link
                  href="/app/news"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "nav.news")}
                </Link>
                <Link
                  href="/app/pet-feed"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "landing.footer.browse")}
                </Link>
                <Link
                  href="/app/breeders"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "nav.breeders")}
                </Link>
                <Link
                  href="/app/support"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "nav.support")}
                </Link>
                <Link
                  href="/app/account/listings/new"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "landing.footer.create")}
                </Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3 text-stone-300">
                {t(lang, "landing.footer.legal")}
              </p>
              <div className="space-y-2">
                <Link
                  href="/privacy-policy"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "legal.privacy")}
                </Link>
                <Link
                  href="/terms-of-service"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "legal.terms")}
                </Link>
                <Link
                  href="/marketplace-guidelines"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "legal.guidelines")}
                </Link>
                <Link
                  href="/app/support"
                  className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
                >
                  {t(lang, "legal.support")}
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <p>© 2026 {BRAND_NAME}</p>
            <p>{t(lang, "landing.footer.disclaimer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
