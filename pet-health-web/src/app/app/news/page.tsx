import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicPostDetail, listPublicPosts } from "@/lib/api/public";
import { listFeedPosts } from "@/lib/api/petFeed";
import { mapApiPosts } from "@/lib/mappers";
import { NewsFeedView } from "@/components/marketplace/NewsFeedView";
import { isAnnouncementPost } from "@/lib/siteNav";
import { newsShareUrl } from "@/lib/config";
import { listingOgPhotoUrl } from "@/lib/listingOg";
import {
  buildNewsOgCopy,
  parseNewsPostId,
  shouldRenderNewsDetail,
} from "@/lib/newsDetail";
import type { Listing } from "@/lib/types";

/** Prefer auth feed when logged in so `saved` / is_favorited is correct on first paint. */
export const dynamic = "force-dynamic";

type Search = { category?: string; post?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const postId = parseNewsPostId(sp.post);
  if (postId) {
    try {
      const listing = await getPublicPostDetail(postId);
      if (listing && shouldRenderNewsDetail(listing)) {
        const { title, description } = buildNewsOgCopy(listing);
        const photo = listingOgPhotoUrl(listing);
        const canonical = newsShareUrl(postId);
        const images = photo
          ? [
              {
                url: photo,
                width: 1200,
                height: 630,
                alt: listing.title || "PetCare news",
              },
            ]
          : undefined;
        return {
          title,
          description,
          alternates: { canonical },
          openGraph: {
            type: "article",
            siteName: "PetCare: Pet Marketplace",
            title,
            description,
            url: canonical,
            locale: "vi_VN",
            ...(images ? { images } : {}),
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(images ? { images: [photo!] } : {}),
          },
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { title: "News" };
}

function NewsFeedFallback({ lang }: { lang: "EN" | "VI" }) {
  return (
    <div className="rounded-2xl border border-[#F3E2C8] bg-white px-6 py-14 text-center">
      <p className="text-sm text-[#6E5A51]">{t(lang, "news.title")}…</p>
    </div>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
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

        <Suspense fallback={<NewsFeedFallback lang={lang} />}>
          <NewsFeedView
            lang={lang}
            posts={posts}
            isLoggedIn={Boolean(user.isLoggedIn && user.token)}
            initialFilter={sp.category || "all"}
            initialPostId={parseNewsPostId(sp.post)}
          />
        </Suspense>
      </div>
    </div>
  );
}
