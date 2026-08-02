import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders, listPublicPosts } from "@/lib/api/public";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { AppDownloadBanner } from "@/components/marketplace/AppDownloadBanner";
import { SiteFooter } from "@/components/marketplace/SiteFooter";
import { VerifiedBadge } from "@/components/marketplace/Badges";

export default async function HomePage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  let listings: Awaited<ReturnType<typeof listPublicPosts>>["listings"] = [];
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  try {
    const [postsPage, breedersPage] = await Promise.all([
      listPublicPosts({ limit: 6 }),
      listPublicBreeders({ limit: 4 }),
    ]);
    listings = postsPage.listings;
    breeders = breedersPage;
  } catch {
    // API may be offline during local build/dev
  }

  return (
    <div className="min-h-screen">
      <section className="relative bg-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 50%, #dbeafe 0%, transparent 60%), radial-gradient(circle at 20% 80%, #ede9fe 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-5 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#1E6FE8] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-[#1E6FE8] rounded-full animate-pulse" />
              {t(lang, "landing.badge")}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-5">
              {lang === "VI" ? (
                <>
                  {t(lang, "landing.hero.line1")}
                  <br />
                  <span className="text-[#1E6FE8]">
                    {t(lang, "landing.hero.line2")}
                  </span>
                  <br />
                  {t(lang, "landing.hero.line3")}
                </>
              ) : (
                <>
                  {t(lang, "landing.hero.line1")}
                  <br />
                  <span className="text-[#1E6FE8]">
                    {t(lang, "landing.hero.line2")}
                  </span>
                  <br />
                  {t(lang, "landing.hero.line3")}
                </>
              )}
            </h1>
            <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
              {t(lang, "landing.sub")}
            </p>
            <form
              action="/app/pet-feed"
              className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto lg:mx-0"
            >
              <div className="flex-1 relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="m11 11 2.5 2.5" strokeLinecap="round" />
                </svg>
                <input
                  name="q"
                  type="text"
                  placeholder={t(lang, "landing.searchPlaceholder")}
                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/30 focus:border-[#1E6FE8] shadow-sm transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full hover:bg-[#1D4ED8] transition-colors shadow-md shadow-blue-200 whitespace-nowrap"
              >
                {t(lang, "landing.search")}
              </button>
            </form>
            <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
              {[
                { q: "cat", label: "🐱 Mèo / Cat" },
                { q: "dog", label: "🐶 Chó / Dog" },
                { q: "bird", label: "🦜 Chim / Bird" },
              ].map((tag) => (
                <Link
                  key={tag.q}
                  href={`/app/pet-feed?species=${tag.q}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-[#1E6FE8] text-slate-600 text-xs font-medium rounded-full transition-colors"
                >
                  {tag.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex-1 relative w-full max-w-md lg:max-w-none">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden h-48 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=400&h=400&fit=crop&auto=format"
                    alt="British Shorthair"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden h-32 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=400&h=300&fit=crop&auto=format"
                    alt="Golden Retriever"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-3 mt-6">
                <div className="rounded-2xl overflow-hidden h-32 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=300&fit=crop&auto=format"
                    alt="Scottish Fold"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden h-48 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop&auto=format"
                    alt="Corgi"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">
          {t(lang, "landing.why")}
        </h2>
        <p className="text-slate-500 text-center mb-10 text-sm">
          {t(lang, "landing.whySub")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            [
              ["landing.value1.title", "landing.value1.desc", "📋"],
              ["landing.value2.title", "landing.value2.desc", "✅"],
              ["landing.value3.title", "landing.value3.desc", "💬"],
            ] as const
          ).map(([titleKey, descKey, icon]) => (
            <div
              key={titleKey}
              className="bg-white rounded-xl p-6 border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all"
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">
                {t(lang, titleKey)}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t(lang, descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {t(lang, "landing.latest")}
          </h2>
          <Link
            href="/app/pet-feed"
            className="text-sm text-[#1E6FE8] font-medium hover:text-[#1D4ED8] transition-colors"
          >
            {t(lang, "landing.viewAll")}
          </Link>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((l) => (
              <ListingCard key={l.id} listing={l} lang={lang} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            {t(lang, "feed.empty")}
          </p>
        )}
      </section>

      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {t(lang, "landing.featuredBreeders")}
          </h2>
          <Link
            href="/app/breeders"
            className="text-sm text-[#1E6FE8] font-medium hover:text-[#1D4ED8] transition-colors"
          >
            {t(lang, "landing.viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {breeders.map((b) => (
            <Link
              key={b.id}
              href={`/app/breeders/${b.id}`}
              className="bg-white rounded-xl border border-slate-100 p-4 text-left hover:shadow-sm hover:border-blue-100 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.avatar}
                  alt={b.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {b.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{b.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {b.verified && <VerifiedBadge size="xs" />}
                <span className="text-xs text-slate-400">
                  {b.trustScore}/100
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
        <AppDownloadBanner lang={lang} />
      </section>

      <section className="bg-white border-y border-slate-100">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {(
            [
              ["2,400+", "landing.stat.listings"],
              ["156+", "landing.stat.breeders"],
              ["63", "landing.stat.provinces"],
              ["12K+", "landing.stat.owners"],
            ] as const
          ).map(([num, key]) => (
            <div key={num}>
              <p className="text-3xl font-bold text-[#1E6FE8] mb-1">{num}</p>
              <p className="text-sm text-slate-500">{t(lang, key)}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
