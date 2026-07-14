import type { PetFeedPost } from '../types';

/**
 * Prefer full detail payload when available; overlay `is_favorited` from the list row
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
    return { ...detailPost, is_favorited: listPost.is_favorited };
  }
  return listPost;
}
