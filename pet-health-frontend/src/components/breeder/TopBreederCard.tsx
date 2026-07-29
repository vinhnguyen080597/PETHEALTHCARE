import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MetricMini } from './MetricMini';
import { TrustLevelChip } from './TrustLevelChip';
import { VerifiedBadge } from './VerifiedBadge';
import { initialsFromName, rankBadgeColor, trustLevelFromScore } from '../../utils/breederTrustLevel';

export type TopBreederCardData = {
  name: string;
  location: string;
  speciesLabel: string;
  score: number;
  scaleLabel: string;
  listingsCount: number;
  typeLabel: string;
  verified?: boolean;
  rank?: number;
};

type TopBreederCardProps = {
  data: TopBreederCardData;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function TopBreederCard({ data, onPress, accessibilityLabel }: TopBreederCardProps) {
  const { t } = useTranslation();
  const trust = trustLevelFromScore(data.score);
  const rankColor = data.rank != null ? rankBadgeColor(data.rank) : null;
  const meta = [data.location, data.speciesLabel].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingTop: 14,
        paddingHorizontal: 14,
        paddingBottom: 12,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: '#000',
        shadowOpacity: pressed ? 0 : 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: pressed ? 0 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {rankColor ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: rankColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{data.rank}</Text>
          </View>
        ) : null}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: '#1E6FE8',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{initialsFromName(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 3 }} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {data.verified !== false ? <VerifiedBadge /> : null}
            {meta ? (
              <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          <TrustLevelChip level={trust.level} label={t(trust.labelKey)} />
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: '#F8FAFC',
          borderRadius: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: 8,
        }}
      >
        <View style={{ width: '50%', paddingRight: 8 }}>
          <MetricMini label={t('petFeed.topBreeders.trustScore')} value={`${data.score}/100`} />
        </View>
        <View style={{ width: '50%', paddingLeft: 8 }}>
          <MetricMini label={t('petFeed.topBreeders.scale')} value={data.scaleLabel} />
        </View>
        <View style={{ width: '50%', paddingRight: 8 }}>
          <MetricMini
            label={t('petFeed.topBreeders.posts')}
            value={t('breederDetail.listingsCount', { count: data.listingsCount })}
          />
        </View>
        <View style={{ width: '50%', paddingLeft: 8 }}>
          <MetricMini label={t('petFeed.topBreeders.type')} value={data.typeLabel} />
        </View>
      </View>

      <View
        style={{
          marginTop: 10,
          backgroundColor: '#EFF6FF',
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#1E6FE8', fontWeight: '600', fontSize: 13 }}>
          {t('petFeed.topBreeders.viewProfileCta')}
        </Text>
      </View>
    </Pressable>
  );
}
