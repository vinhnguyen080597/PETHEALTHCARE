import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";
import { privacyPolicyContent } from "@/lib/legalContent";

export const metadata = { title: "Privacy Policy · Pet Health Care" };

export default async function PrivacyPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
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
