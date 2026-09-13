import { LegalPage } from "@/components/legal/LegalPage";
import { marketplaceGuidelinesContent } from "@/lib/legalContent";
import { getLegalPageLang } from "@/lib/legalPageLang";

export const metadata = { title: "Marketplace Guidelines · PetCare: Pet Marketplace" };

export default async function GuidelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = await getLegalPageLang(await searchParams);
  return (
    <LegalPage
      lang={lang}
      title="Marketplace Guidelines"
      titleVI="Nội quy Marketplace"
      docEN={marketplaceGuidelinesContent.EN}
      docVI={marketplaceGuidelinesContent.VI}
    />
  );
}
