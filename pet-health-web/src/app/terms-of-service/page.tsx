import { LegalPage } from "@/components/legal/LegalPage";
import { termsOfServiceContent } from "@/lib/legalContent";
import { getLegalPageLang } from "@/lib/legalPageLang";

export const metadata = { title: "Terms of Service · PetCare: Pet Marketplace" };

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = await getLegalPageLang(await searchParams);
  return (
    <LegalPage
      lang={lang}
      title="Terms of Service"
      titleVI="Điều khoản dịch vụ"
      docEN={termsOfServiceContent.EN}
      docVI={termsOfServiceContent.VI}
    />
  );
}
