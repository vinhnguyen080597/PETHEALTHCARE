import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { getMyBreederProfile, listMyBreederProfileSubmissions } from "@/lib/api/petFeed";
import { mapApiBreeder } from "@/lib/mappers";
import { FarmTrustGuide } from "@/components/marketplace/FarmTrustGuide";
import { FarmHealthSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { Lang } from "@/lib/types";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";

type Props = { params: Promise<{ profileId: string }> };

export const metadata = { title: "Transparency score guide" };

async function TrustGuideData({
  profileId,
  lang,
}: {
  profileId: string;
  lang: Lang;
}) {
  const session = await getSessionUser();
  if (!session.token) {
    redirect(`/login?next=/app/breeders/${encodeURIComponent(profileId)}/trust`);
  }

  const [data, mineRes] = await Promise.all([
    getPublicBreeder(profileId).catch(() => null),
    getMyBreederProfile(session.token).catch(() => ({ data: null })),
  ]);
  const mine = mineRes?.data ?? null;
  if (mine?.id !== profileId) {
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
    redirect(`/app/breeders/${encodeURIComponent(profileId)}`);
  }

  const breeder = data?.profile ?? (mine ? mapApiBreeder(mine) : null);
  if (!breeder) {
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

  let profileMetadata: Record<string, unknown> = {};
  let submissions: BreederProfileSubmission[] = [];
  if (mine?.metadata && typeof mine.metadata === "object") {
    profileMetadata = mine.metadata as Record<string, unknown>;
  }
  const listed = await listMyBreederProfileSubmissions(session.token).catch(() => ({
    data: [],
  }));
  submissions = Array.isArray(listed.data) ? listed.data : [];

  return (
    <FarmTrustGuide
      breeder={breeder}
      lang={lang}
      profileMetadata={profileMetadata}
      submissions={submissions}
    />
  );
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
