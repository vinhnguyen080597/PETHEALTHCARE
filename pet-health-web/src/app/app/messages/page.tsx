import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLang, t } from "@/i18n";
import { COOKIE_LANG, getSessionUser } from "@/lib/session";
import { listConversations } from "@/lib/api/petFeed";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { ConversationsSkeleton } from "@/components/ui/Skeleton";
import type { Lang } from "@/lib/types";

export const metadata = { title: "Messages" };

async function MessagesData({
  lang,
  token,
  conversationId,
}: {
  lang: Lang;
  token: string;
  conversationId: string | null;
}) {
  let conversations: Array<{
    id: string;
    title?: string;
    last_message?: string;
  }> = [];
  try {
    const res = await listConversations(token);
    conversations = (Array.isArray(res.data) ? res.data : []) as typeof conversations;
  } catch {
    conversations = [];
  }

  return (
    <MessagesClient
      lang={lang}
      initialConversations={conversations}
      initialConversationId={conversationId}
    />
  );
}

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
          className="inline-block px-6 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full"
        >
          {t(lang, "auth.login")}
        </Link>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
          <div className="h-7 w-36 mb-5 animate-pulse rounded bg-[#F0E6D8]" />
          <ConversationsSkeleton />
        </div>
      }
    >
      <MessagesData
        lang={lang}
        token={session.token}
        conversationId={sp.c || null}
      />
    </Suspense>
  );
}
