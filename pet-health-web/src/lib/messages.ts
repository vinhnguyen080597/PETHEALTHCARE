import type { Lang } from "./types";

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
  sender_user_id?: string;
  sender_id?: string;
  created_at?: string;
  conversation_id?: string;
};

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
): string {
  const preview = String(
    conversation.last_message_preview || conversation.last_message || "",
  ).trim();
  return preview || emptyFallback;
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
  return raw.filter(
    (row): row is MessageItem =>
      Boolean(row && typeof row === "object" && typeof (row as MessageItem).id === "string"),
  );
}
