import type { Lang } from "./types";

/** Full-page inbox (account shortcut / fallback when dock cannot open). */
export const MESSAGES_PAGE_HREF = "/app/messages";

/** Header inbox dropdown: show every conversation. */
export const INBOX_FILTER_ALL = "all";
/** Header inbox dropdown: unread threads only. */
export const INBOX_FILTER_UNREAD = "unread";

export const INBOX_FILTERS = [INBOX_FILTER_ALL, INBOX_FILTER_UNREAD] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const MESSAGE_MAX_LEN = 2000;
export const CHAT_MEDIA_MAX = 4;
export const CHAT_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const CHAT_MEDIA_PREVIEW_PHOTO = "[Photo]";
export const CHAT_MEDIA_PREVIEW_VIDEO = "[Video]";
export const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CHAT_VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,video/3gpp";
export const CHAT_MEDIA_ACCEPT = `${CHAT_IMAGE_ACCEPT},${CHAT_VIDEO_ACCEPT}`;

/** Open the floating chat dock for one conversation (header / listing CTAs). */
export const PHC_OPEN_CHAT_EVENT = "phc:open-chat";
/** Toggle the header inbox popover without navigating. */
export const PHC_TOGGLE_INBOX_EVENT = "phc:toggle-inbox";

export type MessageConversationPostSummary = {
  id: string;
  title: string;
  thumb_url: string | null;
  price_note?: string;
  species?: string;
  breed?: string;
  location?: string;
  status?: string;
};

export type MessageConversation = {
  id: string;
  post_id?: string;
  sen_user_id?: string;
  breeder_user_id?: string;
  last_message_at?: string | null;
  last_message_preview?: string;
  last_message?: string;
  last_message_sender_user_id?: string | null;
  post_title?: string;
  post_thumb_url?: string | null;
  post_summary?: MessageConversationPostSummary | null;
  peer_display_name?: string;
  peer_user_id?: string | null;
  has_unread?: boolean;
  title?: string;
  updated_at?: string;
};

export type MessageItem = {
  id: string;
  body?: string;
  media_urls?: string[];
  sender_user_id?: string;
  sender_id?: string;
  created_at?: string;
  conversation_id?: string;
};

export type ChatMediaPickError = "unsupported" | "too_many" | "video_too_large";

export function conversationPeerName(
  conversation: Pick<MessageConversation, "peer_display_name" | "title" | "id">,
  peerFallback: string,
): string {
  const peer = String(conversation.peer_display_name || "").trim();
  if (peer) return peer;
  const title = String(conversation.title || "").trim();
  if (title) return title;
  return peerFallback;
}

export function conversationListingTitle(
  conversation: Pick<MessageConversation, "post_title" | "post_summary" | "title">,
  listingFallback: string,
): string {
  const fromSummary = String(conversation.post_summary?.title || "").trim();
  if (fromSummary) return fromSummary;
  const fromPost = String(conversation.post_title || "").trim();
  if (fromPost) return fromPost;
  const title = String(conversation.title || "").trim();
  if (title) return title;
  return listingFallback;
}

export function conversationListingThumb(
  conversation: Pick<MessageConversation, "post_thumb_url" | "post_summary">,
): string | null {
  const fromSummary = conversation.post_summary?.thumb_url;
  if (typeof fromSummary === "string" && fromSummary.trim()) return fromSummary.trim();
  const thumb = conversation.post_thumb_url;
  if (typeof thumb === "string" && thumb.trim()) return thumb.trim();
  return null;
}

export function conversationPreview(
  conversation: Pick<MessageConversation, "last_message_preview" | "last_message">,
  emptyFallback: string,
  mediaLabels?: { photo: string; video: string },
): string {
  const preview = String(
    conversation.last_message_preview || conversation.last_message || "",
  ).trim();
  if (!preview) return emptyFallback;
  if (preview === CHAT_MEDIA_PREVIEW_PHOTO) {
    return mediaLabels?.photo || preview;
  }
  if (preview === CHAT_MEDIA_PREVIEW_VIDEO) {
    return mediaLabels?.video || preview;
  }
  return preview;
}

