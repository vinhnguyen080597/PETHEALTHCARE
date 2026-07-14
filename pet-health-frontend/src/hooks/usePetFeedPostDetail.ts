import { useEffect, useMemo, useState } from 'react';
import type { PetFeedPost } from '../types';
import { resolvePetFeedPostDetailView } from '../utils/petFeedPostDetail';

/**
 * Opens a post detail from list data first (slim DTO), then upgrades via GET /posts/:id.
 * Overlays `is_favorited` from the list so favorite toggles stay in sync.
 */
export function usePetFeedPostDetail(
  selectedPostId: string | null,
  listPosts: PetFeedPost[],
  fetchDetail: ((postId: string) => Promise<PetFeedPost | null>) | undefined,
) {
  const listPost = useMemo(
    () => (selectedPostId ? listPosts.find((post) => post.id === selectedPostId) ?? null : null),
    [listPosts, selectedPostId],
  );
  const [detailPost, setDetailPost] = useState<PetFeedPost | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedPostId) {
      setDetailPost(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailPost(null);
    setDetailLoading(Boolean(fetchDetail));

    if (!fetchDetail) {
      setDetailLoading(false);
      return;
    }

    void fetchDetail(selectedPostId)
      .then((full) => {
        if (cancelled) return;
        if (full) setDetailPost(full);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchDetail, selectedPostId]);

  const selectedPost = useMemo(
    () => resolvePetFeedPostDetailView(selectedPostId, listPost, detailPost),
    [detailPost, listPost, selectedPostId],
  );

  return { selectedPost, detailLoading };
}
