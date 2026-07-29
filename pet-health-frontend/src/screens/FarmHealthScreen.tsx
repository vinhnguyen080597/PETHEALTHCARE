import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScoreRing } from '../components/breeder/ScoreRing';
import { TrustLevelChip } from '../components/breeder/TrustLevelChip';
import type { BreederProfile, PetFeedPost } from '../types';
import { computeBreederTrust } from '../utils/breederTrust';
import { scoreColor, trustLevelFromScore } from '../utils/breederTrustLevel';

type FarmHealthScreenProps = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  onBack: () => void;
};

export function FarmHealthScreen({ profile, posts, onBack }: FarmHealthScreenProps) {
  const { t } = useTranslation();
  const listingPosts = Array.isArray(posts) ? posts : [];
  const trust = computeBreederTrust(profile, listingPosts);
  const level = trustLevelFromScore(trust.score);
  const color = scoreColor(trust.score);

  return (
    <View testID="farm-health-screen" style={{ flex: 1, backgroundColor: '#F2F4F8' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8 }}>
        <Pressable className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
          {t('farmHealth.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: '#fff',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {t('farmHealth.eyebrow')}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', maxWidth: 220 }}>{t('farmHealth.subtitle')}</Text>
            </View>
            <TrustLevelChip level={level.level} label={t(level.labelKey)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ScoreRing score={trust.score} size={80} color={color} trackColor="#F1F5F9" textColor={color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>{t('farmHealth.yourHealth')}</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>{t('farmHealth.improveHint')}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          {[
            { label: t('petFeed.topBreeders.trustScore'), value: `${trust.score}/100`, sub: t('farmHealth.trustScoreSub'), color },
            { label: t('farmHealth.level'), value: t(level.labelKey), sub: t('farmHealth.levelSub'), color: '#1E6FE8' },
            { label: t('farmHealth.reports'), value: '0', sub: t('farmHealth.reportsSub'), color: '#059669' },
            { label: t('petFeed.topBreeders.posts'), value: String(listingPosts.length), sub: t('farmHealth.listingsSub'), color: '#7C3AED' },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                width: '47%',
                flexGrow: 1,
                backgroundColor: '#fff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                paddingHorizontal: 14,
                paddingTop: 14,
                paddingBottom: 12,
              }}
            >
              <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                {item.label}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: item.color, marginBottom: 2 }} numberOfLines={1}>
                {item.value}
              </Text>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.sub}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
          {[t('farmHealth.dealsSuccess'), t('farmHealth.dealsFailed')].map((label) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#CBD5E1',
                paddingHorizontal: 14,
                paddingTop: 14,
                paddingBottom: 12,
                opacity: 0.7,
              }}
            >
              <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                {label}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#CBD5E1', marginBottom: 4 }}>—</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' }} />
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{t('farmHealth.comingSoon')}</Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{t('farmHealth.signalDetails')}</Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            {trust.signals.map((signal) => (
              <View key={signal.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: signal.passed ? '#D1FAE5' : '#FFF7ED',
                    borderWidth: 1.5,
                    borderColor: signal.passed ? '#6EE7B7' : '#FCD34D',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, color: signal.passed ? '#059669' : '#D97706' }}>{signal.passed ? '✓' : '·'}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#0F172A' }}>
                  {t(`breederDetail.trustSignals.${signal.key}`)}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: signal.passed ? '#059669' : '#D97706' }}>
                  {Math.round(signal.value)}/{signal.max}đ
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: '#EFF6FF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#BFDBFE',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 10 }}>💡 {t('farmHealth.tipsTitle')}</Text>
          {[t('farmHealth.tipChecklist'), t('farmHealth.tipPhotos'), t('farmHealth.tipListings')].map((tip) => (
            <View key={tip} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1E6FE8', flexShrink: 0 }} />
              <Text style={{ fontSize: 13, color: '#1E40AF', flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 10,
            marginBottom: 24,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: '#FFFBEB',
            borderWidth: 1,
            borderColor: '#FDE68A',
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 11, color: '#92400E', lineHeight: 16 }}>{t('farmHealth.footnote')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
