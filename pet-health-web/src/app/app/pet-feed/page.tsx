import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { listPublicPosts } from "@/lib/api/public";
import { FeedView } from "@/components/marketplace/FeedView";

export const metadata = {
  title: "Browse listings",
};

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

  let listings: Awaited<ReturnType<typeof listPublicPosts>>["listings"] = [];
  try {
    const postsPage = await listPublicPosts({ limit: 48 });
    listings = postsPage.listings;
  } catch {
    // offline API
  }

  return (
    <FeedView
      lang={lang}
      listings={listings}
      initialSpecies={sp.species || "all"}
      initialQ={sp.q || ""}
      initialProvince={sp.province || ""}
    />
  );
}
