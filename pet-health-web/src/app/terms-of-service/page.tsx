import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";
import { termsOfServiceContent } from "@/lib/legalContent";

export const metadata = { title: "Terms of Service · Pet Health Care" };

export default async function TermsPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
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
