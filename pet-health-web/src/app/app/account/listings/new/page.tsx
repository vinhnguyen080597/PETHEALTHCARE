import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getAccessToken } from "@/lib/session";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { mapWarrantyPolicies } from "@/lib/mappers";
import { NewListingForm } from "@/components/account/NewListingForm";

export const metadata = { title: "Create listing" };

export default async function NewListingPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login?next=/app/account/listings/new");
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const profileRes = await getMyBreederProfile(token).catch(() => ({ data: null }));
  const profile = profileRes?.data ?? null;
  const warrantyPolicies = mapWarrantyPolicies(
    profile?.warranty_policies ?? profile?.metadata?.warranty_policies,
  ).map((p) => ({ id: p.id, title: p.title }));
  return <NewListingForm lang={lang} warrantyPolicies={warrantyPolicies} />;
}
