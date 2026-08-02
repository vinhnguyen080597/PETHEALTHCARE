import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders } from "@/lib/api/public";
import { VerifiedBadge, TrustLevelChip } from "@/components/marketplace/Badges";
import { getTrustLevel } from "@/lib/types";

export const metadata = { title: "Breeders" };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeders.map((b) => {
          const trust = getTrustLevel(b.trustScore, b.verified);
          return (
            <Link
              key={b.id}
              href={`/app/breeders/${b.id}`}
              className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-sm hover:border-blue-100 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.avatar}
                  alt={b.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {b.name}
                    </h3>
                    {b.verified && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-xs text-slate-400">{b.location}</p>
                  <div className="mt-1">
                    <TrustLevelChip level={trust.level} label={trust.label} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {b.activeListings} {t(lang, "feed.activeListings")}
                </span>
                <span className="text-[#1E6FE8] font-medium">
                  {b.trustScore}/100
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {breeders.length === 0 && (
        <p className="text-center text-slate-400 py-16">
          {lang === "VI" ? "Chưa có breeder công khai" : "No public breeders yet"}
        </p>
      )}
    </div>
  );
}
