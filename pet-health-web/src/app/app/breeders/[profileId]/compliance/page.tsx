import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { FarmComplianceGuide } from "@/components/marketplace/FarmComplianceGuide";
import { FarmHealthSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ profileId: string }> };

export const metadata = { title: "Compliance score guide" };

async function ComplianceGuideData({
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
    redirect(
      `/login?next=/app/breeders/${encodeURIComponent(profileId)}/compliance`,
    );
  }

  let profileMetadata: Record<string, unknown> = {};
  try {
    const mine = await getMyBreederProfile(session.token);
    if (mine.data?.id !== profileId) {
      redirect(`/app/breeders/${encodeURIComponent(profileId)}`);
    }
    if (mine.data?.metadata && typeof mine.data.metadata === "object") {
      profileMetadata = mine.data.metadata as Record<string, unknown>;
    }
  } catch {
    redirect(`/app/breeders/${encodeURIComponent(profileId)}`);
  }

  return (
    <FarmComplianceGuide
      breeder={data.profile}
      lang={lang}
      profileMetadata={profileMetadata}
    />
  );
}

export default async function BreederComplianceGuidePage({ params }: Props) {
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
      <ComplianceGuideData profileId={profileId} lang={lang} />
    </Suspense>
  );
}
