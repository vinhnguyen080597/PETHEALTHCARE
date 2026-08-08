import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/session";
import { getMyBreederProfile } from "@/lib/api/petFeed";
import { TemplatePicker } from "@/components/marketplace/TemplatePicker";
import { isTemplateId } from "@/lib/types";
import { mapApiBreeder } from "@/lib/mappers";
import { farmTemplateHref, parseFarmBreadcrumbId } from "@/lib/siteBreadcrumbs";

export const metadata = { title: "Farm template" };

type Props = {
  searchParams?: Promise<{ farm?: string }>;
};

export default async function TemplatePickerPage({ searchParams }: Props) {
  const sp = (await searchParams) || {};
  const farmId = parseFarmBreadcrumbId(sp.farm);
  const loginNext = farmId
    ? farmTemplateHref(farmId)
    : "/app/account/breeder/template";

  const token = await getAccessToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(loginNext)}`);

  let currentTemplate: "T1" | "T2" | "T3" | "T4" | "T5" = "T1";
  let profileId: string | null = null;
  let metadata: Record<string, unknown> = {};

  try {
    const res = await getMyBreederProfile(token);
    const profile = res && "data" in res ? res.data : null;
    if (profile) {
      const mapped = mapApiBreeder(profile);
      currentTemplate = isTemplateId(mapped.template) ? mapped.template : "T1";
      profileId = mapped.id;
      metadata = (profile.metadata as Record<string, unknown>) || {};
    }
  } catch {
    // keep defaults
  }

  return (
    <Suspense fallback={null}>
      <TemplatePicker
        currentTemplate={currentTemplate}
        profileId={profileId}
        initialMetadata={metadata}
      />
    </Suspense>
  );
}
