"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { t } from "@/i18n";
import { brandUi } from "@/lib/brand";
import {
  conversationListingThumb,
  conversationListingTitle,
  conversationPeerName,
  conversationPreview,
  filterInboxConversations,
  formatInboxRelativeTime,
  INBOX_FILTER_ALL,
  INBOX_FILTER_UNREAD,
  MESSAGES_PAGE_HREF,
  type InboxFilter,
} from "@/lib/messages";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { Skeleton } from "@/components/ui/Skeleton";

export function MessagesInboxPopover() {
  const dock = useOptionalChatDock();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>(INBOX_FILTER_ALL);

  const visible = useMemo(
    () =>
      filterInboxConversations(dock?.conversations || [], { query, filter }),
    [dock?.conversations, query, filter],
  );

  if (!dock) return null;

  const { lang, conversations, inboxLoading, openChat, setInboxOpen } = dock;

  return (
    <div
      id="messages-inbox-popover"
      role="dialog"
      aria-label={t(lang, "messages.chats")}
      className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(calc(100vw-1.5rem),22.5rem)] overflow-hidden rounded-2xl border border-[#F0E6D8] bg-white shadow-[0_18px_50px_-18px_rgba(43,30,25,0.45)]"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xl font-bold text-[#2B1E19]">
          {t(lang, "messages.chats")}
        </h2>
      </div>

      <div className="px-3 pb-2">
        <label className="sr-only" htmlFor="messages-inbox-search">
          {t(lang, "messages.searchPlaceholder")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6E5A51]/70">
            🔍
          </span>
          <input
            id="messages-inbox-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "messages.searchPlaceholder")}
            className="h-9 w-full rounded-full border border-[#F3E2C8] bg-[#FDFBF7] pl-8 pr-3 text-sm text-[#2B1E19] placeholder:text-[#6E5A51]/55 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 pb-2">
        {(
          [
            [INBOX_FILTER_ALL, "messages.filterAll"],
            [INBOX_FILTER_UNREAD, "messages.filterUnread"],
          ] as const
        ).map(([id, labelKey]) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                active
                  ? "bg-amber-100 text-amber-900"
                  : "text-stone-600 hover:bg-amber-50"
              }`}
            >
              {t(lang, labelKey)}
            </button>
          );
        })}
      </div>

      <div className="max-h-[min(28rem,55vh)] overflow-y-auto">
        {inboxLoading && conversations.length === 0 ? (
          <ul className="px-2 pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {filter === INBOX_FILTER_UNREAD
                ? t(lang, "messages.unreadEmpty")
                : t(lang, "messages.emptyTitle")}
            </p>
            {filter !== INBOX_FILTER_UNREAD ? (
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                {t(lang, "messages.emptyBody")}
              </p>
            ) : null}
          </div>
        ) : (
          <ul>
            {visible.map((c) => {
              const peer = conversationPeerName(
                c,
                t(lang, "messages.peerFallback"),
              );
              const listing = conversationListingTitle(
                c,
                t(lang, "messages.listingFallback"),
              );
              const preview = conversationPreview(
                c,
                t(lang, "messages.noMessagesYet"),
                {
                  photo: t(lang, "messages.photo"),
                  video: t(lang, "messages.video"),
                },
              );
              const thumb = conversationListingThumb(c);
              const time = formatInboxRelativeTime(
                c.last_message_at || c.updated_at,
                lang,
              );
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openChat(c.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-50/70"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center ${brandUi.primaryText}`}
                        >
                          🐾
                        </div>
                      )}
                      {c.has_unread ? (
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${brandUi.primaryDot} ring-2 ring-white`}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          c.has_unread
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {peer}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {listing}
                      </p>
                      <p
                        className={`mt-0.5 truncate text-xs ${
                          c.has_unread
                            ? "font-semibold text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {preview}
                        {time ? (
                          <span className="text-slate-400"> · {time}</span>
                        ) : null}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-[#F0E6D8] px-3 py-2">
        <Link
          href={MESSAGES_PAGE_HREF}
          onClick={() => setInboxOpen(false)}
          className={`block rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${brandUi.primaryText} hover:bg-amber-50`}
        >
          {t(lang, "messages.seeAll")}
        </Link>
      </div>
    </div>
  );
}
