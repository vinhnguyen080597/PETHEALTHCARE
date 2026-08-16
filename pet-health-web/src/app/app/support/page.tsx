import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { SupportHub } from "@/components/support/SupportHub";

export const metadata = {
  title: "Support · PetCare: Pet Marketplace",
};

export default async function SupportHubPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; q?: string }>;
}) {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const sp = await searchParams;
  const session = await getSessionUser();

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <SupportHub
        lang={lang}
        initialSection={sp.section}
        initialQuery={sp.q || ""}
        isLoggedIn={session.isLoggedIn}
      />
    </div>
  );
}
