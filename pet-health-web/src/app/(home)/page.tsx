import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listPublicBreeders, listPublicPosts } from "@/lib/api/public";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { AppDownloadBanner } from "@/components/marketplace/AppDownloadBanner";
import { SiteFooter } from "@/components/marketplace/SiteFooter";
import { VerifiedBadge } from "@/components/marketplace/Badges";
import { HomeValueProps } from "@/components/marketplace/HomeValueProps";
import { HomeSearchSection } from "@/components/marketplace/HomeSearchSection";
import { HomeGuestGate } from "@/components/marketplace/HomeGuestGate";
import {
  HomeBreederRowSkeleton,
  ListingGridSkeleton,
} from "@/components/ui/Skeleton";
import type { Lang } from "@/lib/types";

const HERO_IMAGES = [
  {
    src: "/images/hero-cat.jpg?v=4",
    alt: "Golden kitten",
    // Was 3/2; +15% height total → 3/2.3
    className: "col-span-2 aspect-[30/23]",
  },
  {
    src: "/images/hero-dog.jpg?v=4",
    alt: "Golden Retriever",
    // Was square; −15% height total → 20/17
    className: "aspect-[20/17] hero-float",
  },
  {
    src: "/images/hero-pig.jpg",
    alt: "Piglet",
    className: "aspect-[20/17]",
  },
] as const;

async function HomeLatestListings({ lang }: { lang: Lang }) {
  let listings: Awaited<ReturnType<typeof listPublicPosts>>["listings"] = [];
  try {
    const postsPage = await listPublicPosts({ limit: 6 });
    listings = postsPage.listings;
  } catch {
    // API may be offline
  }

  if (listings.length === 0) {
    return (
      <p className="text-sm text-stone-400 text-center py-8">
        {t(lang, "feed.empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.slice(0, 3).map((l) => (
        <ListingCard key={l.id} listing={l} lang={lang} />
      ))}
    </div>
  );
}

async function HomeFeaturedBreeders({ lang }: { lang: Lang }) {
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  try {
    breeders = await listPublicBreeders({ limit: 4 });
  } catch {
    // API may be offline
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {breeders.map((b) => (
        <Link
          key={b.id}
          href={`/app/breeders/${b.id}`}
          className="bg-white/80 rounded-2xl border border-[#F0E6D8] p-4 text-left hover:shadow-[0_10px_30px_-18px_rgba(180,83,9,0.35)] hover:border-amber-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.avatar}
              alt={b.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-50"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">
                {b.name}
              </p>
              <p className="text-xs text-stone-400 truncate">{b.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {b.verified && <VerifiedBadge size="xs" />}
            <span className="text-xs text-stone-400">{b.trustScore}/100</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();
  const requireLogin = !session.isLoggedIn;

  return (
    <HomeGuestGate isLoggedIn={session.isLoggedIn}>
      <div className="min-h-screen bg-[#FDFBF7]">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(ellipse 70% 55% at 78% 28%, rgba(217,119,6,0.18) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 12% 80%, rgba(245,158,11,0.10) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 40% 10%, rgba(253,230,138,0.35) 0%, transparent 60%)",
            }}
          />
          <div className="relative max-w-[1200px] mx-auto px-5 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="hero-rise inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-xs font-semibold tracking-wide px-3.5 py-1.5 rounded-full mb-6 border border-amber-100">
                {t(lang, "landing.badge")}
              </p>
              <h1 className="hero-rise hero-rise-delay-1 font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold text-stone-900 leading-[1.12] tracking-tight mb-5">
                {t(lang, "landing.hero.line1")}{" "}
                <span className="text-[#D97706]">
                  {t(lang, "landing.hero.line2")}
                </span>
                <br />
                <span className="text-stone-700 font-medium text-[0.92em]">
                  {t(lang, "landing.hero.line3")}
                </span>
              </h1>
              <p className="hero-rise hero-rise-delay-2 text-stone-500 text-base lg:text-lg mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                {t(lang, "landing.sub")}
              </p>

              <HomeSearchSection lang={lang} requireLogin={requireLogin} />
            </div>

            <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
              <div
                className="absolute -inset-6 rounded-[2rem] opacity-70 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(217,119,6,0.28), transparent 65%)",
                }}
                aria-hidden
              />
              <div className="relative grid grid-cols-2 gap-3">
                {HERO_IMAGES.map((img) => (
                  <div
                    key={img.src}
                    className={`relative overflow-hidden rounded-[1.35rem] bg-amber-50/40 ${img.className}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      decoding="async"
                      loading="eager"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <HomeValueProps lang={lang} />

        <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl lg:text-2xl font-semibold text-[#2B1E19] tracking-tight">
              {t(lang, "landing.latest")}
            </h2>
            <Link
              href="/app/pet-feed"
              className="text-sm text-[#D97706] font-medium hover:text-[#B45309] transition-colors"
            >
              {t(lang, "landing.viewAll")}
            </Link>
          </div>
          <Suspense fallback={<ListingGridSkeleton count={3} />}>
            <HomeLatestListings lang={lang} />
          </Suspense>
        </section>

        <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl lg:text-2xl font-semibold text-stone-900 tracking-tight">
              {t(lang, "landing.featuredBreeders")}
            </h2>
            <Link
              href="/app/breeders"
              className="text-sm text-amber-800 font-medium hover:text-[#B45309] transition-colors"
            >
              {t(lang, "landing.viewAll")}
            </Link>
          </div>
          <Suspense fallback={<HomeBreederRowSkeleton />}>
            <HomeFeaturedBreeders lang={lang} />
          </Suspense>
        </section>

        <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pb-16">
          <AppDownloadBanner lang={lang} />
        </section>

        <section className="bg-[#1C1917] text-white">
          <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {(
              [
                ["2,400+", "landing.stat.listings"],
                ["156+", "landing.stat.breeders"],
                ["63", "landing.stat.provinces"],
                ["12K+", "landing.stat.owners"],
              ] as const
            ).map(([num, key]) => (
              <div key={num}>
                <p className="font-display text-3xl font-semibold text-amber-300 mb-1">
                  {num}
                </p>
                <p className="text-sm text-stone-400">{t(lang, key)}</p>
              </div>
            ))}
          </div>
        </section>

        <SiteFooter lang={lang} />
      </div>
    </HomeGuestGate>
  );
}
