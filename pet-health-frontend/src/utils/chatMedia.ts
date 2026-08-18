export const CHAT_MEDIA_PREVIEW_PHOTO = '[Photo]';
export const CHAT_MEDIA_PREVIEW_VIDEO = '[Video]';

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
  mediaLabels: { photo: string; video: string },
): string {
  const value = String(preview || '').trim();
  if (!value) return emptyFallback;
  if (value === CHAT_MEDIA_PREVIEW_PHOTO) return mediaLabels.photo;
  if (value === CHAT_MEDIA_PREVIEW_VIDEO) return mediaLabels.video;
  return value;
}