export function normalizeMessageMedia(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= CHAT_MEDIA_MAX) break;
    const url = typeof item === "string" ? item.trim() : "";
    if (!url) continue;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("memory://") && !url.startsWith("blob:")) {
      continue;
    }
    out.push(url);
  }
  return out;
}

export function isChatVideoUrl(url: string): boolean {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("/pet-feed/videos/")) return true;
  try {
    return /\.(mp4|mov|webm|3gp|m4v)(\?|$)/i.test(new URL(value).pathname);
  } catch {
    return /\.(mp4|mov|webm|3gp|m4v)(\?|$)/i.test(value);
  }
}

export function chatMediaKindFromFile(file: {
  type?: string;
  name?: string;
}): "image" | "video" | null {
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type)
      ? "image"
      : null;
  }
  if (type.startsWith("video/")) {
    return ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"].includes(
      type,
    )
      ? "video"
      : null;
  }
  const name = String(file.name || "").toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(name)) return "image";
  if (/\.(mp4|mov|webm|3gp|m4v)$/.test(name)) return "video";
  return null;
}

export function messageHasSendableContent(
  body: string,
  mediaCount: number,
): boolean {
  return Boolean(String(body || "").trim()) || mediaCount > 0;
}

export function inboxPreviewFromMessage(
  body: string,
  mediaUrls: string[],
): string {
  const text = String(body || "").trim();
  if (text) return text.slice(0, 160);
  if (mediaUrls.some(isChatVideoUrl)) return CHAT_MEDIA_PREVIEW_VIDEO;
  if (mediaUrls.length) return CHAT_MEDIA_PREVIEW_PHOTO;
  return "";
}

export function appendChatMediaFiles(
  existing: File[],
  incoming: FileList | File[] | null | undefined,
  max = CHAT_MEDIA_MAX,
  maxVideoBytes = CHAT_VIDEO_MAX_BYTES,
): { files: File[]; error: ChatMediaPickError | null } {
  const cap = Math.max(0, Math.floor(max));
  const next = Array.isArray(incoming)
    ? incoming
    : incoming
      ? Array.from(incoming)
      : [];
  const files = [...existing];
  let error: ChatMediaPickError | null = null;
  for (const file of next) {
    if (!file || file.size <= 0) continue;
    if (files.length >= cap) {
      error = "too_many";
      break;
    }
    const kind = chatMediaKindFromFile(file);
    if (!kind) {
      error = error || "unsupported";
      continue;
    }
    if (kind === "video" && file.size > maxVideoBytes) {
      error = error || "video_too_large";
      continue;
    }
    files.push(file);
  }
  return { files, error };
}

export function countUnreadConversations(
  conversations: Array<Pick<MessageConversation, "has_unread">>,
): number {
  return conversations.filter((c) => c.has_unread).length;
}

export function messageSenderId(message: MessageItem): string {
  return String(message.sender_user_id || message.sender_id || "").trim();
}

export function isMineMessage(
  message: MessageItem,
  currentUserId: string | null | undefined,
): boolean {
  const current = String(currentUserId || "").trim();
  const sender = messageSenderId(message);
  return Boolean(current && sender && current === sender);
}

