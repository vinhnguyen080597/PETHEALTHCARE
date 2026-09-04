import { Image, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BreederTemplateId } from '../../constants/breederTemplates';
import { initialsFromName, scoreColor, trustLevelFromScore } from '../../utils/breederTrustLevel';
import { ScoreRing } from './ScoreRing';
import { TrustLevelChip } from './TrustLevelChip';
import { VerifiedBadge } from './VerifiedBadge';

export type BreederHeroData = {
  name: string;
  location: string;
  speciesLabel: string;
  breedsLabel: string;
  typeShortLabel: string;
  typeFullLabel: string;
  scaleLabel: string;
  score: number;
  listingsCount: number;
  reportsCount?: number;
  verified?: boolean;
  /** Hide Verified badge when compliance strip is active. */
  complianceStripped?: boolean;
  coverImageUrl?: string | null;
  registeredKennelName?: string;
};

function showHeroVerified(data: BreederHeroData) {
  return data.verified !== false && !data.complianceStripped;
}

type BreederHeroProps = {
  data: BreederHeroData;
  templateId: BreederTemplateId;
};

export function BreederHero({ data, templateId }: BreederHeroProps) {
  if (templateId === 'T2') return <HeroT2 data={data} />;
  if (templateId === 'T3') return <HeroT3 data={data} />;
  if (templateId === 'T4') return <HeroT4 data={data} />;
  if (templateId === 'T5') return <HeroT5 data={data} />;
  return <HeroT1 data={data} />;
}

