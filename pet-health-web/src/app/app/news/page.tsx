import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listPublicPosts } from "@/lib/api/public";
import { listFeedPosts } from "@/lib/api/petFeed";
import { mapApiPosts } from "@/lib/mappers";
import { NewsFeedView } from "@/components/marketplace/NewsFeedView";
import { isAnnouncementPost } from "@/lib/siteNav";
import type { Listing } from "@/lib/types";

export const metadata = {
  title: "News",
};

/** Prefer auth feed when logged in so `saved` / is_favorited is correct on first paint. */
export const dynamic = "force-dynamic";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const user = await getSessionUser();
  const sp = await searchParams;

  let posts: Listing[] = [];
  let loadError = "";
  try {
    if (user.token) {
      const page = await listFeedPosts(user.token, {
        limit: 48,
        kind: "announcement",
      });
      posts = mapApiPosts(page.data || []).filter((p) =>
        isAnnouncementPost(p.postKind),
      );
    } else {
      const page = await listPublicPosts({ limit: 48, kind: "announcement" });
      posts = page.listings.filter((p) => isAnnouncementPost(p.postKind));
    }
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : t(lang, "news.loadError");
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#2B1E19]">
            {t(lang, "news.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6E5A51] leading-relaxed">
            {t(lang, "news.subtitle")}
          </p>
        </header>

        {loadError ? (
          <div className="mb-5 rounded-xl border border-amber-200 bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
            {t(lang, "news.loadError")}: {loadError}
          </div>
        ) : null}

        <NewsFeedView
          lang={lang}
          posts={posts}
          isLoggedIn={Boolean(user.isLoggedIn && user.token)}
          initialFilter={sp.category || "all"}
        />
      </div>
    </div>
  );
}
