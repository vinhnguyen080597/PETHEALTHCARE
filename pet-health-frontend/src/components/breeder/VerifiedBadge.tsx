import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type VerifiedBadgeProps = {
  dark?: boolean;
};

export function VerifiedBadge({ dark = false }: VerifiedBadgeProps) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: dark ? 'rgba(6,78,59,0.9)' : '#D1FAE5',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 10, color: dark ? '#6EE7B7' : '#059669', fontWeight: '700' }}>✓</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: dark ? '#6EE7B7' : '#065F46' }}>
        {t('petFeed.topBreeders.verified')}
      </Text>
    </View>
  );
}
