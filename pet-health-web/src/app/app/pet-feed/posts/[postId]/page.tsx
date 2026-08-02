import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { getPublicPostDetail } from "@/lib/api/public";
import { ListingDetail } from "@/components/marketplace/ListingDetail";
import { SITE_ORIGIN } from "@/lib/config";

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

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const listing = await getPublicPostDetail(postId).catch(() => null);
  if (!listing) notFound();
  return <ListingDetail listing={listing} lang={lang} />;
}
