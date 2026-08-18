"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { brandUi } from "@/lib/brand";
import {
  conversationListingTitle,
  conversationPeerName,
  formatMessageTime,
  inboxPreviewFromMessage,
  isMineMessage,
  mergeMessageLists,
  MESSAGE_MAX_LEN,
  messageHasSendableContent,
  MESSAGES_POLL_MS,
  normalizeMessageMedia,
  normalizeMessages,
  type MessageItem,
} from "@/lib/messages";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { ListingContextCard } from "@/components/messages/ListingContextCard";
import { ChatComposer } from "@/components/messages/ChatComposer";
import { ChatMessageMedia } from "@/components/messages/ChatMessageMedia";
import { MessageThreadSkeleton } from "@/components/ui/Skeleton";
import { uploadChatMediaFiles } from "@/lib/uploadChatMedia";
import { DealSubmitError } from "@/lib/dealPhotoUpload";

export function FloatingChatWindow() {
  const dock = useOptionalChatDock();
  const conversationId = dock?.activeChatId || null;
  const conversation =
    dock?.conversations.find((c) => c.id === conversationId) || null;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setDraft("");
      setFiles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSendError("");
      try {
        const res = await fetch(
          `/api/messages/${encodeURIComponent(conversationId)}`,
        );
        const data = await res.json().catch(() => ({ data: [] }));
        if (!cancelled) {
          setMessages(normalizeMessages(data.data));
          dock?.markConversationRead(conversationId);
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
    // Load this thread only — dock identity is stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!conversationId || dock?.chatMinimized) return;
    let cancelled = false;
    const refresh = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const res = await fetch(
          `/api/messages/${encodeURIComponent(conversationId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = await res.json().catch(() => ({ data: [] }));
        if (cancelled) return;
        setMessages((prev) => mergeMessageLists(prev, normalizeMessages(json.data)));
        dock?.markConversationRead(conversationId);
      } catch {
        // Ignore transient poll errors.
      }
    };
    const id = window.setInterval(() => {
      void refresh();
    }, MESSAGES_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, dock?.chatMinimized]);

  if (!dock || !conversationId) return null;

  const {
    lang,
    currentUserId,
    chatMinimized,
    closeChat,
    setChatMinimized,
    patchConversationPreview,
  } = dock;
  const peer = conversationPeerName(
    conversation || { id: conversationId },
    t(lang, "messages.peerFallback"),
  );
  const isFarmEntry = conversation?.entry_context === "breeder";
  const listing = conversation
    ? conversationListingTitle(conversation, t(lang, "messages.listingFallback"))
    : "";

  const send = async () => {
    if (sending) return;
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
      const res = await fetch(
        `/api/messages/${encodeURIComponent(conversationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, media_urls: mediaUrls }),
        },
      );
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
      msg.media_urls = normalizeMessageMedia(msg.media_urls ?? mediaUrls);
      setMessages((prev) => [...prev, msg]);
      patchConversationPreview(conversationId, {
        body: inboxPreviewFromMessage(body, msg.media_urls || mediaUrls),
        at: msg.created_at || new Date().toISOString(),
        senderId: currentUserId,
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

  if (chatMinimized) {
    return (
      <div className="fixed bottom-0 right-3 z-40 w-[min(calc(100vw-1.5rem),20rem)] md:right-5">
        <button
          type="button"
          onClick={() => setChatMinimized(false)}
          className="flex w-full items-center justify-between gap-2 rounded-t-xl border border-b-0 border-[#F0E6D8] bg-white px-3 py-2.5 text-left shadow-[0_-8px_30px_-12px_rgba(43,30,25,0.35)]"
          aria-label={t(lang, "messages.expandChat")}
        >
          <span className="truncate text-sm font-bold text-slate-900">{peer}</span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-amber-50"
            onClick={(e) => {
              e.stopPropagation();
              closeChat();
            }}
            role="button"
            tabIndex={0}
            aria-label={t(lang, "messages.closeChat")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                closeChat();
              }
            }}
          >
            ×
          </span>
        </button>
      </div>
    );
  }

  return (
    <section
      className="fixed z-40 flex flex-col overflow-hidden border border-[#F0E6D8] bg-white shadow-[0_18px_50px_-18px_rgba(43,30,25,0.45)] max-md:inset-x-0 max-md:bottom-0 max-md:top-16 max-md:rounded-none md:right-5 md:bottom-0 md:h-[min(32rem,calc(100vh-5.5rem))] md:w-[22.5rem] md:rounded-t-xl"
      aria-label={peer}
    >
      <header className="flex items-center gap-2 border-b border-[#F0E6D8] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{peer}</p>
          {isFarmEntry ? (
            <p className="truncate text-xs text-slate-500">
              {t(lang, "messages.chatWithFarm")}
            </p>
          ) : listing ? (
            <p className="truncate text-xs text-slate-500">{listing}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setChatMinimized(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-amber-50"
          aria-label={t(lang, "messages.minimizeChat")}
        >
          −
        </button>
        <button
          type="button"
          onClick={closeChat}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-amber-50"
          aria-label={t(lang, "messages.closeChat")}
        >
          ×
        </button>
      </header>

      {conversation ? (
        <div className="px-3 pt-2.5">
          <ListingContextCard
            lang={lang}
            conversation={conversation}
            currentUserId={currentUserId}
            compact
            variant={isFarmEntry ? "breeder" : "listing"}
          />
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {loading && messages.length === 0 ? <MessageThreadSkeleton /> : null}
        {!loading && messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
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
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-5 ${
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
        compact
        onSend={() => void send()}
      />
    </section>
  );
}
