import Link from "next/link";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listConversations } from "@/lib/api/petFeed";
import { MessagesClient } from "@/components/messages/MessagesClient";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const lang = getLang({ cookie: jar.get(COOKIE_LANG)?.value });
  const session = await getSessionUser();

  if (!session.isLoggedIn || !session.token) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-slate-600 mb-4">{t(lang, "account.notLoggedIn")}</p>
        <Link
          href="/login?next=/app/messages"
          className="inline-block px-6 py-2.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  let conversations: Array<{
    id: string;
    title?: string;
    last_message?: string;
  }> = [];
  try {
    const res = await listConversations(session.token);
    conversations = (Array.isArray(res.data) ? res.data : []) as typeof conversations;
  } catch {
    conversations = [];
  }

  return (
    <MessagesClient
      lang={lang}
      initialConversations={conversations}
      initialConversationId={sp.c || null}
    />
  );
}
