import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { BRAND_AVATAR_PATH, BRAND_NAME } from "@/lib/brand";
import { BrandWordmark } from "@/components/BrandWordmark";
import { AppDownloadBanner } from "@/components/marketplace/AppDownloadBanner";
import {
  LEGAL_COMPANY_PHONE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTERPRISE_CODE,
  LEGAL_MOIT_CONFIRMATION_URL,
  LEGAL_OPERATOR_NAME_ABBR,
  LEGAL_OPERATOR_NAME_EN,
  LEGAL_OPERATOR_NAME_VI,
  LEGAL_REGISTERED_ADDRESS_EN,
  LEGAL_REGISTERED_ADDRESS_VI,
  LEGAL_SUPPORT_EMAIL,
  isMoitBadgeLive,
} from "@/lib/legalContent";

const STATS = [
  ["2,400+", "landing.stat.listings"],
  ["156+", "landing.stat.breeders"],
  ["34", "landing.stat.provinces"],
  ["12K+", "landing.stat.owners"],
] as const;

function OperatorFooterBlock({ lang }: { lang: Lang }) {
  const companyName = lang === "EN" ? LEGAL_OPERATOR_NAME_EN : LEGAL_OPERATOR_NAME_VI;
  const address = lang === "EN" ? LEGAL_REGISTERED_ADDRESS_EN : LEGAL_REGISTERED_ADDRESS_VI;

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="flex items-center gap-2">
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
      <p className="text-stone-400 text-sm leading-relaxed max-w-md">
        {t(lang, "landing.footer.blurb")}
      </p>
      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4 text-left space-y-2 max-w-md">
        <p className="text-sm font-semibold text-stone-200">{t(lang, "legal.operatorTitle")}</p>
        <dl className="space-y-1.5 text-xs leading-5 text-stone-400">
          <div>
            <dt className="text-stone-500">{t(lang, "legal.operatorCompany")}</dt>
            <dd className="text-stone-300">
              {companyName} ({LEGAL_OPERATOR_NAME_ABBR})
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">{t(lang, "legal.operatorTaxCode")}</dt>
            <dd className="text-stone-300">{LEGAL_ENTERPRISE_CODE}</dd>
          </div>
          <div>
            <dt className="text-stone-500">{t(lang, "legal.operatorAddress")}</dt>
            <dd className="text-stone-300">{address}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              <dt className="text-stone-500">{t(lang, "legal.operatorHotline")}</dt>
              <dd>
                <a
                  className="text-amber-200/90 hover:text-amber-100 underline-offset-2 hover:underline"
                  href={`tel:${LEGAL_COMPANY_PHONE}`}
                >
                  {LEGAL_COMPANY_PHONE}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">{t(lang, "legal.operatorEmail")}</dt>
              <dd>
                <a
                  className="text-amber-200/90 hover:text-amber-100 underline-offset-2 hover:underline"
                  href={`mailto:${LEGAL_SUPPORT_EMAIL || LEGAL_CONTACT_EMAIL}`}
                >
                  {LEGAL_SUPPORT_EMAIL}
                </a>
              </dd>
            </div>
          </div>
        </dl>
        {isMoitBadgeLive() ? (
          <a
            href={LEGAL_MOIT_CONFIRMATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-3 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-950/40 px-3 py-2.5 transition-colors hover:border-emerald-400/70 hover:bg-emerald-950/70"
            aria-label={t(lang, "legal.moitBadgeA11y")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              BCT
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-emerald-100">
                {t(lang, "legal.moitBadgeTitle")}
              </span>
              <span className="block text-[11px] leading-4 text-emerald-200/70">
                {t(lang, "legal.moitBadgeHint")}
              </span>
            </span>
          </a>
        ) : (
          <div
            className="mt-3 rounded-lg border border-dashed border-stone-500/60 px-3 py-3 text-center"
            aria-label={t(lang, "legal.moitBadgeSlotA11y")}
          >
            <p className="text-[11px] leading-4 text-stone-400">
              {t(lang, "legal.moitBadgeSlot")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
            <OperatorFooterBlock lang={lang} />
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
