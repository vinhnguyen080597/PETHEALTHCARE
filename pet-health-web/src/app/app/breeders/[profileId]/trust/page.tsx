import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { FarmTrustGuide } from "@/components/marketplace/FarmTrustGuide";
import { FarmHealthSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ profileId: string }> };

export const metadata = { title: "Transparency score guide" };

async function TrustGuideData({
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
  if (!session.token) {
    redirect(`/login?next=/app/breeders/${encodeURIComponent(profileId)}/trust`);
  }

  let isOwner = false;
  try {
    const mine = await getMyBreederProfile(session.token);
    isOwner = mine.data?.id === profileId;
  } catch {
    isOwner = false;
  }

  if (!isOwner) {
    redirect(`/app/breeders/${encodeURIComponent(profileId)}`);
  }

  return <FarmTrustGuide breeder={data.profile} lang={lang} />;
}

export default async function BreederTrustGuidePage({ params }: Props) {
  const { profileId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <Suspense
      fallback={
        <div className="max-w-[900px] mx-auto px-5 lg:px-8 py-8">
          <FarmHealthSkeleton />
        </div>
      }
    >
      <TrustGuideData profileId={profileId} lang={lang} />
    </Suspense>
  );
}
