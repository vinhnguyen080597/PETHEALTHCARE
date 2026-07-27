import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedComment } from '../types';
import type { PetFeedCommentThread } from '../hooks/usePetFeedPostComments';

function confirmDeleteComment(title: string, body: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    // RN Web Alert.alert ignores multi-button callbacks — use window.confirm instead.
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${body}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function formatCommentTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(locale.startsWith('vi') ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type CommentRowProps = {
  comment: PetFeedComment;
  currentUserId?: string | null;
  isReply?: boolean;
  highlighted?: boolean;
  measureRelativeTo?: RefObject<View | null>;
  onMeasuredOffsetY?: (y: number) => void;
  onReply?: (comment: PetFeedComment) => void;
  onDelete?: (comment: PetFeedComment) => void;
};

function CommentRow({
  comment,
  currentUserId,
  isReply = false,
  highlighted = false,
  measureRelativeTo,
  onMeasuredOffsetY,
  onReply,
  onDelete,
}: CommentRowProps) {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<View>(null);
  const isOwn = Boolean(
    currentUserId
    && comment.user_id
    && String(currentUserId).trim() === String(comment.user_id).trim(),
  );
  const canReply = !isReply && Boolean(onReply);
  const canDelete = isOwn && Boolean(onDelete);
  const hasActions = canReply || canDelete;

  useEffect(() => {
    if (!highlighted || !onMeasuredOffsetY) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const row = rowRef.current;
      const relative = measureRelativeTo?.current;
      if (!row || !relative || cancelled) return;
      row.measureLayout(
        // RN measureLayout accepts a host instance; cast keeps TS quiet across fabric/paper.
        relative as never,
        (_x, y) => {
          if (!cancelled) onMeasuredOffsetY(y);
        },
        () => {},
      );
    }, 64);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [highlighted, measureRelativeTo, onMeasuredOffsetY]);

  async function handleDelete() {
    setMenuOpen(false);
    const ok = await confirmDeleteComment(
      t('petFeed.comments.deleteTitle'),
      t('petFeed.comments.deleteBody'),
      t('petFeed.comments.delete'),
      t('common.cancel'),
    );
    if (ok) onDelete?.(comment);
  }

  function handleReply() {
    setMenuOpen(false);
    onReply?.(comment);
  }

  return (
    <View
      ref={rowRef}
      collapsable={false}
      className={`rounded-xl px-3 py-2.5 ${
        highlighted
          ? 'border border-blue-300 bg-blue-50'
          : `bg-slate-50 ${isReply ? 'ml-5 border-l-2 border-blue-100' : ''}`
      } ${isReply && highlighted ? 'ml-5' : ''}`}
    >
      <View className="flex-row items-start gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
            {comment.author_display_name || t('petFeed.comments.anonymous')}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-700">{comment.body}</Text>
        </View>
        <View className="items-end pt-0.5">
          <Text className="text-xs text-slate-400">{formatCommentTime(comment.created_at, i18n.language)}</Text>
          {hasActions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('petFeed.comments.moreActions')}
              className="mt-1 h-7 w-7 items-center justify-center rounded-full active:bg-slate-200"
              hitSlop={8}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/30" onPress={() => setMenuOpen(false)}>
          <Pressable
            className="rounded-t-2xl border-t border-gray-200 bg-white px-4 pb-8 pt-2"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-slate-300" />
            </View>
            <Text className="mb-2 px-1 text-sm font-semibold text-slate-500">{t('petFeed.comments.actionsTitle')}</Text>
            {canReply ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.comments.reply')}
                className="flex-row items-center gap-3 rounded-xl px-2 py-3.5 active:bg-slate-50"
                onPress={handleReply}
              >
                <Ionicons name="arrow-undo-outline" size={20} color="#2563eb" />
                <Text className="text-base font-semibold text-blue-600">{t('petFeed.comments.reply')}</Text>
              </Pressable>
            ) : null}
            {canDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('petFeed.comments.delete')}
                className="flex-row items-center gap-3 rounded-xl px-2 py-3.5 active:bg-red-50"
                onPress={() => void handleDelete()}
              >
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
                <Text className="text-base font-semibold text-red-600">{t('petFeed.comments.delete')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              className="mt-1 items-center rounded-xl bg-slate-100 px-2 py-3.5 active:bg-slate-200"
              onPress={() => setMenuOpen(false)}
            >
              <Text className="text-base font-semibold text-slate-700">{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type PetFeedCommentsSectionProps = {
  threads: PetFeedCommentThread[];
  loading: boolean;
  currentUserId?: string | null;
  focusCommentId?: string | null;
  onFocusCommentOffset?: (offsetY: number) => void;
  onReply?: (comment: PetFeedComment) => void;
  onDelete?: (comment: PetFeedComment) => void;
};

export function PetFeedCommentsSection({
  threads,
  loading,
  currentUserId,
  focusCommentId = null,
  onFocusCommentOffset,
  onReply,
  onDelete,
}: PetFeedCommentsSectionProps) {
  const { t } = useTranslation();
  const sectionRef = useRef<View>(null);
  const reportedFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    reportedFocusIdRef.current = null;
  }, [focusCommentId]);

  useEffect(() => {
    if (!focusCommentId || loading) return;
    const exists = threads.some(
      (thread) => thread.root.id === focusCommentId || thread.replies.some((reply) => reply.id === focusCommentId),
    );
    if (!exists) {
      onFocusCommentOffset?.(-1);
    }
  }, [focusCommentId, loading, onFocusCommentOffset, threads]);

  function handleMeasuredOffsetY(y: number) {
    if (!focusCommentId || reportedFocusIdRef.current === focusCommentId) return;
    reportedFocusIdRef.current = focusCommentId;
    onFocusCommentOffset?.(y);
  }

  return (
    <View ref={sectionRef} collapsable={false} className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">{t('petFeed.comments.title')}</Text>
      {loading ? (
        <View className="mt-3 gap-3">
          {[0, 1, 2].map((item) => (
            <View key={item} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <View className="flex-row items-start justify-between gap-2">
                <View className="min-w-0 flex-1 gap-2">
                  <View className="h-4 w-1/3 rounded-full bg-slate-200" />
                  <View className="h-4 w-4/5 rounded-full bg-slate-200" />
                  <View className="h-4 w-2/5 rounded-full bg-slate-200" />
                </View>
                <View className="items-end gap-2">
                  <View className="h-3 w-14 rounded-full bg-slate-200" />
                  <View className="h-5 w-5 rounded-full bg-slate-200" />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : threads.length === 0 ? (
        <Text className="mt-3 text-sm leading-5 text-slate-500">{t('petFeed.comments.empty')}</Text>
      ) : (
        <View className="mt-3 gap-3">
          {threads.map((thread) => (
            <View key={thread.root.id} className="gap-2">
              <CommentRow
                comment={thread.root}
                currentUserId={currentUserId}
                highlighted={focusCommentId === thread.root.id}
                measureRelativeTo={sectionRef}
                onMeasuredOffsetY={focusCommentId === thread.root.id ? handleMeasuredOffsetY : undefined}
                onReply={onReply}
                onDelete={onDelete}
              />
              {thread.replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isReply
                  highlighted={focusCommentId === reply.id}
                  measureRelativeTo={sectionRef}
                  onMeasuredOffsetY={focusCommentId === reply.id ? handleMeasuredOffsetY : undefined}
                  onDelete={onDelete}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type PetFeedCommentComposerProps = {
  submitting: boolean;
  replyTo?: PetFeedComment | null;
  onCancelReply?: () => void;
  onSubmit: (body: string) => Promise<boolean>;
};

export function PetFeedCommentComposer({
  submitting,
  replyTo,
  onCancelReply,
  onSubmit,
}: PetFeedCommentComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    const ok = await onSubmit(trimmed);
    if (ok) setDraft('');
  }

  return (
    <View className="px-4 py-3">
      {replyTo ? (
        <View className="mb-2 flex-row items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2">
          <Text className="min-w-0 flex-1 text-xs text-blue-700" numberOfLines={1}>
            {t('petFeed.comments.replyingTo', { name: replyTo.author_display_name || t('petFeed.comments.anonymous') })}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onCancelReply}>
            <Ionicons name="close" size={16} color="#1d4ed8" />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-end gap-2">
        <TextInput
          testID="pet-feed-comment-input"
          accessibilityLabel={t('petFeed.comments.inputLabel')}
          className="min-h-[44px] flex-1 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
          placeholder={replyTo ? t('petFeed.comments.replyPlaceholder') : t('petFeed.comments.placeholder')}
          placeholderTextColor="#94a3b8"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={800}
          editable={!submitting}
        />
        <Pressable
          testID="pet-feed-comment-submit"
          accessibilityRole="button"
          accessibilityLabel={t('petFeed.comments.submit')}
          accessibilityState={{ disabled: submitting || !draft.trim() }}
          className={`h-11 w-11 items-center justify-center rounded-xl ${draft.trim() && !submitting ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
          disabled={submitting || !draft.trim()}
          onPress={() => void handleSubmit()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color={draft.trim() ? '#fff' : '#94a3b8'} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
