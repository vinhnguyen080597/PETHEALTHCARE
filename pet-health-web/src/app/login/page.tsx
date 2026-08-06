import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang } from "@/i18n";
import { COOKIE_LANG } from "@/lib/session";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  return (
    <Suspense fallback={null}>
      <AuthScreen lang={lang} initialTab="login" />
    </Suspense>
  );
}
