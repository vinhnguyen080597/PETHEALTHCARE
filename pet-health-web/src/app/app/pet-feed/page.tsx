import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicBreeders, listPublicPosts } from "@/lib/api/public";
import { FeedView } from "@/components/marketplace/FeedView";

export const metadata = {
  title: "Browse listings",
};

export default async function PetFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  let listings: Awaited<ReturnType<typeof listPublicPosts>>["listings"] = [];
  let breeders: Awaited<ReturnType<typeof listPublicBreeders>> = [];
  try {
    const [postsPage, breedersPage] = await Promise.all([
      listPublicPosts({ limit: 48 }),
      listPublicBreeders({ limit: 24 }),
    ]);
    listings = postsPage.listings;
    breeders = breedersPage;
  } catch {
    // offline API
  }

  return (
    <FeedView
      lang={lang}
      listings={listings}
      breeders={breeders}
      initialSpecies={sp.species || "all"}
      initialQ={sp.q || ""}
    />
  );
}
