import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { FarmReviewStars } from './FarmReviewStars';
import type { FarmReviewStatus } from '../utils/farmReview';
import {
  farmReviewSupplementsCollapsible,
  farmReviewSupplementsToShow,
} from '../utils/farmReview';

const FARM_TEXT = '#2B1E19';
const FARM_MUTED = '#6E5A51';
const FARM_BORDER = '#F3E2C8';

export type FarmReviewSupplementPreview = {
  id: string;
  rating: number;
  body: string;
  photoUrls: string[];
  status?: FarmReviewStatus;
};

type FarmReviewSupplementsListProps = {
  supplements: FarmReviewSupplementPreview[];
};

export function FarmReviewSupplementsList({ supplements }: FarmReviewSupplementsListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!supplements.length) return null;

  const collapsible = farmReviewSupplementsCollapsible(supplements.length);
  const visible = farmReviewSupplementsToShow(supplements, expanded);

  return (
    <View style={{ gap: 8 }}>
      {visible.map((supplement) => (
        <View
          key={supplement.id}
          style={{
            marginLeft: 12,
            gap: 4,
            borderLeftWidth: 2,
            borderLeftColor: FARM_BORDER,
            paddingLeft: 10,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '600', color: FARM_MUTED, fontSize: 12 }}>
              {t('farm.review.supplement')}
            </Text>
            <FarmReviewStars rating={supplement.rating} size={12} />
            {supplement.status === 'pending' ? (
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#B45309' }}>
                · {t('farm.review.pendingBadge')}
              </Text>
            ) : null}
          </View>
          {supplement.body ? (
            <Text style={{ fontSize: 12, color: FARM_TEXT, lineHeight: 18 }}>{supplement.body}</Text>
          ) : null}
          {supplement.photoUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {supplement.photoUrls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ))}
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? t('farm.review.hideSupplements') : t('farm.review.showMoreSupplements')
          }
          hitSlop={6}
          onPress={() => setExpanded((current) => !current)}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: FARM_MUTED }}>
            {expanded ? t('farm.review.hideSupplements') : t('farm.review.showMoreSupplements')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
