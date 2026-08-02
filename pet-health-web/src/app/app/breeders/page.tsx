import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders } from "@/lib/api/public";
import {
  VerifiedBadge,
  TrustLevelChip,
  VerificationTierBadge,
} from "@/components/marketplace/Badges";
import { getTrustLevel } from "@/lib/types";

export const metadata = { title: "Breeders" };

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=800&h=320&fit=crop&auto=format";

export default async function BreedersPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  try {
    breeders = await listPublicBreeders({ limit: 48 });
  } catch {
    // offline
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {t(lang, "nav.breeders")}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {lang === "VI"
          ? "Danh bạ breeder đã xác minh"
          : "Verified breeder directory"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {breeders.map((b) => {
          const trust = getTrustLevel(b.trustScore, b.verified);
          const cover = b.coverUrl || FALLBACK_COVER;
          return (
            <Link
              key={b.id}
              href={`/app/breeders/${b.id}`}
              className="group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all"
            >
              <div className="relative h-24 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.avatar}
                  alt={b.name}
                  className="absolute -bottom-6 left-4 w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-white"
                />
              </div>
              <div className="pt-8 px-4 pb-4">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm truncate group-hover:text-[#1E6FE8] transition-colors">
                    {b.name}
                  </h3>
                  {b.verified && <VerifiedBadge size="xs" />}
                </div>
                <p className="text-xs text-slate-400 mb-2 truncate">
                  {b.location}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <VerificationTierBadge
                    tier={b.verificationTier}
                    lang={lang}
                    size="xs"
                  />
                  <TrustLevelChip level={trust.level} label={trust.label} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {b.activeListings} {t(lang, "feed.activeListings")}
                  </span>
                  <span className="text-[#1E6FE8] font-medium">
                    {b.trustScore}/100
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {breeders.length === 0 && (
        <p className="text-center text-slate-400 py-16">
          {lang === "VI"
            ? "Chưa có breeder công khai"
            : "No public breeders yet"}
        </p>
      )}
    </div>
  );
}
