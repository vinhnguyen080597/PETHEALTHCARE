import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { getPublicBreeder } from "@/lib/api/public";
import { FarmHealth } from "@/components/marketplace/FarmHealth";

type Props = { params: Promise<{ profileId: string }> };

export const metadata = { title: "Farm Health" };

export default async function BreederHealthPage({ params }: Props) {
  const { profileId } = await params;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const data = await getPublicBreeder(profileId).catch(() => null);
  if (!data) notFound();
  return <FarmHealth breeder={data.profile} lang={lang} />;
}
