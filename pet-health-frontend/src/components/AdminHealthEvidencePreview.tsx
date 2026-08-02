import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminPostHealthEvidenceUrls } from '../utils/adminModerationDisplay';
import type { PetFeedPost } from '../types';

type AdminHealthEvidencePreviewProps = {
  post: PetFeedPost;
};

/** Compact vaccine-book evidence strip for admin listing review. */
export function AdminHealthEvidencePreview({ post }: AdminHealthEvidencePreviewProps) {
  const { t } = useTranslation();
  const urls = adminPostHealthEvidenceUrls(post);
  if (urls.length === 0) return null;

  return (
    <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <Text className="text-[10px] font-bold uppercase text-amber-800">
        {t('adminReview.healthEvidence')}
      </Text>
      <Text className="mt-1 text-xs text-amber-900" numberOfLines={2}>
        {post.vaccine_status || t('adminReview.healthEvidenceHint')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
        <View className="flex-row gap-2">
          {urls.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#e2e8f0' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
