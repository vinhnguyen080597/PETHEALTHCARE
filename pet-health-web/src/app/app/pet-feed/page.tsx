import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listPublicPosts } from "@/lib/api/public";
import { getFeatureFlags, listFeedPosts } from "@/lib/api/petFeed";
import { mapApiPosts } from "@/lib/mappers";
import { isExpiredAuthError } from "@/lib/sessionTokens";
import { FeedView } from "@/components/marketplace/FeedView";
import { DisclaimerBanner } from "@/components/marketplace/DisclaimerBanner";
import { LiveActivityTicker } from "@/components/marketplace/LiveActivityTicker";
import { ListingGridSkeleton } from "@/components/ui/Skeleton";
import type { Lang, Listing } from "@/lib/types";
import { MARKETPLACE_PAGE_SHELL_CLASS } from "@/lib/marketplaceLiveTicker";
import { resolveProvinceSelection } from "@/lib/vietnamProvinceSelection";
import { isMarketplaceEscrowEnabled } from "@/lib/featureFlags";

export const metadata = {
  title: "Browse listings",
};

/** Prefer auth feed when logged in so saved / is_favorited survives refresh. */
export const dynamic = "force-dynamic";

async function loadListings(lang: Lang): Promise<{
  listings: Listing[];
  loadError: string;
}> {
  try {
    const user = await getSessionUser();
    if (user.token) {
      try {
        const page = await listFeedPosts(user.token, { limit: 48 });
        return { listings: mapApiPosts(page.data || []), loadError: "" };
      } catch (err) {
        if (!isExpiredAuthError(err)) throw err;
      }
    }
    const postsPage = await listPublicPosts({ limit: 48 });
    return { listings: postsPage.listings, loadError: "" };
  } catch (err) {
    return {
      listings: [],
      loadError: err instanceof Error ? err.message : t(lang, "feed.loadError"),
    };
  }
}

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
  const { listings, loadError } = await loadListings(lang);
  let showEscrowUi = false;
  try {
    const user = await getSessionUser();
    if (user.token) {
      const flagsRes = await getFeatureFlags(user.token);
      showEscrowUi = isMarketplaceEscrowEnabled(flagsRes.data);
    }
  } catch {
    showEscrowUi = false;
  }

  return (
    <>
      <LiveActivityTicker
        lang={lang}
        listings={listings}
        showEscrowUi={showEscrowUi}
      />
      {loadError ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
          {t(lang, "feed.loadError")}: {loadError}
        </div>
      ) : null}
      <DisclaimerBanner lang={lang} className="mb-5" />
      <FeedView
        lang={lang}
        listings={listings}
        initialSpecies={initialSpecies}
        initialQ={initialQ}
        initialProvince={initialProvince}
        hideDisclaimer
        showEscrowUi={showEscrowUi}
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
      <div className={MARKETPLACE_PAGE_SHELL_CLASS}>
        <Suspense fallback={<ListingGridSkeleton count={9} />}>
          <PetFeedListings
            lang={lang}
            initialSpecies={sp.species || "all"}
            initialQ={sp.q || ""}
            initialProvince={resolveProvinceSelection(sp.province || "")}
          />
        </Suspense>
      </div>
    </div>
  );
}
