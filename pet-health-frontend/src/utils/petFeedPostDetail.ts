import type { PetFeedPost } from '../types';

/**
 * Prefer full detail payload when available; overlay favorite state from the list row
 * so favorite toggles stay in sync while detail is open.
 */
export function resolvePetFeedPostDetailView(
  selectedPostId: string | null,
  listPost: PetFeedPost | null,
  detailPost: PetFeedPost | null,
): PetFeedPost | null {
  if (!selectedPostId) return null;
  if (detailPost?.id === selectedPostId) {
    if (!listPost) return detailPost;
    return {
      ...detailPost,
      is_favorited: listPost.is_favorited,
      favorite_count: listPost.favorite_count ?? detailPost.favorite_count,
      status: listPost.status ?? detailPost.status,
      metadata: listPost.metadata ?? detailPost.metadata,
    };
  }
  return listPost;
}

/** Hero + strip slots: list DTO may truncate media_urls but still send media_count + video_url. */
export function listingDetailMediaSlideCount(
  post: Pick<PetFeedPost, 'media_urls' | 'video_url' | 'media_count'>,
): number {
  const loadedImages = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean).length : 0;
  const imageCount = Math.max(Number(post.media_count) || 0, loadedImages);
  const hasVideo = Boolean(typeof post.video_url === 'string' && post.video_url.trim());
  return imageCount + (hasVideo ? 1 : 0);
}
