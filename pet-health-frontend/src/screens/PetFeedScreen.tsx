import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import type { PetFeedPost } from '../types';

const PRIMARY = '#1E6FE8';

type PetFeedScreenProps = {
  posts: PetFeedPost[];
  refreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
};

export function PetFeedScreen({ posts, refreshing, onRefresh, onToggleFavorite, onReportPost }: PetFeedScreenProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      testID="pet-feed-screen"
      className="flex-1 bg-[#F2F4F8] px-5 pb-6 pt-5"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5">
        <Text className="text-2xl font-bold text-slate-900">{t('petFeed.title')}</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-600">{t('petFeed.subtitle')}</Text>
      </View>

      <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="text-sm leading-5 text-amber-900">{t('petFeed.disclaimer')}</Text>
      </View>

      {posts.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-12">
          <Ionicons name="newspaper-outline" size={42} color={PRIMARY} />
          <Text className="mt-4 text-center text-base font-bold text-slate-900">{t('petFeed.emptyTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-500">{t('petFeed.emptyBody')}</Text>
        </View>
      ) : (
        <View className="gap-4">
          {posts.map((post) => (
            <PetFeedPostCard
              key={post.id}
              post={post}
              onToggleFavorite={onToggleFavorite}
              onReportPost={onReportPost}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
