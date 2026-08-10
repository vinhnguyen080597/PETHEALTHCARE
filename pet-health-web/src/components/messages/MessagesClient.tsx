"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { formatPriceVnd } from "@/lib/formatPrice";
import {
  conversationListingThumb,
  conversationListingTitle,
  conversationPeerName,
  conversationPreview,
  formatInboxTime,
  formatMessageTime,
  isConversationBreederViewer,
  isMineMessage,
  normalizeConversations,
  normalizeMessages,
  resolveConversationPostSummary,
  type MessageConversation,
  type MessageItem,
} from "@/lib/messages";
import { MessageThreadSkeleton } from "@/components/ui/Skeleton";

const MESSAGE_MAX_LEN = 2000;

function ListingContextCard({
  lang,
  conversation,
  currentUserId,
}: {
  lang: Lang;
  conversation: MessageConversation;
  currentUserId: string | null;
}) {
  const summary = resolveConversationPostSummary(conversation);
  if (!summary?.id) return null;

  const isBreeder = isConversationBreederViewer(conversation, currentUserId);
  const unavailable = summary.status && summary.status !== "published";
  const price = formatPriceVnd(summary.price_note || "") || summary.price_note || "";
  const detailLine = [summary.breed || summary.species, summary.location, price]
    .filter(Boolean)
    .join(" · ");
  const thumb = summary.thumb_url;

  const body = (
    <div className="rounded-2xl border border-[#F0E6D8] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
        {t(
          lang,
          isBreeder
            ? "messages.contextCardTitleBreeder"
            : "messages.contextCardTitle",
        )}
      </p>
      <div className="mt-2.5 flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-[#1E6FE8]">
              🐾
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 line-clamp-2">
            {summary.title || t(lang, "messages.listingFallback")}
          </p>
          {detailLine ? (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{detailLine}</p>
          ) : null}
          {unavailable ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {t(lang, "messages.listingUnavailable")}
            </p>
          ) : null}
        </div>
        {!unavailable ? (
          <span className="self-center text-slate-300" aria-hidden>
            ›
          </span>
        ) : null}
      </div>
    </div>
  );

  if (unavailable) return body;
  return (
    <Link
      href={`/app/pet-feed/posts/${encodeURIComponent(summary.id)}`}
      className="block hover:opacity-95"
      aria-label={t(lang, "messages.openListing")}
    >
      {body}
    </Link>
  );
}

export function MessagesClient({
  lang,
  currentUserId,
  initialConversations,
  initialConversationId = null,
}: {
  lang: Lang;
  currentUserId: string | null;
  initialConversations: MessageConversation[];
  initialConversationId?: string | null;
}) {
  const [conversations, setConversations] = useState(() =>
    normalizeConversations(initialConversations),
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => initialConversationId || conversations[0]?.id || null,
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSendError("");
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(activeId)}`);
        const data = await res.json().catch(() => ({ data: [] }));
        if (!cancelled) {
          setMessages(normalizeMessages(data.data));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, has_unread: false } : c,
            ),
          );
        }
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!activeId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("c") === activeId) return;
    url.searchParams.set("c", activeId);
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [activeId]);

  const send = async () => {
    if (!activeId || sending) return;
    const body = draft.trim().slice(0, MESSAGE_MAX_LEN);
    if (!body) return;
    setDraft("");
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(activeId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setDraft(body);
        setSendError(t(lang, "messages.sendFailed"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      const msg: MessageItem = data.data || {
        id: String(Date.now()),
        body,
        sender_user_id: currentUserId || undefined,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                last_message_preview: body.slice(0, 160),
                last_message: body.slice(0, 160),
                last_message_at: msg.created_at || new Date().toISOString(),
                last_message_sender_user_id: currentUserId,
                has_unread: false,
              }
            : c,
        );
        return [...next].sort((a, b) =>
          String(b.last_message_at || b.updated_at || "").localeCompare(
            String(a.last_message_at || a.updated_at || ""),
          ),
        );
      });
    } catch {
      setDraft(body);
      setSendError(t(lang, "messages.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <h1 className="text-xl font-bold text-slate-900 mb-5">
        {t(lang, "messages.title")}
      </h1>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[520px]">
        <aside className="border-b md:border-b-0 md:border-r border-slate-100 max-h-[280px] md:max-h-[560px] overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                {t(lang, "messages.emptyTitle")}
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t(lang, "messages.emptyBody")}
              </p>
            </div>
          ) : (
            <ul>
              {conversations.map((c) => {
                const active = activeId === c.id;
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
                );
                const thumb = conversationListingThumb(c);
                const time = formatInboxTime(c.last_message_at || c.updated_at, lang);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-3 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        active ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#1E6FE8]">
                              🐾
                            </div>
                          )}
                          {c.has_unread ? (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#1E6FE8] ring-2 ring-white" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`truncate text-sm ${
                                c.has_unread
                                  ? "font-bold text-slate-900"
                                  : "font-semibold text-slate-800"
                              }`}
                            >
                              {peer}
                            </p>
                            {time ? (
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {time}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
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
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[320px] flex-col">
          {!activeId || !activeConversation ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-400">
              {t(lang, "messages.selectConversation")}
            </div>
          ) : (
            <>
              <header className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {conversationPeerName(
                    activeConversation,
                    t(lang, "messages.peerFallback"),
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {conversationListingTitle(
                    activeConversation,
                    t(lang, "messages.listingFallback"),
                  )}
                </p>
              </header>

              <div className="px-4 pt-3">
                <ListingContextCard
                  lang={lang}
                  conversation={activeConversation}
                  currentUserId={currentUserId}
                />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 max-h-[360px]">
                {loading && messages.length === 0 ? (
                  <MessageThreadSkeleton />
                ) : null}
                {!loading && messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    {t(lang, "messages.threadEmpty")}
                  </p>
                ) : null}
                {messages.map((m) => {
                  const mine = isMineMessage(m, currentUserId);
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                          mine
                            ? "bg-[#1E6FE8] text-white rounded-br-md"
                            : "bg-slate-100 text-slate-800 rounded-bl-md"
                        }`}
                      >
                        {m.body}
                      </div>
                      {m.created_at ? (
                        <span className="mt-1 text-[10px] text-slate-400">
                          {formatMessageTime(m.created_at, lang)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t border-slate-100 p-3 space-y-2">
                {sendError ? (
                  <p className="text-xs text-red-600">{sendError}</p>
                ) : null}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX_LEN))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={t(lang, "messages.placeholder")}
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={sending || !draft.trim()}
                    className="px-4 py-2.5 bg-[#1E6FE8] text-white text-sm font-semibold rounded-full disabled:opacity-50"
                  >
                    {t(lang, "detail.send")}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        <Link href="/app/pet-feed" className="text-[#1E6FE8]">
          ← {t(lang, "nav.browse")}
        </Link>
      </p>
    </div>
  );
}
