import Link from "next/link";
import type { BreederProfile, Lang } from "@/lib/types";
import { t } from "@/i18n";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&h=400&fit=crop&auto=format";

function ratingFromTrust(score: number): string {
  const clamped = Math.min(100, Math.max(0, score || 0));
  return (Math.round((clamped / 20) * 10) / 10).toFixed(1);
}

function reviewCountFromTrust(score: number): number {
  return Math.max(5, Math.round((score || 0) * 0.4));
}

function soldEstimate(breeder: BreederProfile): number {
  // Soft display metric until sold-count ships on public API
  return Math.max(
    breeder.activeListings,
    Math.round((breeder.trustScore || 0) / 2),
  );
}

function speciesEmoji(species: string[]): string {
  if (species.includes("dog")) return "🐶";
  if (species.includes("bird")) return "🦜";
  return "🐱";
}

function specialtyLabel(breeder: BreederProfile, lang: Lang): string {
  const breeds = breeder.mainBreeds.filter(Boolean).slice(0, 2);
  if (breeds.length > 0) {
    return `${speciesEmoji(breeder.primarySpecies)} ${
      lang === "VI" ? "Chuyên" : "Specialty"
    }: ${breeds.join(" • ")}`;
  }
  const species = breeder.primarySpecies
    .map((s) =>
      s === "cat"
        ? lang === "VI"
          ? "Mèo"
          : "Cat"
        : s === "dog"
          ? lang === "VI"
            ? "Chó"
            : "Dog"
          : s,
    )
    .filter(Boolean);
  if (species.length) {
    return `${speciesEmoji(breeder.primarySpecies)} ${
      lang === "VI" ? "Chuyên" : "Specialty"
    }: ${species.join(" • ")}`;
  }
  return lang === "VI" ? "🐱 Chuyên: Thú cưng" : "🐱 Specialty: Pets";
}

export function BreederDirectoryCard({
  breeder,
  lang,
}: {
  breeder: BreederProfile;
  lang: Lang;
}) {
  const cover = breeder.coverUrl || FALLBACK_COVER;
  const rating = ratingFromTrust(breeder.trustScore);
  const reviews = reviewCountFromTrust(breeder.trustScore);
  const sold = soldEstimate(breeder);
  const showEscrowBadge =
    breeder.verified || breeder.verificationTier >= 2;
  const trustPct = Math.min(100, Math.max(0, breeder.trustScore || 0));

  return (
    <article className="group bg-white rounded-2xl border border-[#F3E2C8] overflow-hidden hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="relative h-32 bg-amber-50/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E19]/35 via-transparent to-transparent" />
        {showEscrowBadge ? (
          <span className="absolute top-3 right-3 z-10 bg-[#FEF3C7] text-[#B45309] text-[10px] font-semibold px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
            🛡️ {t(lang, "breeders.card.escrowBadge")}
          </span>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="absolute -bottom-7 left-4 w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
        />
      </div>

      <div className="pt-9 px-4 pb-4 flex flex-col flex-1">
        <h3 className="font-bold text-[#2B1E19] text-lg leading-snug truncate">
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
            {specialtyLabel(breeder, lang)}
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#2B1E19]/75">
            <span>
              ⭐ {rating}{" "}
              <span className="text-[#6E5A51]">
                ({reviews} {t(lang, "breeders.card.reviews")})
              </span>
            </span>
            <span>
              {sold} {t(lang, "breeders.card.sold")}
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-[#6E5A51] mb-1">
              <span>{t(lang, "breeders.card.trustIndex")}</span>
              <span className="font-semibold text-[#B45309]">
                {trustPct}/100
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F3E2C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D97706] transition-all"
                style={{ width: `${trustPct}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={`/app/breeders/${breeder.id}`}
          className="mt-5 block w-full text-center py-2.5 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60"
        >
          {t(lang, "breeders.card.cta")} ({breeder.activeListings}{" "}
          {t(lang, "breeders.card.ctaListings")})
        </Link>
      </div>
    </article>
  );
}
