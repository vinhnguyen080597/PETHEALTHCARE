import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { FarmHealth } from "@/components/marketplace/FarmHealth";
import { FarmHealthSkeleton } from "@/components/ui/Skeleton";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ profileId: string }> };

export const metadata = { title: "Farm Health" };

async function FarmHealthData({
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
  return <FarmHealth breeder={data.profile} lang={lang} />;
}

export default async function BreederHealthPage({ params }: Props) {
  const { profileId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  return (
    <Suspense
      fallback={
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8">
          <FarmHealthSkeleton />
        </div>
      }
    >
      <FarmHealthData profileId={profileId} lang={lang} />
    </Suspense>
  );
}
