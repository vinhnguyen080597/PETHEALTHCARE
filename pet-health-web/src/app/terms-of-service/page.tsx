import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <LegalPage
      lang={lang}
      title="Terms of Service"
      titleVI="Điều khoản dịch vụ"
      childrenEN={
        <>
          <p>
            By using Pet Marketplace you agree that listings are user-generated.
            Pet Health Care is not the seller, does not process payments, and
            does not guarantee pets, health claims, or transactions.
          </p>
          <p>
            You must provide accurate information, follow Marketplace Guidelines,
            and comply with applicable law.
          </p>
        </>
      }
      childrenVI={
        <>
          <p>
            Khi sử dụng Pet Marketplace, bạn đồng ý rằng tin đăng do người dùng
            tạo. Pet Health Care không phải bên bán, không xử lý thanh toán và
            không bảo lãnh thú cưng, thông tin sức khỏe hay giao dịch.
          </p>
          <p>
            Bạn phải cung cấp thông tin chính xác, tuân thủ Nội quy Marketplace
            và pháp luật hiện hành.
          </p>
        </>
      }
    />
  );
}
