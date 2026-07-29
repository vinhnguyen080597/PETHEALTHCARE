import type { TFunction } from 'i18next';

type PostTimestamps = {
  created_at?: string | null;
  updated_at?: string | null;
};

export function formatPetFeedPostDateTime(iso: string | null | undefined, language: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(language.startsWith('vi') ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function petFeedPostWasUpdated(post: PostTimestamps) {
  if (!post.updated_at) return false;
  const created = new Date(post.created_at ?? '').getTime();
  const updated = new Date(post.updated_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  return updated - created > 60_000;
}

export function formatPetFeedPostTimeLabel(post: PostTimestamps, t: TFunction, language: string) {
  const postedAt = formatPetFeedPostDateTime(post.created_at, language);
  if (!postedAt) return '';
  const updatedAt = petFeedPostWasUpdated(post)
    ? formatPetFeedPostDateTime(post.updated_at, language)
    : '';
  if (updatedAt) {
    return `${t('petFeed.postedAt', { time: postedAt })} · ${t('petFeed.updatedAt', { time: updatedAt })}`;
  }
  return t('petFeed.postedAt', { time: postedAt });
}
