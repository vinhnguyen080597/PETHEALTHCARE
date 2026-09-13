import Link from "next/link";
import { t } from "@/i18n";
import { LegalPage } from "@/components/legal/LegalPage";
import { supportContent } from "@/lib/legalContent";
import { getLegalPageLang } from "@/lib/legalPageLang";
import { SUPPORT_HUB_HREF } from "@/lib/supportHub";

export const metadata = { title: "Support · PetCare: Pet Marketplace" };

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = await getLegalPageLang(await searchParams);
  return (
    <>
      <LegalPage
        lang={lang}
        title="Support"
        titleVI="Hỗ trợ"
        docEN={supportContent.EN}
        docVI={supportContent.VI}
      />
      <p className="max-w-3xl mx-auto px-5 pb-12 text-sm">
        <Link href={SUPPORT_HUB_HREF} className="font-semibold text-[#D97706] underline underline-offset-2">
          {t(lang, "nav.support")} →
        </Link>
      </p>
    </>
  );
}
