import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getAccessToken } from "@/lib/session";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { BreederProfileForm } from "@/components/account/BreederProfileForm";

export const metadata = { title: "Breeder profile" };

export default async function BreederProfilePage() {
  const token = await getAccessToken();
  if (!token) redirect("/login?next=/app/account/breeder");

  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });

  let profile = null;
  try {
    const res = await getMyBreederProfile(token);
    profile = res.data;
  } catch {
    profile = null;
  }

  return <BreederProfileForm lang={lang} initial={profile} />;
}
