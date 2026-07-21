import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import type { PetFeedComment } from '../types';
import type { PetFeedCommentThread } from '../hooks/usePetFeedPostComments';
import { ReportModal } from './ReportModal';

const PRIMARY = '#1E6FE8';

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
  onReply?: (comment: PetFeedComment) => void;
  onDelete?: (comment: PetFeedComment) => void;
  onReport?: (comment: PetFeedComment) => void;
};

function CommentRow({ comment, currentUserId, isReply = false, onReply, onDelete, onReport }: CommentRowProps) {
  const { t, i18n } = useTranslation();
  const isOwn = Boolean(
    currentUserId
    && comment.user_id
    && String(currentUserId).trim() === String(comment.user_id).trim(),
  );

  return (
    <View className={`rounded-xl bg-slate-50 px-3 py-2.5 ${isReply ? 'ml-5 border-l-2 border-blue-100' : ''}`}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
          {comment.author_display_name || t('petFeed.comments.anonymous')}
        </Text>
        <Text className="text-xs text-slate-400">{formatCommentTime(comment.created_at, i18n.language)}</Text>
      </View>
      <Text className="mt-1 text-sm leading-5 text-slate-700">{comment.body}</Text>
      <View className="mt-2 flex-row flex-wrap items-center gap-3">
        {!isReply && onReply ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.comments.reply')}
            onPress={() => onReply(comment)}
          >
            <Text className="text-xs font-semibold text-blue-600">{t('petFeed.comments.reply')}</Text>
          </Pressable>
        ) : null}
        {isOwn && onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.comments.delete')}
            onPress={() => {
              void confirmDeleteComment(
                t('petFeed.comments.deleteTitle'),
                t('petFeed.comments.deleteBody'),
                t('petFeed.comments.delete'),
                t('common.cancel'),
              ).then((ok) => {
                if (ok) onDelete(comment);
              });
            }}
          >
            <Text className="text-xs font-semibold text-red-600">{t('petFeed.comments.delete')}</Text>
          </Pressable>
        ) : null}
        {!isOwn && onReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.comments.report')}
            onPress={() => onReport(comment)}
          >
            <Text className="text-xs font-semibold text-slate-500">{t('petFeed.comments.report')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type PetFeedCommentsSectionProps = {
  threads: PetFeedCommentThread[];
  loading: boolean;
  currentUserId?: string | null;
  onReply?: (comment: PetFeedComment) => void;
  onDelete?: (comment: PetFeedComment) => void;
  onReport?: (comment: PetFeedComment, reason: string, note?: string) => void;
};

export function PetFeedCommentsSection({
  threads,
  loading,
  currentUserId,
  onReply,
  onDelete,
  onReport,
}: PetFeedCommentsSectionProps) {
  const { t } = useTranslation();
  const [reportComment, setReportComment] = useState<PetFeedComment | null>(null);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('abusive_content');
  const [reportNote, setReportNote] = useState('');

  function submitReport() {
    if (!reportComment || !onReport) return;
    onReport(reportComment, reportReason, reportNote);
    setReportComment(null);
    setReportNote('');
  }

  return (
    <>
      <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">{t('petFeed.comments.title')}</Text>
        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={PRIMARY} />
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
                  onReply={onReply}
                  onDelete={onDelete}
                  onReport={onReport ? setReportComment : undefined}
                />
                {thread.replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    isReply
                    onDelete={onDelete}
                    onReport={onReport ? setReportComment : undefined}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
      <ReportModal
        visible={reportComment != null}
        title={t('petFeed.comments.reportTitle')}
        body={t('petFeed.comments.reportBody')}
        reason={reportReason}
        note={reportNote}
        reasonLabel={(item) => t(`petFeed.reportReasons.${item}`)}
        notePlaceholder={t('petFeed.reportNotePlaceholder')}
        submitLabel={t('petFeed.submitReport')}
        onChangeReason={setReportReason}
        onChangeNote={setReportNote}
        onCancel={() => {
          setReportComment(null);
          setReportNote('');
        }}
        onSubmit={submitReport}
      />
    </>
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
