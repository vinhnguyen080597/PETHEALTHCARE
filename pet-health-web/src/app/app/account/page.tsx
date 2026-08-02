import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listFavorites, listMyPosts, getMyBreederProfile } from "@/lib/api/petFeed";
import { AccountPanel } from "@/components/account/AccountPanel";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn || !session.token) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-slate-600 mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/account"
          className="inline-block px-6 py-2.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  let savedCount = 0;
  let myListingsCount = 0;
  let breederProfileId: string | null = null;

  try {
    const [favs, mine, profile] = await Promise.all([
      listFavorites(session.token).catch(() => ({ data: [] })),
      listMyPosts(session.token).catch(() => ({ data: [] })),
      getMyBreederProfile(session.token).catch(() => ({ data: null })),
    ]);
    savedCount = Array.isArray((favs as { data?: unknown[] }).data)
      ? ((favs as { data: unknown[] }).data.length)
      : 0;
    myListingsCount = Array.isArray((mine as { data?: unknown[] }).data)
      ? ((mine as { data: unknown[] }).data.length)
      : 0;
    breederProfileId = profile.data?.id || null;
  } catch {
    // ignore
  }

  return (
    <AccountPanel
      lang={lang}
      displayName={session.account?.display_name}
      email={session.account?.email}
      savedCount={savedCount}
      myListingsCount={myListingsCount}
      breederProfileId={breederProfileId}
    />
  );
}
