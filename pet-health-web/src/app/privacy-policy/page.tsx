import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <LegalPage
      lang={lang}
      title="Privacy Policy"
      titleVI="Chính sách bảo mật"
      childrenEN={
        <>
          <p>
            Pet Marketplace (operated with Pet Health Care) collects account
            information, listing content you submit, and basic usage data to
            operate the marketplace and improve safety.
          </p>
          <p>
            We do not sell personal data. Contact details shared in listings or
            messages are visible to other users as part of marketplace
            activity.
          </p>
          <p>
            For privacy questions, contact support via the Support page.
          </p>
        </>
      }
      childrenVI={
        <>
          <p>
            Pet Marketplace (vận hành cùng Pet Health Care) thu thập thông tin
            tài khoản, nội dung tin đăng bạn gửi, và dữ liệu sử dụng cơ bản để
            vận hành marketplace và nâng cao an toàn.
          </p>
          <p>
            Chúng tôi không bán dữ liệu cá nhân. Thông tin liên hệ trong tin
            đăng hoặc tin nhắn có thể được người dùng khác nhìn thấy trong quá
            trình giao dịch.
          </p>
          <p>
            Mọi thắc mắc về bảo mật, vui lòng liên hệ qua trang Hỗ trợ.
          </p>
        </>
      }
    />
  );
}
