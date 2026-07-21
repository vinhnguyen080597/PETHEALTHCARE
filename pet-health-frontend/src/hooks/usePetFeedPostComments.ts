import { useCallback, useEffect, useState } from 'react';
import type { PetFeedComment } from '../types';

/**
 * Loads comments when a post detail modal opens; supports optimistic append on submit.
 */
export function usePetFeedPostComments(
  postId: string | null,
  fetchComments: ((id: string) => Promise<PetFeedComment[]>) | undefined,
  submitComment: ((id: string, body: string) => Promise<PetFeedComment | null>) | undefined,
) {
  const [comments, setComments] = useState<PetFeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId || !fetchComments) {
      setComments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchComments(postId)
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchComments, postId]);

  const addComment = useCallback(
    async (body: string) => {
      if (!postId || !submitComment) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;
      setSubmitting(true);
      try {
        const created = await submitComment(postId, trimmed);
        if (created) {
          setComments((current) => [...current, created]);
          return true;
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [postId, submitComment],
  );

  return { comments, loading, submitting, addComment };
}
