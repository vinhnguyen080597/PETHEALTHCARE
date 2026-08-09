import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
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
  onOpenBreederProfile?: () => void;
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

function notificationType(item: PetFeedNotification) {
  return item.type || 'post_comment';
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
  onOpenBreederProfile,
}: NotificationsInboxScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [reasonItem, setReasonItem] = useState<PetFeedNotification | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const titleFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === 'breeder_verified') return t('petFeed.notifications.verifiedTitle');
    if (type === 'breeder_rejected') return t('petFeed.notifications.rejectedTitle');
    if (type === 'listing_approved') return t('petFeed.notifications.listingApprovedTitle');
    if (type === 'listing_rejected') return t('petFeed.notifications.listingRejectedTitle');
    if (type === 'admin_breeder_pending') return t('petFeed.notifications.adminBreederTitle');
    if (type === 'admin_listing_pending') return t('petFeed.notifications.adminListingTitle');
    if (type === 'admin_report_open') return t('petFeed.notifications.adminReportTitle');
    return item.actor_display_name || t('petFeed.notifications.actorFallback');
  };

  const subtitleFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === 'breeder_verified') return t('petFeed.notifications.verifiedSubtitle');
    if (type === 'breeder_rejected') return t('petFeed.notifications.rejectedSubtitle');
    if (type === 'listing_approved') return t('petFeed.notifications.listingApprovedSubtitle');
    if (type === 'listing_rejected') return t('petFeed.notifications.listingRejectedSubtitle');
    if (type === 'admin_breeder_pending') return t('petFeed.notifications.adminBreederSubtitle');
    if (type === 'admin_listing_pending') return t('petFeed.notifications.adminListingSubtitle');
    if (type === 'admin_report_open') return t('petFeed.notifications.adminReportSubtitle');
    return t('petFeed.notifications.commentedOn', {
      title: item.post_title || t('petFeed.notifications.listingFallback'),
    });
  };

  const bodyFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === 'breeder_verified') {
      return item.body_preview || t('petFeed.notifications.verifiedBody');
    }
    if (type === 'breeder_rejected') {
      return (
        item.rejection_reason ||
        item.metadata?.rejection_reason ||
        item.body_preview ||
        t('petFeed.notifications.rejectedBody')
      );
    }
    if (type === 'listing_approved') {
      return item.body_preview || t('petFeed.notifications.listingApprovedBody');
    }
    if (type === 'listing_rejected') {
      return item.body_preview || t('petFeed.notifications.listingRejectedBody');
    }
    if (type === 'admin_breeder_pending') {
      return item.body_preview || t('petFeed.notifications.adminBreederBody');
    }
    if (type === 'admin_listing_pending') {
      return item.body_preview || t('petFeed.notifications.adminListingBody');
    }
    if (type === 'admin_report_open') {
      return item.body_preview || t('petFeed.notifications.adminReportBody');
    }
    return item.body_preview || t('petFeed.notifications.noPreview');
  };

  const ctaFor = (item: PetFeedNotification) => {
    const type = notificationType(item);
    if (type === 'breeder_verified') {
      return item.cta_label || t('petFeed.notifications.verifiedCta');
    }
    if (type === 'breeder_rejected') {
      return item.cta_label || t('petFeed.notifications.rejectedCta');
    }
    if (type === 'listing_approved') {
      return item.cta_label || t('petFeed.notifications.listingApprovedCta');
    }
    if (type === 'listing_rejected') {
      return item.cta_label || t('petFeed.notifications.listingRejectedCta');
    }
    if (
      type === 'admin_breeder_pending' ||
      type === 'admin_listing_pending' ||
      type === 'admin_report_open'
    ) {
      return item.cta_label || t('petFeed.notifications.adminRequestCta');
    }
    return null;
  };

  const iconFor = (type: string) => {
    if (type === 'breeder_verified' || type === 'listing_approved') return 'checkmark-circle-outline' as const;
    if (type === 'breeder_rejected' || type === 'listing_rejected') return 'close-circle-outline' as const;
    if (
      type === 'admin_breeder_pending' ||
      type === 'admin_listing_pending' ||
      type === 'admin_report_open'
    ) {
      return 'clipboard-outline' as const;
    }
    return 'chatbubble-ellipses-outline' as const;
  };

  const handleOpen = (item: PetFeedNotification) => {
    if (notificationType(item) === 'breeder_rejected') {
      setReasonItem(item);
    }
    onOpenNotification(item);
  };

  const rejectionReason =
    reasonItem?.rejection_reason ||
    reasonItem?.metadata?.rejection_reason ||
    reasonItem?.body_preview ||
    '';
  const adminAction = reasonItem?.admin_action || reasonItem?.metadata?.admin_action || '';
  const adminNote = reasonItem?.admin_note || reasonItem?.metadata?.admin_note || '';

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
          renderItem={({ item }) => {
            const type = notificationType(item);
            const cta = ctaFor(item);
            return (
              <Pressable
                accessibilityRole="button"
                className={`mb-3 flex-row gap-3 rounded-2xl border p-3 active:opacity-95 ${
                  item.is_unread ? 'border-blue-100 bg-blue-50/60' : 'border-gray-200 bg-white'
                }`}
                onPress={() => handleOpen(item)}
              >
                <View className="h-14 w-14 overflow-hidden rounded-xl bg-blue-50">
                  {item.post_thumb_url ? (
                    <Image source={{ uri: item.post_thumb_url }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name={iconFor(type)} size={22} color={PRIMARY} />
                    </View>
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text
                      className={`min-w-0 flex-1 text-sm ${item.is_unread ? 'font-black text-slate-900' : 'font-bold text-slate-900'}`}
                      numberOfLines={1}
                    >
                      {titleFor(item)}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-xs text-slate-400">{formatNotificationTime(item.created_at, i18n.language)}</Text>
                      {item.is_unread ? <View className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                    </View>
                  </View>
                  <Text className="mt-0.5 text-xs font-medium text-slate-500" numberOfLines={1}>
                    {subtitleFor(item)}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${item.is_unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}
                    numberOfLines={2}
                  >
                    {bodyFor(item)}
                  </Text>
                  {cta ? (
                    <Text className="mt-1.5 text-xs font-bold text-blue-600" numberOfLines={1}>
                      {cta}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal
        visible={Boolean(reasonItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setReasonItem(null)}
      >
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={() => setReasonItem(null)}>
          <Pressable
            className="w-full max-w-md rounded-2xl bg-white p-4"
            onPress={(event) => event.stopPropagation?.()}
          >
            <Text className="text-base font-bold text-slate-900">
              {t('petFeed.notifications.rejectedTitle')}
            </Text>
            <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
              {t('petFeed.notifications.rejectionReason')}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-slate-800">
              {rejectionReason || t('petFeed.notifications.rejectedBody')}
            </Text>
            {adminAction ? (
              <>
                <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
                  {t('petFeed.notifications.adminAction')}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-800">{adminAction}</Text>
              </>
            ) : null}
            {adminNote ? (
              <>
                <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">
                  {t('petFeed.notifications.adminNote')}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-800">{adminNote}</Text>
              </>
            ) : null}
            <View className="mt-4 gap-2">
              {onOpenBreederProfile ? (
                <Pressable
                  className="rounded-xl bg-blue-600 py-3 active:opacity-90"
                  onPress={() => {
                    setReasonItem(null);
                    onOpenBreederProfile();
                  }}
                >
                  <Text className="text-center text-sm font-bold text-white">
                    {t('petFeed.notifications.editBreederProfile')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                className="rounded-xl bg-slate-100 py-3 active:opacity-90"
                onPress={() => setReasonItem(null)}
              >
                <Text className="text-center text-sm font-bold text-slate-700">{t('common.done')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
