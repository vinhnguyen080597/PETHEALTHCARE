import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders, listPublicPosts } from "@/lib/api/public";
import { BreederDirectoryView } from "@/components/marketplace/BreederDirectoryView";
import { BreederGridSkeleton } from "@/components/ui/Skeleton";
import { MARKETPLACE_PAGE_SHELL_CLASS } from "@/lib/marketplaceLiveTicker";
import type { Lang, Listing } from "@/lib/types";

export const metadata = { title: "Top Breeders" };

export const revalidate = 30;

async function BreedersGrid({ lang }: { lang: Lang }) {
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  let listings: Listing[] = [];
  let loadError = "";
  try {
    const [breederRows, postsPage] = await Promise.all([
      listPublicBreeders({ limit: 48 }),
      listPublicPosts({ limit: 48 }).catch(() => ({ listings: [] as Listing[] })),
    ]);
    breeders = breederRows;
    listings = postsPage.listings;
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : t(lang, "breeders.loadError");
  }

  return (
    <BreederDirectoryView
      breeders={breeders}
      lang={lang}
      loadError={loadError}
      listings={listings}
    />
  );
}

function BreedersHeaderSkeleton() {
  return <BreederGridSkeleton count={6} />;
}

export default async function BreedersPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className={MARKETPLACE_PAGE_SHELL_CLASS}>
        <Suspense fallback={<BreedersHeaderSkeleton />}>
          <BreedersGrid lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
