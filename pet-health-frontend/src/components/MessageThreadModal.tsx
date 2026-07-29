import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIosKeyboardOverlap } from '../hooks/useIosKeyboardOverlap';
import type { PetFeedConversation, PetFeedMessage } from '../types';
import { modalBottomInset, modalTopInset } from '../utils/modalSafeArea';
import { MessageListingContextCard } from './MessageListingContextCard';

const PRIMARY = '#1E6FE8';

export type MessageThreadModalProps = {
  visible: boolean;
  conversation: PetFeedConversation | null;
  messages: PetFeedMessage[];
  currentUserId: string | null;
  loading: boolean;
  sending: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onSend: (body: string) => Promise<boolean>;
  onOpenListing?: (postId: string) => void;
};

function formatMessageTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString(locale.startsWith('vi') ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageThreadView({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  error,
  onClose,
  onRefresh,
  onSend,
  onOpenListing,
  headerTopInset = 0,
  composerBottomInset = 10,
}: Omit<MessageThreadModalProps, 'visible'> & {
  headerTopInset?: number;
  composerBottomInset?: number;
}) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<PetFeedMessage>>(null);
  const keyboardOverlap = useIosKeyboardOverlap();

  useEffect(() => {
    if (!conversation) setDraft('');
  }, [conversation?.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, keyboardOverlap]);

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
    if (!trimmed || sending || !conversation?.id) return;
    const ok = await onSend(trimmed);
    if (ok) setDraft('');
  }

  const canCompose = Boolean(conversation?.id);
  const composerPad = keyboardOverlap > 0 ? 8 : composerBottomInset;

  return (
    <View className="flex-1 bg-[#F2F4F8]" style={{ paddingBottom: keyboardOverlap }}>
      <View className="border-b border-gray-200 bg-white" style={{ paddingTop: headerTopInset }}>
        <View className="flex-row items-center px-1 py-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            className="h-9 w-11 items-center justify-center rounded-lg active:bg-slate-100"
            hitSlop={8}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color="#1e293b" />
          </Pressable>
          <View className="min-w-0 flex-1 items-center px-1">
            <Text className="text-[15px] font-semibold leading-5 text-slate-900" numberOfLines={1}>
              {conversation?.peer_display_name || t('petFeed.messages.peerFallback')}
            </Text>
            <Text className="text-[11px] leading-4 text-slate-500" numberOfLines={1}>
              {conversation?.post_title || t('petFeed.messages.listingFallback')}
            </Text>
          </View>
          <View className="w-11" />
        </View>
      </View>

      <MessageListingContextCard
        conversation={conversation}
        currentUserId={currentUserId}
        onOpenListing={onOpenListing}
      />

      {loading && messages.length === 0 ? (
        <View className="flex-1 gap-3 px-4 py-5">
          {[0, 1, 2, 3, 4, 5].map((item) => {
            const mine = item % 2 === 1;
            return (
              <View key={item} className={`max-w-[72%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                <View
                  className={`rounded-2xl ${mine ? 'bg-blue-100' : 'bg-slate-200'}`}
                  style={{ width: mine ? 168 : 196, height: item % 3 === 0 ? 56 : 40 }}
                />
                <View className="mt-1 h-2.5 w-10 rounded-full bg-slate-100" />
              </View>
            );
          })}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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

      <View className="border-t border-gray-200 bg-white px-3 pt-2" style={{ paddingBottom: composerPad }}>
        {error && messages.length > 0 ? <Text className="mb-2 text-xs text-red-600">{error}</Text> : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            testID="pet-feed-message-input"
            accessibilityLabel={t('petFeed.messages.inputLabel')}
            className="min-h-[40px] max-h-28 flex-1 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
            placeholder={t('petFeed.messages.placeholder')}
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            editable={canCompose && !sending}
          />
          <Pressable
            testID="pet-feed-message-send"
            accessibilityRole="button"
            accessibilityLabel={t('petFeed.messages.send')}
            accessibilityState={{ disabled: sending || !draft.trim() || !canCompose }}
            className={`h-10 w-10 items-center justify-center rounded-xl ${draft.trim() && canCompose && !sending ? 'bg-blue-600 active:opacity-90' : 'bg-slate-200'}`}
            disabled={sending || !draft.trim() || !canCompose}
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
    </View>
  );
}

export function MessageThreadModal({
  visible,
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  error,
  onClose,
  onRefresh,
  onSend,
  onOpenListing,
}: MessageThreadModalProps) {
  const insets = useSafeAreaInsets();
  const topInset = modalTopInset(insets.top);
  const bottomInset = modalBottomInset(insets.bottom, 10);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <MessageThreadView
        conversation={conversation}
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        sending={sending}
        error={error}
        onClose={onClose}
        onRefresh={onRefresh}
        onSend={onSend}
        onOpenListing={onOpenListing}
        headerTopInset={topInset}
        composerBottomInset={bottomInset}
      />
    </Modal>
  );
}
