import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listNotifications } from "@/lib/api/petFeed";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn || !session.token) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[#5C4A3A] mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/notifications"
          className="inline-block px-6 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  let notifications: Awaited<ReturnType<typeof listNotifications>>["data"] = [];
  let unreadCount = 0;
  try {
    const res = await listNotifications(session.token, 50);
    notifications = Array.isArray(res.data) ? res.data : [];
    unreadCount = Number(res.unread_count) || 0;
  } catch {
    notifications = [];
    unreadCount = 0;
  }

  return (
    <NotificationsClient
      lang={lang}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
