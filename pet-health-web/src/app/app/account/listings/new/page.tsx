import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getAccessToken } from "@/lib/session";
import { NewListingForm } from "@/components/account/NewListingForm";

export const metadata = { title: "Create listing" };

export default async function NewListingPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login?next=/app/account/listings/new");
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return <NewListingForm lang={lang} />;
}
