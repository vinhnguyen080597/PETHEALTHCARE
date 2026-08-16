import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import {
  getPublicPostDetail,
  listPublicPostComments,
} from "@/lib/api/public";
import { getListingDetail } from "@/lib/api/petFeed";
import { mapApiPost } from "@/lib/mappers";
import { NewsDetail } from "@/components/marketplace/NewsDetail";
import { ListingDetailSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { newsShareUrl } from "@/lib/config";
import { listingOgPhotoUrl } from "@/lib/listingOg";
import {
  buildNewsOgCopy,
  newsDetailBackHref,
  shouldRenderNewsDetail,
} from "@/lib/newsDetail";
import type { Lang, Listing } from "@/lib/types";

type Props = { params: Promise<{ postId: string }> };

async function loadPost(postId: string): Promise<Listing | null> {
  const session = await getSessionUser();
  if (session.token) {
    try {
      const fresh = await getListingDetail(session.token, postId);
      if (fresh?.data) return mapApiPost(fresh.data);
    } catch {
      /* fall through */
    }
  }
  return getPublicPostDetail(postId).catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const canonical = newsShareUrl(postId);
  try {
    const listing = await getPublicPostDetail(postId);
    if (!listing || !shouldRenderNewsDetail(listing)) {
      return {
        title: "News not found",
        robots: { index: false, follow: false },
      };
    }

    const { title, description } = buildNewsOgCopy(listing);
    const photo = listingOgPhotoUrl(listing);
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
  } catch {
    return {
      title: "News",
      alternates: { canonical },
      openGraph: { url: canonical, siteName: "PetCare: Pet Marketplace" },
    };
  }
}

async function NewsPostData({
  postId,
  lang,
}: {
  postId: string;
  lang: Lang;
}) {
  const session = await getSessionUser();
  const listing = await loadPost(postId);

  if (!listing) {
    return (
      <ResourceNotFound
        lang={lang}
        titleKey="notFound.listing.title"
        bodyKey="notFound.listing.body"
        primaryHref={newsDetailBackHref()}
        primaryLabelKey="nav.news"
        secondaryHref="/app/pet-feed"
        secondaryLabelKey="nav.browse"
      />
    );
  }

  if (!shouldRenderNewsDetail(listing)) {
    redirect(`/app/pet-feed/posts/${encodeURIComponent(postId)}`);
  }

  const comments = await listPublicPostComments(postId).catch(() => []);

  return (
    <NewsDetail
      listing={listing}
      lang={lang}
      isLoggedIn={session.isLoggedIn}
      initialComments={comments}
    />
  );
}

export default async function NewsPostPage({ params }: Props) {
  const { postId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <Suspense
      fallback={
        <div className="max-w-[760px] mx-auto px-5 lg:px-8 py-6">
          <ListingDetailSkeleton />
        </div>
      }
    >
      <NewsPostData postId={postId} lang={lang} />
    </Suspense>
  );
}
