import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PetFeedConversation, PetFeedMessage } from '../types';

const PRIMARY = '#1E6FE8';

type MessageThreadScreenProps = {
  conversation: PetFeedConversation | null;
  messages: PetFeedMessage[];
  currentUserId: string | null;
  loading: boolean;
  sending: boolean;
  error: string;
  onBack: () => void;
  onRefresh: () => Promise<void> | void;
  onSend: (body: string) => Promise<boolean>;
};

function formatMessageTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString(locale.startsWith('vi') ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageThreadScreen({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  error,
  onBack,
  onRefresh,
  onSend,
}: MessageThreadScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<PetFeedMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    const ok = await onSend(trimmed);
    if (ok) setDraft('');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F2F4F8]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="border-b border-gray-200 bg-white px-2 pb-2 pt-2">
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            className="w-14 rounded-lg p-2 active:bg-slate-100"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <View className="min-w-0 flex-1 items-center">
            <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
              {conversation?.peer_display_name || t('petFeed.messages.peerFallback')}
            </Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {conversation?.post_title || t('petFeed.messages.listingFallback')}
            </Text>
          </View>
          <View className="w-14" />
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-sm leading-5 text-slate-500">{t('petFeed.messages.threadEmpty')}</Text>
              {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
            </View>
          }
          renderItem={({ item }) => {
            const mine = Boolean(currentUserId && item.sender_user_id === currentUserId);
            return (
              <View className={`mb-2 max-w-[82%] ${mine ? 'self-end' : 'self-start'}`}>
                <View className={`rounded-2xl px-3 py-2 ${mine ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}>
                  <Text className={`text-sm leading-5 ${mine ? 'text-white' : 'text-slate-800'}`}>{item.body}</Text>
                </View>
                <Text className={`mt-1 text-[10px] text-slate-400 ${mine ? 'text-right' : 'text-left'}`}>
                  {formatMessageTime(item.created_at, i18n.language)}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View className="border-t border-gray-200 bg-white px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
        {error && messages.length > 0 ? <Text className="mb-2 text-xs text-red-600">{error}</Text> : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            testID="pet-feed-message-input"
            accessibilityLabel={t('petFeed.messages.inputLabel')}
            className="min-h-[44px] max-h-28 flex-1 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
            placeholder={t('petFeed.messages.placeholder')}
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <Pressable
            testID="pet-feed-message-send"
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.messages.send')}
            accessibilityState={{ disabled: sending || !draft.trim() }}
            className={`h-11 w-11 items-center justify-center rounded-xl ${draft.trim() && !sending ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
            disabled={sending || !draft.trim()}
            onPress={() => void handleSend()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color={draft.trim() ? '#fff' : '#94a3b8'} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
