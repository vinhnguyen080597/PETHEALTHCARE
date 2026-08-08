import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { BRAND_AVATAR_PATH } from "@/lib/brand";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="bg-[#1C1917] text-white">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-12">
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
              <span className="font-bold text-sm">{t(lang, "nav.brand")}</span>
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
                href="/support"
                className="block text-stone-400 text-sm hover:text-amber-200 transition-colors"
              >
                {t(lang, "legal.support")}
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© 2026 Pet Marketplace · pet-marketplace.org</p>
          <p>{t(lang, "landing.footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
