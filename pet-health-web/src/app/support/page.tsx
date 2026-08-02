import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <LegalPage
      lang={lang}
      title="Support"
      titleVI="Hỗ trợ"
      childrenEN={
        <>
          <p>
            Need help with Pet Marketplace or the Pet Health Care app? Email{" "}
            <a
              className="text-[#1E6FE8] underline"
              href="mailto:support@pethealthcare.app"
            >
              support@pethealthcare.app
            </a>
            .
          </p>
          <p>
            For listing disputes, include the listing URL and a short description
            of the issue.
          </p>
        </>
      }
      childrenVI={
        <>
          <p>
            Cần hỗ trợ Pet Marketplace hoặc app Pet Health Care? Gửi email tới{" "}
            <a
              className="text-[#1E6FE8] underline"
              href="mailto:support@pethealthcare.app"
            >
              support@pethealthcare.app
            </a>
            .
          </p>
          <p>
            Với tranh chấp tin đăng, vui lòng kèm URL tin và mô tả ngắn vấn đề.
          </p>
        </>
      }
    />
  );
}
