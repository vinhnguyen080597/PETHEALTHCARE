import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { FarmDetail } from "@/components/marketplace/FarmDetail";

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

export default async function BreederDetailPage({ params }: Props) {
  const { profileId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const data = await getPublicBreeder(profileId).catch(() => null);
  if (!data) notFound();

  const session = await getSessionUser();
  let isOwner = false;
  if (session.token) {
    try {
      const mine = await getMyBreederProfile(session.token);
      isOwner = mine.data?.id === profileId;
    } catch {
      isOwner = false;
    }
  }

  return (
    <FarmDetail
      breeder={data.profile}
      lang={lang}
      listings={data.listings}
      isOwner={isOwner}
    />
  );
}
