"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import {
  conversationListingThumb,
  conversationListingTitle,
  conversationPeerName,
  conversationPreview,
  formatInboxTime,
  formatMessageTime,
  isMineMessage,
  mergeConversationLists,
  mergeMessageLists,
  MESSAGE_MAX_LEN,
  messageHasSendableContent,
  inboxPreviewFromMessage,
  MESSAGES_POLL_MS,
  normalizeConversations,
  normalizeMessages,
  type MessageConversation,
  type MessageItem,
} from "@/lib/messages";
import { MessageThreadSkeleton } from "@/components/ui/Skeleton";
import { ListingContextCard } from "@/components/messages/ListingContextCard";
import { ChatComposer } from "@/components/messages/ChatComposer";
import { ChatMessageMedia } from "@/components/messages/ChatMessageMedia";
import { brandUi } from "@/lib/brand";
import { uploadChatMediaFiles } from "@/lib/uploadChatMedia";
import { DealSubmitError } from "@/lib/dealPhotoUpload";

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
  const [files, setFiles] = useState<File[]>([]);
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
      setFiles([]);
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

  // Near-realtime: poll inbox + active thread while the Messages page is visible.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const inboxRes = await fetch("/api/messages", { cache: "no-store" });
        if (inboxRes.ok) {
          const inboxJson = await inboxRes.json().catch(() => ({ data: [] }));
          const remoteInbox = normalizeConversations(inboxJson.data);
          if (!cancelled && remoteInbox.length >= 0) {
            setConversations((prev) => mergeConversationLists(prev, remoteInbox));
          }
        }
      } catch {
        // Ignore transient poll errors.
      }

      if (!activeId || cancelled) return;
      try {
        const threadRes = await fetch(
          `/api/messages/${encodeURIComponent(activeId)}`,
          { cache: "no-store" },
        );
        if (!threadRes.ok) return;
        const threadJson = await threadRes.json().catch(() => ({ data: [] }));
        const remote = normalizeMessages(threadJson.data);
        if (cancelled) return;
        setMessages((prev) => mergeMessageLists(prev, remote));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, has_unread: false } : c,
          ),
        );
      } catch {
        // Ignore transient poll errors.
      }
    };

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, MESSAGES_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [activeId]);

  const send = async () => {
    if (!activeId || sending) return;
    const body = draft.trim().slice(0, MESSAGE_MAX_LEN);
    const pendingFiles = files;
    if (!messageHasSendableContent(body, pendingFiles.length)) return;
    setDraft("");
    setFiles([]);
    setSending(true);
    setSendError("");
    try {
      let mediaUrls: string[] = [];
      if (pendingFiles.length) {
        mediaUrls = await uploadChatMediaFiles(pendingFiles);
      }
      const res = await fetch(`/api/messages/${encodeURIComponent(activeId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, media_urls: mediaUrls }),
      });
      if (!res.ok) {
        setDraft(body);
        setFiles(pendingFiles);
        setSendError(t(lang, "messages.sendFailed"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      const msg: MessageItem = data.data || {
        id: String(Date.now()),
        body,
        media_urls: mediaUrls,
        sender_user_id: currentUserId || undefined,
        created_at: new Date().toISOString(),
      };
      msg.media_urls = msg.media_urls || mediaUrls;
      const preview = inboxPreviewFromMessage(body, msg.media_urls || mediaUrls);
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                last_message_preview: preview,
                last_message: preview,
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
    } catch (err) {
      setDraft(body);
      setFiles(pendingFiles);
      const code = err instanceof DealSubmitError ? err.code : "";
      setSendError(
        err instanceof DealSubmitError
          ? code === "PET_FEED_VIDEO_TOO_LARGE"
            ? t(lang, "messages.videoTooLarge")
            : t(lang, "messages.uploadFailed")
          : t(lang, "messages.sendFailed"),
      );
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
                  {
                    photo: t(lang, "messages.photo"),
                    video: t(lang, "messages.video"),
                  },
                );
                const thumb = conversationListingThumb(c);
                const time = formatInboxTime(c.last_message_at || c.updated_at, lang);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-3 py-3 border-b border-slate-50 hover:bg-amber-50/60 transition-colors ${
                        active ? brandUi.primarySoftBg : ""
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
                            <div className={`flex h-full w-full items-center justify-center ${brandUi.primaryText}`}>
                              🐾
                            </div>
                          )}
                          {c.has_unread ? (
                            <span
                              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${brandUi.primaryDot} ring-2 ring-white`}
                            />
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
                  const media = m.media_urls || [];
                  const text = String(m.body || "").trim();
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
                    >
                      {media.length ? <ChatMessageMedia urls={media} /> : null}
                      {text ? (
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                            mine
                              ? `${brandUi.primaryBg} text-white rounded-br-md`
                              : "bg-slate-100 text-slate-800 rounded-bl-md"
                          }`}
                        >
                          {text}
                        </div>
                      ) : null}
                      {m.created_at ? (
                        <span className="text-[10px] text-slate-400">
                          {formatMessageTime(m.created_at, lang)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <ChatComposer
                lang={lang}
                draft={draft}
                onDraftChange={setDraft}
                files={files}
                onFilesChange={setFiles}
                sending={sending}
                sendError={sendError}
                onSend={() => void send()}
              />
            </>
          )}
        </section>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        <Link href="/app/pet-feed" className={`${brandUi.primaryText} hover:underline`}>
          ← {t(lang, "nav.browse")}
        </Link>
      </p>
    </div>
  );
}