export function formatInboxTime(
  value: string | null | undefined,
  lang: Lang,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(lang === "VI" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMessageTime(
  value: string | null | undefined,
  lang: Lang,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString(lang === "VI" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveConversationPostSummary(
  conversation: MessageConversation | null | undefined,
): MessageConversationPostSummary | null {
  if (!conversation) return null;
  if (conversation.post_summary?.id) return conversation.post_summary;
  const postId = String(conversation.post_id || "").trim();
  if (!postId) return null;
  return {
    id: postId,
    title: conversation.post_title || "",
    thumb_url: conversation.post_thumb_url ?? null,
    price_note: "",
    species: "",
    breed: "",
    location: "",
    status: "published",
  };
}

export function isConversationBreederViewer(
  conversation: Pick<MessageConversation, "breeder_user_id"> | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  const current = String(currentUserId || "").trim();
  const breeder = String(conversation?.breeder_user_id || "").trim();
  return Boolean(current && breeder && current === breeder);
}

export function normalizeConversations(raw: unknown): MessageConversation[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is MessageConversation =>
      Boolean(row && typeof row === "object" && typeof (row as MessageConversation).id === "string"),
  );
}

export function normalizeMessages(raw: unknown): MessageItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (row): row is MessageItem =>
        Boolean(row && typeof row === "object" && typeof (row as MessageItem).id === "string"),
    )
    .map((row) => ({
      ...row,
      media_urls: normalizeMessageMedia(row.media_urls),
    }));
}

/** Poll interval while Messages page is open (near-realtime without websocket). */
export const MESSAGES_POLL_MS = 5_000;

/** Inbox / chat badge poll (matches notification bell cadence). */
export const MESSAGES_UNREAD_POLL_MS = 30_000;

export function messagesPageHref(
  conversationId?: string | null,
): string {
  const id = String(conversationId || "").trim();
  if (!id) return MESSAGES_PAGE_HREF;
  return `${MESSAGES_PAGE_HREF}?c=${encodeURIComponent(id)}`;
}

export function requestOpenChat(
  conversationId: string | null | undefined,
): boolean {
  const id = String(conversationId || "").trim();
  if (!id || typeof window === "undefined") return false;
  window.dispatchEvent(
    new CustomEvent(PHC_OPEN_CHAT_EVENT, { detail: { conversationId: id } }),
  );
  return true;
}

export function requestToggleInbox(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PHC_TOGGLE_INBOX_EVENT));
}

/** Prefer the floating dock; fall back to the messages page when no thread id. */
export function openConversationUi(
  conversationId: string | null | undefined,
  navigate: (href: string) => void,
): void {
  if (requestOpenChat(conversationId)) return;
  navigate(messagesPageHref(conversationId));
}

export function conversationSearchHaystack(
  conversation: MessageConversation,
): string {
  return [
    conversationPeerName(conversation, ""),
    conversationListingTitle(conversation, ""),
    conversationPreview(conversation, ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function filterInboxConversations(
  conversations: MessageConversation[],
  options: { query?: string; filter?: InboxFilter } = {},
): MessageConversation[] {
  const query = String(options.query || "").trim().toLowerCase();
  const unreadOnly = options.filter === INBOX_FILTER_UNREAD;
  return conversations.filter((c) => {
    if (unreadOnly && !c.has_unread) return false;
    if (!query) return true;
    return conversationSearchHaystack(c).includes(query);
  });
}

/** Facebook-style inbox timestamps: 5m / 4 ngày / 1 tuần. */
export function formatInboxRelativeTime(
  value: string | null | undefined,
  lang: Lang,
  nowMs = Date.now(),
): string {
  if (!value) return "";
  const date = new Date(value);
  const ts = date.getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Math.max(0, nowMs - ts);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diff < minute) return lang === "VI" ? "Vừa xong" : "Just now";
  if (diff < hour) {
    const n = Math.max(1, Math.floor(diff / minute));
    return lang === "VI" ? `${n} phút` : `${n}m`;
  }
  if (diff < day) {
    const n = Math.max(1, Math.floor(diff / hour));
    return lang === "VI" ? `${n} giờ` : `${n}h`;
  }
  if (diff < week) {
    const n = Math.max(1, Math.floor(diff / day));
    return lang === "VI" ? `${n} ngày` : `${n}d`;
  }
  if (diff < 5 * week) {
    const n = Math.max(1, Math.floor(diff / week));
    return lang === "VI" ? `${n} tuần` : `${n}w`;
  }
  return date.toLocaleDateString(lang === "VI" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

/** Merge server messages into local thread without dropping optimistic sends. */
export function mergeMessageLists(
  local: MessageItem[],
  remote: MessageItem[],
): MessageItem[] {
  const byId = new Map<string, MessageItem>();
  for (const row of local) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of remote) {
    if (row?.id) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || "")),
  );
}

/** Prefer fresher remote inbox rows; keep local-only drafts if any. */
export function mergeConversationLists(
  local: MessageConversation[],
  remote: MessageConversation[],
): MessageConversation[] {
  const byId = new Map<string, MessageConversation>();
  for (const row of local) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of remote) {
    if (!row?.id) continue;
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? { ...prev, ...row } : row);
  }
  return [...byId.values()].sort((a, b) =>
    String(b.last_message_at || b.updated_at || "").localeCompare(
      String(a.last_message_at || a.updated_at || ""),
    ),
  );
}
