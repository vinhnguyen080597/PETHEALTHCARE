import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#5C4A3A] mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/admin"
          className="inline-block px-6 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  if (!session.isAdmin) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#5C4A3A] mb-4">{t(lang, "admin.forbidden")}</p>
        <Link href="/" className="text-[#D97706] text-sm font-medium">
          ← {t(lang, "admin.back")}
        </Link>
      </div>
    );
  }

  return <AdminConsole lang={lang} />;
}
