import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedPost } from '../types';
import { PetFeedListingCard } from './PetFeedListingCard';

const INK = '#2B1E19';
const MUTED = '#6E5A51';
const ACCENT = '#B45309';
const CARD_WIDTH = 268;

type PetFeedListingRailProps = {
  title: string;
  subtitle?: string;
  posts: PetFeedPost[];
  currentUserId?: string | null;
  onToggleFavorite?: (post: PetFeedPost) => void;
  onMessageBreeder?: (post: PetFeedPost) => void;
  onEditPost?: (post: PetFeedPost) => void;
  onOpenPost: (postId: string) => void;
};

export function PetFeedListingRail({
  title,
  subtitle,
  posts,
  currentUserId,
  onToggleFavorite,
  onMessageBreeder,
  onEditPost,
  onOpenPost,
}: PetFeedListingRailProps) {
  const { t } = useTranslation();
  if (!posts.length) return null;

  return (
    <View className="pb-4">
      <View className="flex-row items-end justify-between gap-3 px-5">
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-semibold tracking-tight" style={{ color: INK }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-sm" style={{ color: MUTED }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text className="shrink-0 text-xs font-medium" style={{ color: ACCENT }}>
          {`${posts.length} ${t('petFeed.section.results')}`}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}
      >
        {posts.map((post) => (
          <View key={post.id} style={{ width: CARD_WIDTH }}>
            <PetFeedListingCard
              post={post}
              rail
              currentUserId={currentUserId}
              showFavorite={Boolean(currentUserId && onToggleFavorite)}
              showContact={Boolean(currentUserId && onMessageBreeder)}
              onToggleFavorite={onToggleFavorite}
              onMessageBreeder={onMessageBreeder}
              onEditPost={onEditPost}
              onPress={() => onOpenPost(post.id)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
