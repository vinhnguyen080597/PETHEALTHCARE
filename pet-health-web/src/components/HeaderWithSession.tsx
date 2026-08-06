import { SiteHeader } from "@/components/SiteHeader";
import type { Lang } from "@/lib/types";
import { getSessionUser } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/api/petFeed";

/** Async header chrome — keep out of root layout await so page loading.tsx can stream. */
export async function HeaderWithSession({ lang }: { lang: Lang }) {
  const session = await getSessionUser();
  let unreadCount = 0;
  if (session.token) {
    try {
      const unread = await getUnreadNotificationCount(session.token);
      unreadCount = Number(unread?.data?.unread_count) || 0;
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <SiteHeader
      lang={lang}
      isAdmin={session.isAdmin}
      isLoggedIn={session.isLoggedIn}
      unreadCount={unreadCount}
    />
  );
}
