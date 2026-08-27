export const CHAT_MEDIA_PREVIEW_PHOTO = '[Photo]';
export const CHAT_MEDIA_PREVIEW_VIDEO = '[Video]';
export const CHAT_LISTING_SHARE_PREVIEW = '[Listing]';

export const MESSAGE_MAX_LEN = 2000;
export const CHAT_MEDIA_MAX = 4;
export const CHAT_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Web farm chat frame tokens. */
export const CHAT_UI = {
  accent: '#D97706',
  accentPressed: '#B45309',
  border: '#F0E6D8',
  peerBubble: '#F1F5F9',
  eyebrow: '#8B7355',
  threadBg: '#FDFBF7',
} as const;

export type ChatMediaKind = 'image' | 'video';
export type ChatMediaPickError = 'too_many' | 'unsupported' | 'video_too_large';

export type ChatAttachmentPick = {
  uri: string;
  kind: ChatMediaKind;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
};

export function isChatVideoUrl(url: string): boolean {
  const value = String(url || '').trim().toLowerCase();
  if (!value) return false;
  if (value.includes('/pet-feed/videos/')) return true;
  try {
    return /\.(mp4|mov|webm|3gp|m4v)(\?|$)/i.test(new URL(value).pathname);
  } catch {
    return /\.(mp4|mov|webm|3gp|m4v)(\?|$)/i.test(value);
  }
}

export function normalizeMessageMedia(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item) || item.startsWith('memory://'));
}

export function formatChatInboxPreview(
  preview: string | null | undefined,
  emptyFallback: string,
  mediaLabels: { photo: string; video: string; listing?: string },
): string {
  const value = String(preview || '').trim();
  if (!value) return emptyFallback;
  if (value === CHAT_MEDIA_PREVIEW_PHOTO) return mediaLabels.photo;
  if (value === CHAT_MEDIA_PREVIEW_VIDEO) return mediaLabels.video;
  if (value === CHAT_LISTING_SHARE_PREVIEW) return mediaLabels.listing || emptyFallback;
  return value;
}

export function chatMediaKindFromMeta(input: {
  mimeType?: string | null;
  fileName?: string | null;
  uri?: string | null;
}): ChatMediaKind | null {
  const type = String(input.mimeType || '').toLowerCase();
  if (type.startsWith('image/')) {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type) ? 'image' : null;
  }
  if (type.startsWith('video/')) {
    return ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'].includes(type) ? 'video' : null;
  }
  const name = String(input.fileName || input.uri || '').toLowerCase();
  if (/\.(jpe?g|png|webp)(\?|$)/.test(name)) return 'image';
  if (/\.(mp4|mov|webm|3gp|m4v)(\?|$)/.test(name)) return 'video';
  return null;
}

export function messageHasSendableContent(body: string, mediaCount: number): boolean {
  return Boolean(String(body || '').trim()) || mediaCount > 0;
}

export function inboxPreviewFromMessage(body: string, mediaUrls: string[]): string {
  const text = String(body || '').trim();
  if (text) return text.slice(0, 160);
  if (mediaUrls.some(isChatVideoUrl)) return CHAT_MEDIA_PREVIEW_VIDEO;
  if (mediaUrls.length) return CHAT_MEDIA_PREVIEW_PHOTO;
  return '';
}

/** Farm-entry threads have no listing post id. */
export function isFarmChatConversation(conversation: { post_id?: string | null } | null | undefined): boolean {
  return !String(conversation?.post_id || '').trim();
}

export function appendChatMediaPicks(
  existing: ChatAttachmentPick[],
  incoming: ChatAttachmentPick[],
  max = CHAT_MEDIA_MAX,
  maxVideoBytes = CHAT_VIDEO_MAX_BYTES,
): { files: ChatAttachmentPick[]; error: ChatMediaPickError | null } {
  const cap = Math.max(0, Math.floor(max));
  const files = [...existing];
  let error: ChatMediaPickError | null = null;
  for (const file of incoming) {
    if (!file?.uri?.trim()) continue;
    if (files.length >= cap) {
      error = 'too_many';
      break;
    }
    if (!file.kind) {
      error = error || 'unsupported';
      continue;
    }
    if (file.kind === 'video' && typeof file.fileSize === 'number' && file.fileSize > maxVideoBytes) {
      error = error || 'video_too_large';
      continue;
    }
    files.push(file);
  }
  return { files, error };
}
