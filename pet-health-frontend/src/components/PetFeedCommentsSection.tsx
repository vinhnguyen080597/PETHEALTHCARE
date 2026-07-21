import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedComment } from '../types';

const PRIMARY = '#1E6FE8';

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

type PetFeedCommentsSectionProps = {
  comments: PetFeedComment[];
  loading: boolean;
};

export function PetFeedCommentsSection({ comments, loading }: PetFeedCommentsSectionProps) {
  const { t, i18n } = useTranslation();

  return (
    <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">{t('petFeed.comments.title')}</Text>
      {loading ? (
        <View className="items-center py-6">
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : comments.length === 0 ? (
        <Text className="mt-3 text-sm leading-5 text-slate-500">{t('petFeed.comments.empty')}</Text>
      ) : (
        <View className="mt-3 gap-3">
          {comments.map((comment) => (
            <View key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
                  {comment.author_display_name || t('petFeed.comments.anonymous')}
                </Text>
                <Text className="text-xs text-slate-400">{formatCommentTime(comment.created_at, i18n.language)}</Text>
              </View>
              <Text className="mt-1 text-sm leading-5 text-slate-700">{comment.body}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type PetFeedCommentComposerProps = {
  submitting: boolean;
  onSubmit: (body: string) => Promise<boolean>;
};

export function PetFeedCommentComposer({ submitting, onSubmit }: PetFeedCommentComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    const ok = await onSubmit(trimmed);
    if (ok) setDraft('');
  }

  return (
    <View className="flex-row items-end gap-2 px-4 py-3">
      <TextInput
        testID="pet-feed-comment-input"
        accessibilityLabel={t('petFeed.comments.inputLabel')}
        className="min-h-[44px] flex-1 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
        placeholder={t('petFeed.comments.placeholder')}
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
  );
}
