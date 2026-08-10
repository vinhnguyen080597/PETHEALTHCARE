import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";
import { marketplaceGuidelinesContent } from "@/lib/legalContent";

export const metadata = { title: "Marketplace Guidelines · Pet Health Care" };

export default async function GuidelinesPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
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