function HeroT1({ data }: { data: BreederHeroData }) {
  const { t } = useTranslation();
  const trust = trustLevelFromScore(data.score);
  return (
    <View style={{ backgroundColor: '#1E6FE8', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', flex: 1, minWidth: 0, marginRight: 8 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontWeight: '800', fontSize: 20, color: '#fff' }}>{initialsFromName(data.name)}</Text>
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 20, marginBottom: 5 }} numberOfLines={1}>
              {data.name}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
              {data.location ? (
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>📍 {data.location}</Text>
              ) : null}
              {data.speciesLabel ? (
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>· 🐾 {data.speciesLabel}</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {showHeroVerified(data) ? <VerifiedBadge dark /> : null}
              <TrustLevelChip level={trust.level} label={t(trust.labelKey)} invert />
            </View>
          </View>
        </View>
        <ScoreRing score={data.score} size={76} color="rgba(255,255,255,0.9)" trackColor="rgba(255,255,255,0.15)" textColor="#fff" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}>
        {[
          { label: t('petFeed.topBreeders.type'), value: data.typeShortLabel || data.typeFullLabel },
          { label: t('petFeed.topBreeders.scale'), value: data.scaleLabel },
          {
            label: t('petFeed.topBreeders.posts'),
            value: t('breederDetail.listingsCount', { count: data.listingsCount }),
          },
        ].map((metric) => (
          <View
            key={metric.label}
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }} numberOfLines={1}>
              {metric.label}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
              {metric.value || t('petFeed.topBreeders.notUpdated')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HeroT2({ data }: { data: BreederHeroData }) {
  const { t } = useTranslation();
  const trust = trustLevelFromScore(data.score);
  const cover = data.coverImageUrl || 'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=800&h=440&fit=crop&auto=format';
  return (
    <View style={{ height: 220, overflow: 'hidden', backgroundColor: '#0F172A' }}>
      <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <ScoreRing score={data.score} size={36} color={scoreColor(data.score)} trackColor="rgba(255,255,255,0.15)" textColor="#fff" />
        <View>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('farmHealth.trustShort')}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{t(trust.labelKey)}</Text>
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          backgroundColor: 'rgba(0,0,0,0.45)',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
          🐾 {t('breederDetail.listingsCount', { count: data.listingsCount })}
        </Text>
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            borderWidth: 3,
            borderColor: 'rgba(255,255,255,0.9)',
            backgroundColor: '#1E6FE8',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#fff' }}>{initialsFromName(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 22, marginBottom: 4 }} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {showHeroVerified(data) ? <VerifiedBadge dark /> : null}
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
              {[data.location, data.speciesLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function HeroT3({ data }: { data: BreederHeroData }) {
  const { t } = useTranslation();
  const trust = trustLevelFromScore(data.score);
  return (
    <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
      <View style={{ height: 3, backgroundColor: '#7C3AED' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: '#7C3AED',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#fff' }}>{initialsFromName(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 }} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {showHeroVerified(data) ? <VerifiedBadge /> : null}
            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>
              {[data.location, data.speciesLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexShrink: 0,
            backgroundColor: '#F5F3FF',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: '#EDE9FE',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#7C3AED', lineHeight: 22 }}>{data.score}</Text>
          <Text style={{ fontSize: 9, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>/ 100</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <TrustLevelChip level={trust.level} label={t(trust.labelKey)} />
        <View style={{ backgroundColor: '#F5F3FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#7C3AED' }}>
            📋 {t('breederDetail.listingsCount', { count: data.listingsCount })}
          </Text>
        </View>
      </View>
    </View>
  );
}

function HeroT4({ data }: { data: BreederHeroData }) {
  const { t } = useTranslation();
  const reports = data.reportsCount ?? 0;
  return (
    <View style={{ backgroundColor: '#D1FAE5', overflow: 'hidden', paddingHorizontal: 20, paddingTop: 20 }}>
      <Text style={{ position: 'absolute', right: -10, top: -10, fontSize: 110, opacity: 0.08 }}>🐾</Text>
      <View
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#059669',
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 5,
          marginBottom: 14,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>♡ {t('breederTemplates.T4.badge')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#059669',
            borderWidth: 3,
            borderColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontWeight: '800', fontSize: 22, color: '#fff' }}>{initialsFromName(data.name)}</Text>
        </View>
        <View style={{ flex: 1, paddingTop: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#064E3B', lineHeight: 20, marginBottom: 5 }} numberOfLines={2}>
            {data.name}
          </Text>
          <Text style={{ fontSize: 12, color: '#047857', marginBottom: 6 }} numberOfLines={1}>
            {[data.location ? `📍 ${data.location}` : '', data.speciesLabel ? `🐾 ${data.speciesLabel}` : ''].filter(Boolean).join('  ·  ')}
          </Text>
          {showHeroVerified(data) ? <VerifiedBadge /> : null}
        </View>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
        <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          {t('breederDetail.commitments')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { value: String(data.score), label: t('petFeed.topBreeders.trustScore') },
            { value: String(data.listingsCount), label: t('petFeed.topBreeders.posts') },
            { value: String(reports), label: t('farmHealth.reports') },
          ].map((item, index) => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: index === 0 ? 0 : 1, borderLeftColor: '#A7F3D0' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#065F46' }}>{item.value}</Text>
              <Text style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.4 }} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function HeroT5({ data }: { data: BreederHeroData }) {
  const { t } = useTranslation();
  const trust = trustLevelFromScore(data.score);
  const kennelLabel = data.registeredKennelName
    ? t('breederDetail.registeredKennelBanner', { name: data.registeredKennelName })
    : t('breederDetail.registeredKennelBannerDefault');
  return (
    <View style={{ backgroundColor: '#0F172A', overflow: 'hidden' }}>
      <View style={{ backgroundColor: '#B45309', paddingHorizontal: 20, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14 }}>🏅</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
          {kennelLabel}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingTop: 18, alignItems: 'center' }}>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            backgroundColor: '#1E3A5F',
            borderWidth: 2,
            borderColor: 'rgba(245,158,11,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontWeight: '800', fontSize: 20, color: '#fff' }}>{initialsFromName(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#F8FAFC', lineHeight: 20, marginBottom: 5 }} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            {showHeroVerified(data) ? (
              <View
                style={{
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  borderColor: 'rgba(245,158,11,0.25)',
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FCD34D' }}>✓ {t('petFeed.topBreeders.verified')}</Text>
              </View>
            ) : null}
            {data.location ? (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{data.location}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
            {[data.speciesLabel ? `🐾 ${data.speciesLabel}` : '', data.breedsLabel].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 }}>
        {[
          { label: t('petFeed.topBreeders.trustScore'), value: `${data.score}/100`, accent: scoreColor(data.score) },
          {
            label: t('petFeed.topBreeders.posts'),
            value: t('breederDetail.listingsCount', { count: data.listingsCount }),
            accent: '#F59E0B',
          },
          { label: t('farmHealth.level'), value: t(trust.labelKey), accent: '#1E6FE8' },
        ].map((metric) => (
          <View
            key={metric.label}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <Text style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }} numberOfLines={1}>
              {metric.label}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: metric.accent }} numberOfLines={1}>
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
