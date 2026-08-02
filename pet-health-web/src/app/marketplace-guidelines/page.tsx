import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Marketplace Guidelines" };

export default async function GuidelinesPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <LegalPage
      lang={lang}
      title="Marketplace Guidelines"
      titleVI="Nội quy Marketplace"
      childrenEN={
        <>
          <p>1. Post only pets you are authorized to rehome or sell.</p>
          <p>2. Do not misrepresent vaccines, age, breed, or health status.</p>
          <p>3. No spam, scams, or abusive messaging.</p>
          <p>4. Verify in person before transferring money or pets.</p>
          <p>5. Admin may remove listings and suspend accounts for violations.</p>
        </>
      }
      childrenVI={
        <>
          <p>1. Chỉ đăng thú cưng mà bạn có quyền tìm nhà mới hoặc bán.</p>
          <p>
            2. Không khai sai vaccine, tuổi, giống hoặc tình trạng sức khỏe.
          </p>
          <p>3. Không spam, lừa đảo hoặc nhắn tin xúc phạm.</p>
          <p>
            4. Hãy kiểm tra trực tiếp trước khi chuyển tiền hoặc nhận thú.
          </p>
          <p>
            5. Admin có thể gỡ tin và tạm khóa tài khoản khi vi phạm.
          </p>
        </>
      }
    />
  );
}
