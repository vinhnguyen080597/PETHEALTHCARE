import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PetFeedConversation } from '../types';

const PRIMARY = '#1E6FE8';

type MessagesInboxScreenProps = {
  conversations: PetFeedConversation[];
  loading: boolean;
  error: string;
  onBack: () => void;
  onRefresh: () => Promise<void> | void;
  onOpenConversation: (conversation: PetFeedConversation) => void;
};

function formatInboxTime(value: string | null, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString(locale.startsWith('vi') ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesInboxScreen({
  conversations,
  loading,
  error,
  onBack,
  onRefresh,
  onOpenConversation,
}: MessagesInboxScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <View className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 pb-2 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          className="w-14 rounded-lg p-2 active:bg-slate-100"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('petFeed.messages.inboxTitle')}</Text>
        <View className="w-14" />
      </View>

      {loading && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
              <Text className="mt-3 text-base font-bold text-slate-800">{t('petFeed.messages.emptyTitle')}</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{t('petFeed.messages.emptyBody')}</Text>
              {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              className="mb-3 flex-row gap-3 rounded-2xl border border-gray-200 bg-white p-3 active:opacity-95"
              onPress={() => onOpenConversation(item)}
            >
              <View className="h-14 w-14 overflow-hidden rounded-xl bg-blue-50">
                {item.post_thumb_url ? (
                  <Image source={{ uri: item.post_thumb_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="paw-outline" size={22} color={PRIMARY} />
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="min-w-0 flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
                    {item.peer_display_name || t('petFeed.messages.peerFallback')}
                  </Text>
                  <Text className="text-xs text-slate-400">{formatInboxTime(item.last_message_at, i18n.language)}</Text>
                </View>
                <Text className="mt-0.5 text-xs font-medium text-slate-500" numberOfLines={1}>
                  {item.post_title || t('petFeed.messages.listingFallback')}
                </Text>
                <Text className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                  {item.last_message_preview || t('petFeed.messages.noMessagesYet')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
