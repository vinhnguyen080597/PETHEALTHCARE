import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PetFeedNotification } from '../types';

const PRIMARY = '#1E6FE8';

type NotificationsInboxScreenProps = {
  notifications: PetFeedNotification[];
  loading: boolean;
  error: string;
  onBack: () => void;
  onRefresh: () => Promise<void> | void;
  onOpenNotification: (notification: PetFeedNotification) => void;
};

function formatNotificationTime(value: string | null, locale: string) {
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

function NotificationsInboxSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View key={item} className="flex-row gap-3 rounded-2xl border border-gray-200 bg-white p-3">
          <View className="h-14 w-14 rounded-xl bg-slate-200" />
          <View className="min-w-0 flex-1 gap-2 py-0.5">
            <View className="flex-row items-center justify-between gap-2">
              <View className="h-4 w-2/5 rounded-full bg-slate-200" />
              <View className="h-3 w-14 rounded-full bg-slate-100" />
            </View>
            <View className="h-3 w-1/2 rounded-full bg-slate-100" />
            <View className="h-4 w-4/5 rounded-full bg-slate-200" />
            <View className="h-4 w-3/5 rounded-full bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function NotificationsInboxScreen({
  notifications,
  loading,
  error,
  onBack,
  onRefresh,
  onOpenNotification,
}: NotificationsInboxScreenProps) {
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
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">
          {t('petFeed.notifications.inboxTitle')}
        </Text>
        <View className="w-14" />
      </View>

      {loading && notifications.length === 0 ? (
        <NotificationsInboxSkeleton />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Ionicons name="notifications-outline" size={40} color="#94a3b8" />
              <Text className="mt-3 text-base font-bold text-slate-800">{t('petFeed.notifications.emptyTitle')}</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{t('petFeed.notifications.emptyBody')}</Text>
              {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              className={`mb-3 flex-row gap-3 rounded-2xl border p-3 active:opacity-95 ${
                item.is_unread ? 'border-blue-100 bg-blue-50/60' : 'border-gray-200 bg-white'
              }`}
              onPress={() => onOpenNotification(item)}
            >
              <View className="h-14 w-14 overflow-hidden rounded-xl bg-blue-50">
                {item.post_thumb_url ? (
                  <Image source={{ uri: item.post_thumb_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={PRIMARY} />
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className={`min-w-0 flex-1 text-sm ${item.is_unread ? 'font-black text-slate-900' : 'font-bold text-slate-900'}`}
                    numberOfLines={1}
                  >
                    {item.actor_display_name || t('petFeed.notifications.actorFallback')}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs text-slate-400">{formatNotificationTime(item.created_at, i18n.language)}</Text>
                    {item.is_unread ? <View className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                  </View>
                </View>
                <Text className="mt-0.5 text-xs font-medium text-slate-500" numberOfLines={1}>
                  {t('petFeed.notifications.commentedOn', {
                    title: item.post_title || t('petFeed.notifications.listingFallback'),
                  })}
                </Text>
                <Text
                  className={`mt-1 text-sm ${item.is_unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}
                  numberOfLines={2}
                >
                  {item.body_preview || t('petFeed.notifications.noPreview')}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
