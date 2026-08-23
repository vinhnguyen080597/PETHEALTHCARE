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
import { getFeatureFlags, getListingDetail } from "@/lib/api/petFeed";
import { isMarketplaceEscrowEnabled } from "@/lib/featureFlags";
import { mapApiPost } from "@/lib/mappers";
import { ListingDetail } from "@/components/marketplace/ListingDetail";
import { ListingDetailSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { listingShareUrl, newsShareUrl } from "@/lib/config";
import { buildListingOgCopy, listingOgPhotoUrl } from "@/lib/listingOg";
import { newsPostDetailHref, shouldRenderNewsDetail } from "@/lib/newsDetail";
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

    // Announcements open on the Tin tức feed via ?post=.
    if (shouldRenderNewsDetail(listing)) {
      return {
        title: listing.title || "News",
        alternates: { canonical: newsShareUrl(postId) },
        robots: { index: false, follow: true },
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
            alt:
              listing.breed ||
              listing.title ||
              "PetCare: Pet Marketplace listing",
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
      title: "Pet listing",
      alternates: { canonical },
      openGraph: { url: canonical, siteName: "PetCare: Pet Marketplace" },
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
  let listing = null;
  if (session.token) {
    try {
      const fresh = await getListingDetail(session.token, postId);
      if (fresh?.data) listing = mapApiPost(fresh.data);
    } catch {
      listing = null;
    }
  }
  if (!listing) {
    listing = await getPublicPostDetail(postId).catch(() => null);
  }
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

  if (shouldRenderNewsDetail(listing)) {
    redirect(newsPostDetailHref(postId));
  }

  const comments = await listPublicPostComments(postId).catch(() => []);
  let marketplaceEscrowEnabled = false;
  if (session.token) {
    try {
      const flagsRes = await getFeatureFlags(session.token);
      marketplaceEscrowEnabled = isMarketplaceEscrowEnabled(flagsRes.data);
    } catch {
      marketplaceEscrowEnabled = false;
    }
  }
  const currentUserId =
    session.account && typeof session.account === "object"
      ? String(
          (session.account as { user_id?: string; id?: string }).user_id ||
            (session.account as { id?: string }).id ||
            "",
        ) || null
      : null;
  return (
    <ListingDetail
      listing={listing}
      lang={lang}
      isLoggedIn={session.isLoggedIn}
      isAdmin={session.isAdmin}
      currentUserId={currentUserId}
      initialComments={comments}
      marketplaceEscrowEnabled={marketplaceEscrowEnabled}
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
