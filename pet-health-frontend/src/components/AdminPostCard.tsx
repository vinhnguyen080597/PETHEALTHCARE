import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AnnouncementCategory, PetFeedPost } from '../types';

type AdminPostCardProps = {
  post: PetFeedPost;
  onPress?: (post: PetFeedPost) => void;
  testID?: string;
};

function categoryKey(category: string): AnnouncementCategory {
  const value = category.trim().toLowerCase();
  if (value === 'app_update' || value === 'health_tip' || value === 'community' || value === 'general') {
    return value;
  }
  return 'general';
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const diffMs = Date.now() - time;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function AdminPostCard({ post, onPress, testID }: AdminPostCardProps) {
  const { t } = useTranslation();
  const category = categoryKey(String(post.metadata?.category ?? 'general'));
  const ctaLabel = typeof post.metadata?.ctaLabel === 'string' ? post.metadata.ctaLabel.trim() : '';
  const ctaUrl = typeof post.metadata?.ctaUrl === 'string' ? post.metadata.ctaUrl.trim() : '';
  const cover = post.media_urls[0] ?? null;

  const body = (
    <>
      {cover ? (
        <Image source={{ uri: cover }} style={{ width: '100%', height: 160 }} contentFit="cover" />
      ) : null}
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="shield-checkmark-outline" size={16} color="#1E6FE8" />
            <Text className="text-xs font-bold text-blue-600">Pet Health Care</Text>
          </View>
          <Text className="text-xs text-slate-500">{formatRelativeTime(post.created_at)}</Text>
        </View>
        <Text className="self-start rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
          {t(`adminPost.category.${category}`)}
        </Text>
        <Text className="text-base font-bold text-slate-900">{post.title}</Text>
        <Text className="text-sm leading-5 text-slate-600" numberOfLines={onPress ? 3 : undefined}>{post.description}</Text>
        {ctaLabel && ctaUrl ? (
          <Pressable
            className="mt-1 self-start rounded-xl bg-blue-600 px-4 py-2.5 active:opacity-90"
            onPress={() => void Linking.openURL(ctaUrl)}
          >
            <Text className="text-xs font-bold text-white">{ctaLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm active:opacity-95"
        onPress={() => onPress(post)}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View testID={testID} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {body}
    </View>
  );
}
