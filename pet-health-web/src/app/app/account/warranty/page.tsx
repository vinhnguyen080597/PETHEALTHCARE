import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getAccessToken, getSessionUser } from "@/lib/session";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { mapWarrantyPolicies } from "@/lib/mappers";
import { WarrantyLibraryPanel } from "@/components/account/WarrantyLibraryPanel";
import {
  parseWarrantyLibraryNavFrom,
  warrantyLibraryHref,
} from "@/lib/farmTabs";
import { parseFarmBreadcrumbId } from "@/lib/siteBreadcrumbs";

export const metadata = { title: "Warranty policies" };

type Props = {
  searchParams: Promise<{ edit?: string; from?: string; farm?: string }>;
};

export default async function WarrantyLibraryPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const lang = getLang({ cookie: cookieStore.get(COOKIE_LANG)?.value });
  const user = await getSessionUser();
  const token = await getAccessToken();
  const params = await searchParams;
  const from = parseWarrantyLibraryNavFrom(params.from);
  const farm = parseFarmBreadcrumbId(params.farm);
  const loginNext = warrantyLibraryHref({
    from,
    farm,
    edit: String(params.edit || "").trim() || null,
  });
  if (!user || !token) redirect(`/login?next=${encodeURIComponent(loginNext)}`);

  const profileRes = await getMyBreederProfile(token).catch(() => ({ data: null }));
  const profile = profileRes?.data ?? null;
  if (!profile) {
    redirect("/app/account/breeder");
  }

  const policies = mapWarrantyPolicies(
    profile.warranty_policies ?? profile.metadata?.warranty_policies,
  );
  const trustAwarded = Boolean(
    profile.warranty_policy_trust_awarded ||
      (profile.metadata as { warranty_policy_trust_awarded?: boolean } | undefined)
        ?.warranty_policy_trust_awarded,
  );
  const editPolicyId = String(params.edit || "").trim() || null;

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <p className="text-xs text-[#6E5A51] mb-3">{t(lang, "account.title")}</p>
      <WarrantyLibraryPanel
        lang={lang}
        initialPolicies={policies}
        trustAwarded={trustAwarded}
        profileId={profile.id}
        primarySpecies={profile.primary_species || []}
        editPolicyId={editPolicyId}
        from={from}
        farm={farm}
      />
    </div>
  );
}
