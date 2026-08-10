import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";
import { supportContent } from "@/lib/legalContent";

export const metadata = { title: "Support · Pet Health Care" };

export default async function SupportPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <LegalPage
      lang={lang}
      title="Support"
      titleVI="Hỗ trợ"
      docEN={supportContent.EN}
      docVI={supportContent.VI}
    />
  );
}
