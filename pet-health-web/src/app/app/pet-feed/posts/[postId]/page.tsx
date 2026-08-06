import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import {
  getPublicPostDetail,
  listPublicPostComments,
} from "@/lib/api/public";
import { ListingDetail } from "@/components/marketplace/ListingDetail";
import { ListingDetailSkeleton } from "@/components/ui/Skeleton";
import { SITE_ORIGIN } from "@/lib/config";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  try {
    const listing = await getPublicPostDetail(postId);
    if (!listing) return { title: "Listing not found" };
    return {
      title: listing.title,
      description: listing.description?.slice(0, 160) || listing.price,
      openGraph: {
        title: listing.title,
        description: listing.description?.slice(0, 160),
        images: listing.mediaUrl ? [listing.mediaUrl] : [],
        url: `${SITE_ORIGIN}/app/pet-feed/posts/${postId}`,
      },
    };
  } catch {
    return { title: "Pet listing" };
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
  if (!listing) notFound();
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
