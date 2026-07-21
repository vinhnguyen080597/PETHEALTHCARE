import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PetFeedComment } from '../types';

export type PetFeedCommentThread = {
  root: PetFeedComment;
  replies: PetFeedComment[];
};

export function groupPetFeedCommentThreads(comments: PetFeedComment[]): PetFeedCommentThread[] {
  const roots = comments
    .filter((item) => !item.parent_id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const repliesByParent = new Map<string, PetFeedComment[]>();
  for (const item of comments) {
    if (!item.parent_id) continue;
    const list = repliesByParent.get(item.parent_id) ?? [];
    list.push(item);
    repliesByParent.set(item.parent_id, list);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }
  return roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) ?? [],
  }));
}

/**
 * Loads comments when a post detail modal opens; supports reply/delete and optimistic updates.
 */
export function usePetFeedPostComments(
  postId: string | null,
  fetchComments: ((id: string) => Promise<PetFeedComment[]>) | undefined,
  submitComment: ((id: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>) | undefined,
  deleteComment?: ((comment: PetFeedComment, removedCount?: number) => Promise<boolean>) | undefined,
) {
  const [comments, setComments] = useState<PetFeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<PetFeedComment | null>(null);

  useEffect(() => {
    if (!postId || !fetchComments) {
      setComments([]);
      setLoading(false);
      setReplyTo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setReplyTo(null);
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

  const threads = useMemo(() => groupPetFeedCommentThreads(comments), [comments]);

  const addComment = useCallback(
    async (body: string, parentId?: string | null) => {
      if (!postId || !submitComment) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;
      const effectiveParentId = parentId ?? replyTo?.id ?? null;
      setSubmitting(true);
      try {
        const created = await submitComment(postId, trimmed, effectiveParentId);
        if (created) {
          setComments((current) => [...current, created]);
          setReplyTo(null);
          return true;
        }
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [postId, replyTo?.id, submitComment],
  );

  const removeComment = useCallback(
    async (comment: PetFeedComment) => {
      if (!deleteComment) return false;
      const removedCount = 1 + comments.filter((item) => item.parent_id === comment.id).length;
      const ok = await deleteComment(comment, removedCount);
      if (!ok) return false;
      setComments((current) => current.filter((item) => item.id !== comment.id && item.parent_id !== comment.id));
      if (replyTo?.id === comment.id) setReplyTo(null);
      return true;
    },
    [comments, deleteComment, replyTo?.id],
  );

  return {
    comments,
    threads,
    loading,
    submitting,
    replyTo,
    setReplyTo,
    addComment,
    removeComment,
  };
}
