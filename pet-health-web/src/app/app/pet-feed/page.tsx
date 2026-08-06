import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicPosts } from "@/lib/api/public";
import { FeedView } from "@/components/marketplace/FeedView";
import { DisclaimerBanner } from "@/components/marketplace/DisclaimerBanner";
import { ListingGridSkeleton } from "@/components/ui/Skeleton";
import type { Lang } from "@/lib/types";

export const metadata = {
  title: "Browse listings",
};

export const revalidate = 30;

async function PetFeedListings({
  lang,
  initialSpecies,
  initialQ,
  initialProvince,
}: {
  lang: Lang;
  initialSpecies: string;
  initialQ: string;
  initialProvince: string;
}) {
  let listings: Awaited<ReturnType<typeof listPublicPosts>>["listings"] = [];
  let loadError = "";
  try {
    const postsPage = await listPublicPosts({ limit: 48 });
    listings = postsPage.listings;
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : t(lang, "feed.loadError");
  }

  return (
    <>
      {loadError ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(lang, "feed.loadError")}: {loadError}
        </div>
      ) : null}
      <FeedView
        lang={lang}
        listings={listings}
        initialSpecies={initialSpecies}
        initialQ={initialQ}
        initialProvince={initialProvince}
        hideDisclaimer
      />
    </>
  );
}

export default async function PetFeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    species?: string;
    province?: string;
  }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
        <div className="mb-5">
          <DisclaimerBanner lang={lang} />
        </div>
        <Suspense fallback={<ListingGridSkeleton count={9} />}>
          <PetFeedListings
            lang={lang}
            initialSpecies={sp.species || "all"}
            initialQ={sp.q || ""}
            initialProvince={sp.province || ""}
          />
        </Suspense>
      </div>
    </div>
  );
}
