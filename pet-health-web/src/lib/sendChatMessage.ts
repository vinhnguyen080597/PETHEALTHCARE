import { DealSubmitError } from "./dealPhotoUpload";
import { fetchWithSession } from "./fetchWithSession";
import {
  buildOptimisticMessage,
  createOptimisticMessageId,
  inboxPreviewFromDraft,
  inboxPreviewFromMessage,
  MESSAGE_MAX_LEN,
  messageHasSendableContent,
  normalizeMessageMedia,
  removeMessageFromList,
  replaceMessageInList,
  type MessageItem,
} from "./messages";
import { uploadChatMediaFiles } from "./uploadChatMedia";

export type SendChatMessageError =
  | { kind: "send_failed" }
  | { kind: "upload_failed"; code?: string }
  | { kind: "video_too_large" };

export type SendChatMessageResult =
  | { ok: true; message: MessageItem }
  | { ok: false; error: SendChatMessageError };

export async function sendChatMessage(input: {
  conversationId: string;
  draft: string;
  files: File[];
  currentUserId: string | null;
  updateMessages: (updater: (prev: MessageItem[]) => MessageItem[]) => void;
  patchPreview: (preview: {
    body: string;
    at: string;
    senderId?: string | null;
  }) => void;
}): Promise<SendChatMessageResult> {
  const body = input.draft.trim().slice(0, MESSAGE_MAX_LEN);
  const pendingFiles = input.files;
  if (!messageHasSendableContent(body, pendingFiles.length)) {
    return { ok: false, error: { kind: "send_failed" } };
  }

  const optimisticId = createOptimisticMessageId();
  const localMediaUrls = pendingFiles.map((file) => URL.createObjectURL(file));
  const optimistic = buildOptimisticMessage({
    id: optimisticId,
    body,
    mediaUrls: localMediaUrls,
    senderUserId: input.currentUserId,
  });

  input.updateMessages((prev) => [...prev, optimistic]);
  input.patchPreview({
    body: inboxPreviewFromDraft(body, pendingFiles),
    at: optimistic.created_at || new Date().toISOString(),
    senderId: input.currentUserId,
  });

  try {
    let mediaUrls: string[] = [];
    if (pendingFiles.length) {
      mediaUrls = await uploadChatMediaFiles(pendingFiles);
    }
    const res = await fetchWithSession(
      `/api/messages/${encodeURIComponent(input.conversationId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, media_urls: mediaUrls }),
      },
    );
    if (!res.ok) {
      input.updateMessages((prev) => removeMessageFromList(prev, optimisticId));
      return { ok: false, error: { kind: "send_failed" } };
    }
    const data = await res.json().catch(() => ({}));
    const message: MessageItem = data.data || {
      id: String(Date.now()),
      body,
      media_urls: mediaUrls,
      sender_user_id: input.currentUserId || undefined,
      created_at: new Date().toISOString(),
    };
    message.media_urls = normalizeMessageMedia(message.media_urls ?? mediaUrls);
    input.updateMessages((prev) =>
      replaceMessageInList(prev, optimisticId, message),
    );
    input.patchPreview({
      body: inboxPreviewFromMessage(body, message.media_urls || mediaUrls),
      at: message.created_at || new Date().toISOString(),
      senderId: input.currentUserId,
    });
    return { ok: true, message };
  } catch (err) {
    input.updateMessages((prev) => removeMessageFromList(prev, optimisticId));
    if (err instanceof DealSubmitError) {
      if (err.code === "PET_FEED_VIDEO_TOO_LARGE") {
        return { ok: false, error: { kind: "video_too_large", code: err.code } };
      }
      return { ok: false, error: { kind: "upload_failed", code: err.code } };
    }
    return { ok: false, error: { kind: "send_failed" } };
  } finally {
    for (const url of localMediaUrls) {
      URL.revokeObjectURL(url);
    }
  }
}
