import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import {
  breederCardSpecialtyLabel,
  getBreederCardMetrics,
} from "@/lib/breederCardMetrics";
import { DEFAULT_BREEDER_COVER_PATH } from "@/lib/breederProfileImages";
import { t } from "@/i18n";

const FALLBACK_COVER = DEFAULT_BREEDER_COVER_PATH;

export function BreederDirectoryCard({
  breeder,
  lang,
}: {
  breeder: BreederProfile;
  lang: Lang;
}) {
  const cover = breeder.coverUrl || FALLBACK_COVER;
  const card = getBreederCardMetrics(breeder);

  return (
    <article className="group bg-white rounded-2xl border border-[#F3E2C8] overflow-hidden hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="relative h-32 bg-amber-50/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E19]/35 via-transparent to-transparent" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="absolute -bottom-7 left-4 w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
        />
      </div>

      <div className="pt-9 px-4 pb-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-[#050505] leading-snug truncate tracking-tight [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif]">
          {breeder.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 truncate">
          {breeder.location
            ? `📍 ${breeder.location}`
            : lang === "VI"
              ? "📍 Việt Nam"
              : "📍 Vietnam"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F8EEDD] text-[#6E5A51] text-[11px] font-medium border border-[#F3E2C8] line-clamp-1 max-w-full">
            {breederCardSpecialtyLabel(breeder, lang)}
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2B1E19]/75">
            <span>
              {card.rating != null && card.reviewCount > 0 ? (
                <>
                  ⭐ {card.rating.toFixed(1)}{" "}
                  <span className="text-[#6E5A51]">
                    ({card.reviewCount} {t(lang, "breeders.card.reviews")})
                  </span>
                </>
              ) : (
                <>⭐ {t(lang, "farm.trust.ratingEmpty")}</>
              )}
            </span>
            {card.showSold ? (
              <span>
                {card.petsRehomed} {t(lang, "breeders.card.sold")}
              </span>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-[#6E5A51] mb-1">
              <span>{t(lang, "breeders.card.trustIndex")}</span>
              <span className="font-semibold text-[#B45309]">
                {card.trustScore}/100
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F3E2C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D97706] transition-all"
                style={{ width: `${card.trustScore}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={`/app/breeders/${breeder.id}`}
          className="mt-5 block w-full text-center py-2.5 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60"
        >
          {t(lang, "breeders.card.cta")}
        </Link>
      </div>
    </article>
  );
}
