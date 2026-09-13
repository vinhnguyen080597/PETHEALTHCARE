import { LegalPage } from "@/components/legal/LegalPage";
import { privacyPolicyContent } from "@/lib/legalContent";
import { getLegalPageLang } from "@/lib/legalPageLang";

export const metadata = { title: "Privacy Policy · PetCare: Pet Marketplace" };

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = await getLegalPageLang(await searchParams);
  return (
    <LegalPage
      lang={lang}
      title="Privacy Policy"
      titleVI="Chính sách bảo mật"
      docEN={privacyPolicyContent.EN}
      docVI={privacyPolicyContent.VI}
    />
  );
}
