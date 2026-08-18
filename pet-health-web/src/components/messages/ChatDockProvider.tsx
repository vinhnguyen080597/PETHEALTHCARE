"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/types";
import {
  countUnreadConversations,
  mergeConversationLists,
  MESSAGES_POLL_MS,
  MESSAGES_UNREAD_POLL_MS,
  normalizeConversations,
  PHC_OPEN_CHAT_EVENT,
  PHC_TOGGLE_INBOX_EVENT,
  type MessageConversation,
} from "@/lib/messages";

type ChatDockContextValue = {
  lang: Lang;
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
  inboxOpen: boolean;
  setInboxOpen: (open: boolean) => void;
  toggleInbox: () => void;
  conversations: MessageConversation[];
  inboxLoading: boolean;
  unreadCount: number;
  activeChatId: string | null;
  chatMinimized: boolean;
  openChat: (conversationId: string) => void;
  closeChat: () => void;
  setChatMinimized: (minimized: boolean) => void;
  enableInboxPolling: () => void;
  refreshInbox: () => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  patchConversationPreview: (
    conversationId: string,
    preview: { body: string; at: string; senderId?: string | null },
  ) => void;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

export function useChatDock(): ChatDockContextValue {
  const ctx = useContext(ChatDockContext);
  if (!ctx) {
    throw new Error("useChatDock must be used within ChatDockProvider");
  }
  return ctx;
}

export function useOptionalChatDock(): ChatDockContextValue | null {
  return useContext(ChatDockContext);
}

async function fetchInbox(): Promise<MessageConversation[]> {
  const res = await fetch("/api/messages", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ data: [] }));
  return normalizeConversations(data.data);
}

export function ChatDockProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMinimized, setChatMinimized] = useState(false);

  const unreadCount = useMemo(
    () => countUnreadConversations(conversations),
    [conversations],
  );

  const refreshInbox = useCallback(async () => {
    try {
      const remote = await fetchInbox();
      setConversations((prev) => mergeConversationLists(prev, remote));
    } catch {
      // Ignore transient poll errors.
    }
  }, []);

  const openChat = useCallback(
    (conversationId: string) => {
      const id = String(conversationId || "").trim();
      if (!id) return;
      setInboxOpen(false);
      setActiveChatId(id);
      setChatMinimized(false);
      void refreshInbox();
    },
    [refreshInbox],
  );

  const closeChat = useCallback(() => {
    setActiveChatId(null);
    setChatMinimized(false);
  }, []);

  const toggleInbox = useCallback(() => {
    setInboxOpen((open) => !open);
  }, []);

  const enableInboxPolling = useCallback(() => {
    setPollingEnabled(true);
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, has_unread: false } : c,
      ),
    );
  }, []);

  const patchConversationPreview = useCallback(
    (
      conversationId: string,
      preview: { body: string; at: string; senderId?: string | null },
    ) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                last_message_preview: preview.body.slice(0, 160),
                last_message: preview.body.slice(0, 160),
                last_message_at: preview.at,
                last_message_sender_user_id: preview.senderId,
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
    },
    [],
  );

  useEffect(() => {
    const onOpenChat = (event: Event) => {
      const id = String(
        (event as CustomEvent<{ conversationId?: string }>).detail
          ?.conversationId || "",
      ).trim();
      if (id) openChat(id);
    };
    const onToggleInbox = () => toggleInbox();
    window.addEventListener(PHC_OPEN_CHAT_EVENT, onOpenChat);
    window.addEventListener(PHC_TOGGLE_INBOX_EVENT, onToggleInbox);
    return () => {
      window.removeEventListener(PHC_OPEN_CHAT_EVENT, onOpenChat);
      window.removeEventListener(PHC_TOGGLE_INBOX_EVENT, onToggleInbox);
    };
  }, [openChat, toggleInbox]);

  useEffect(() => {
    if (!inboxOpen) return;
    let cancelled = false;
    setInboxLoading(conversations.length === 0);
    (async () => {
      try {
        const remote = await fetchInbox();
        if (!cancelled) {
          setConversations((prev) => mergeConversationLists(prev, remote));
        }
      } catch {
        // Keep last known inbox.
      } finally {
        if (!cancelled) setInboxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Fetch when the dropdown opens — do not refetch on every inbox row patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxOpen]);

  useEffect(() => {
    if (!pollingEnabled) return;
    let cancelled = false;

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const remote = await fetchInbox();
        if (!cancelled) {
          setConversations((prev) => mergeConversationLists(prev, remote));
        }
      } catch {
        // Ignore transient poll errors.
      }
    };

    void tick();
    const intervalMs = inboxOpen || activeChatId ? MESSAGES_POLL_MS : MESSAGES_UNREAD_POLL_MS;
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [pollingEnabled, inboxOpen, activeChatId]);

  const value = useMemo<ChatDockContextValue>(
    () => ({
      lang,
      currentUserId,
      setCurrentUserId,
      inboxOpen,
      setInboxOpen,
      toggleInbox,
      conversations,
      inboxLoading,
      unreadCount,
      activeChatId,
      chatMinimized,
      openChat,
      closeChat,
      setChatMinimized,
      enableInboxPolling,
      refreshInbox,
      markConversationRead,
      patchConversationPreview,
    }),
    [
      lang,
      currentUserId,
      inboxOpen,
      toggleInbox,
      conversations,
      inboxLoading,
      unreadCount,
      activeChatId,
      chatMinimized,
      openChat,
      closeChat,
      enableInboxPolling,
      refreshInbox,
      markConversationRead,
      patchConversationPreview,
    ],
  );

  return (
    <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>
  );
}
