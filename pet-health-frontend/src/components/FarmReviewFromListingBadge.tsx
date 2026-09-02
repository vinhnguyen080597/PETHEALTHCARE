import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const MUTED = '#6E5A51';

export function FarmReviewFromListingBadge() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('farm.review.fromListingTooltip')}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        className="flex-row items-center gap-1 active:opacity-70"
        onPress={() => setOpen((current) => !current)}
      >
        <Text className="text-[11px] font-medium" style={{ color: MUTED }}>
          {t('farm.review.fromListingBadge')}
        </Text>
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
      </Pressable>
      {open ? (
        <View
          className="mt-1.5 rounded-lg border px-2.5 py-2"
          style={{ borderColor: '#F3E2C8', backgroundColor: '#FFFBF5', maxWidth: 280 }}
        >
          <Text className="text-[11px] leading-[16px]" style={{ color: MUTED }}>
            {t('farm.review.fromListingTooltip')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
