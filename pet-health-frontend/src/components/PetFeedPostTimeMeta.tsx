import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedPost } from '../types';
import { formatPetFeedPostTimeLabel } from '../utils/petFeedPostTime';

type PetFeedPostTimeMetaProps = {
  post: Pick<PetFeedPost, 'created_at' | 'updated_at'>;
  className?: string;
  numberOfLines?: number;
};

export function PetFeedPostTimeMeta({
  post,
  className = 'text-xs text-slate-400',
  numberOfLines = 2,
}: PetFeedPostTimeMetaProps) {
  const { t, i18n } = useTranslation();
  const label = formatPetFeedPostTimeLabel(post, t, i18n.language);
  if (!label) return null;
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {label}
    </Text>
  );
}
