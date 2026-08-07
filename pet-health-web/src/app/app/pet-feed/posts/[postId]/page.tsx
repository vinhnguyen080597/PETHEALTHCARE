import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import {
  getPublicPostDetail,
  listPublicPostComments,
} from "@/lib/api/public";
import { ListingDetail } from "@/components/marketplace/ListingDetail";
import { ListingDetailSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { listingShareUrl } from "@/lib/config";
import { buildListingOgCopy, listingOgPhotoUrl } from "@/lib/listingOg";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const canonical = listingShareUrl(postId);
  try {
    const listing = await getPublicPostDetail(postId);
    if (!listing) {
      return {
        title: "Listing not found",
        robots: { index: false, follow: false },
      };
    }

    const { title, description } = buildListingOgCopy(listing);
    const photo = listingOgPhotoUrl(listing);
    const images = photo
      ? [
          {
            url: photo,
            width: 1200,
            height: 630,
            alt: listing.breed || listing.title || "Pet Marketplace listing",
          },
        ]
      : undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "article",
        siteName: "Pet Marketplace",
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
      title: "Pet listing",
      alternates: { canonical },
      openGraph: { url: canonical, siteName: "Pet Marketplace" },
    };
  }
}

async function PostDetailData({
  postId,
  lang,
}: {
  postId: string;
  lang: Lang;
}) {
  const session = await getSessionUser();
  const listing = await getPublicPostDetail(postId).catch(() => null);
  if (!listing) {
    return (
      <ResourceNotFound
        lang={lang}
        titleKey="notFound.listing.title"
        bodyKey="notFound.listing.body"
        primaryHref="/app/pet-feed"
        primaryLabelKey="nav.browse"
        secondaryHref="/app/breeders"
        secondaryLabelKey="nav.breeders"
      />
    );
  }
  const comments = await listPublicPostComments(postId).catch(() => []);
  return (
    <ListingDetail
      listing={listing}
      lang={lang}
      isLoggedIn={session.isLoggedIn}
      initialComments={comments}
    />
  );
}

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <Suspense
      fallback={
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
          <ListingDetailSkeleton />
        </div>
      }
    >
      <PostDetailData postId={postId} lang={lang} />
    </Suspense>
  );
}
