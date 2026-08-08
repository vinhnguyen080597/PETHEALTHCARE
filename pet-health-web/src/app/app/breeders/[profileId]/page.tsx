import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { mapApiBreeder } from "@/lib/mappers";
import { FarmDetail } from "@/components/marketplace/FarmDetail";
import { FarmDetailSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ profileId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profileId } = await params;
  try {
    const data = await getPublicBreeder(profileId);
    if (!data) return { title: "Breeder not found" };
    return {
      title: data.profile.name,
      description: data.profile.bio?.slice(0, 160),
    };
  } catch {
    return { title: "Breeder" };
  }
}

async function FarmDetailData({
  profileId,
  lang,
}: {
  profileId: string;
  lang: Lang;
}) {
  const data = await getPublicBreeder(profileId).catch(() => null);
  if (!data) {
    return (
      <ResourceNotFound
        lang={lang}
        titleKey="notFound.breeder.title"
        bodyKey="notFound.breeder.body"
        primaryHref="/app/breeders"
        primaryLabelKey="nav.breeders"
        secondaryHref="/app/pet-feed"
        secondaryLabelKey="nav.browse"
      />
    );
  }

  const session = await getSessionUser();
  let isOwner = false;
  let breeder = data.profile;
  if (session.token) {
    try {
      const mine = await getMyBreederProfile(session.token);
      isOwner = mine.data?.id === profileId;
      // Owner view: merge latest avatar/cover from /me so photo updates
      // are visible immediately even if the public breeder cache is stale.
      if (isOwner && mine.data) {
        const fresh = mapApiBreeder(mine.data, {
          activeListings: data.listings.length,
        });
        breeder = {
          ...data.profile,
          avatar: fresh.avatar,
          coverUrl: fresh.coverUrl,
        };
      }
    } catch {
      isOwner = false;
    }
  }

  return (
    <FarmDetail
      breeder={breeder}
      lang={lang}
      listings={data.listings}
      isOwner={isOwner}
      isLoggedIn={session.isLoggedIn}
    />
  );
}

export default async function BreederDetailPage({ params }: Props) {
  const { profileId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7]">
          <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
            <FarmDetailSkeleton />
          </div>
        </div>
      }
    >
      <FarmDetailData profileId={profileId} lang={lang} />
    </Suspense>
  );
}
