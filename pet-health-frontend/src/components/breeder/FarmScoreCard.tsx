import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrustLevelChip } from './TrustLevelChip';
import { TrustTicksGauge } from './TrustTicksGauge';
import {
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandChipStyle,
  complianceBandForScore,
  complianceBandLabel,
  complianceBandMeaning,
  complianceScoreColor,
  complianceTickColor,
  getComplianceScoreFromMetadata,
} from '../../utils/breederComplianceScore';
import {
  computeTransparencyScore,
  getTransparencyTier,
  transparencyProfileCompletionPercent,
  transparencyScoreColor,
  parseApprovedSocialFromMeta,
  parseTransparencyActivityFromMeta,
} from '../../utils/breederTransparencyScore';
import { farmTrustLevelChipLabel } from '../../utils/farmTrustDisplay';
import { trustGuideLangFromLocale } from '../../utils/farmTrustGuide';
import type { BreederProfile } from '../../types';

const FARM_BORDER = '#F3E2C8';
const FARM_BG = '#FDFBF7';
const FARM_TEXT = '#0F172A';
const FARM_MUTED = '#64748B';
const FARM_ACCENT = '#B45309';

type FarmScoreCardProps = {
  profile: BreederProfile;
  transparencyScore: number;
  isOwnProfile?: boolean;
  onOpenTransparencyGuide?: () => void;
  onOpenComplianceGuide?: () => void;
};

function ScoreColumn({
  badge,
  gauge,
  metricLabel,
  metricValue,
  metricPercent,
  metricColor,
  hint,
  ctaLabel,
  ctaColor,
  onPressCta,
}: {
  badge: ReactNode;
  gauge: React.ReactNode;
  metricLabel: string;
  metricValue: string;
  metricPercent: number;
  metricColor: string;
  hint: string;
  ctaLabel?: string;
  ctaColor?: string;
  onPressCta?: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
        padding: 12,
      }}
    >
      <View style={{ alignSelf: 'flex-end', marginBottom: 10 }}>{badge}</View>

      <View style={{ alignItems: 'center' }}>{gauge}</View>

      <View style={{ marginTop: 12, gap: 6, flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', flex: 1 }} numberOfLines={1}>
            {metricLabel}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: metricColor }}>{metricValue}</Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: '#E2E8F0',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, metricPercent))}%`,
              borderRadius: 999,
              backgroundColor: metricColor,
            }}
          />
        </View>
        <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 15 }}>{hint}</Text>
      </View>

      {ctaLabel && onPressCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={onPressCta}
          style={{
            marginTop: 12,
            minHeight: 44,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: ctaColor || FARM_ACCENT,
            backgroundColor: '#FFFFFF',
            paddingVertical: 10,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: 12, fontWeight: '700', color: ctaColor || FARM_ACCENT, textAlign: 'center' }}
            numberOfLines={2}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ScoreColumnWithTitle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={{ fontSize: 11, fontWeight: '800', color: '#334155', marginBottom: 8 }}
        numberOfLines={2}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export function FarmScoreCard({
  profile,
  transparencyScore,
  isOwnProfile = false,
  onOpenTransparencyGuide,
  onOpenComplianceGuide,
}: FarmScoreCardProps) {
  const { t, i18n } = useTranslation();
  const lang = trustGuideLangFromLocale(i18n.language);
  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const activity = parseTransparencyActivityFromMeta(metadata);
  const social = parseApprovedSocialFromMeta(metadata);
  const isVerified = profile.verification_status === 'verified';

  const computed = computeTransparencyScore({
    isVerified,
    ...social,
    approvedFacilityVideo: activity.approvedFacilityVideo,
    approvedBusinessLicense: activity.approvedBusinessLicense,
    approvedFirstWarranty: activity.approvedFirstWarranty,
  });
  const profileProgress = transparencyProfileCompletionPercent(computed);
  const tier = getTransparencyTier(transparencyScore);
  const tierLabel = farmTrustLevelChipLabel(
    tier.level,
    lang === 'VI' ? tier.nameVI : tier.nameEN,
  );
  const transparencyColor = transparencyScoreColor(transparencyScore);
  const transparencyHint = lang === 'VI' ? tier.meaningVI : tier.meaningEN;

  const complianceScore =
    typeof metadata.complianceScore === 'number'
      ? metadata.complianceScore
      : getComplianceScoreFromMetadata(metadata) || COMPLIANCE_SCORE_DEFAULT;
  const complianceBand = complianceBandForScore(complianceScore);
  const complianceBandText = complianceBandLabel(complianceBand, lang);
  const complianceMeaning = complianceBandMeaning(complianceBand, lang);
  const complianceColor = complianceScoreColor(complianceScore);
  const chipStyle = complianceBandChipStyle(complianceBand);

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: FARM_BORDER,
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: FARM_TEXT,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {t('farm.trust.sectionTitle')}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 13, color: FARM_MUTED, lineHeight: 19 }}>
        {t('farm.trust.sectionSubtitle')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 14 }}>
        <ScoreColumnWithTitle title={t('farm.trust.gaugeCaption')}>
          <ScoreColumn
            badge={<TrustLevelChip level={tier.level} label={tierLabel} />}
            gauge={
              <TrustTicksGauge
                score={transparencyScore}
                caption={t('farm.trust.gaugeOutOf')}
                size={132}
              />
            }
            metricLabel={t('farm.trust.profileProgress')}
            metricValue={`${profileProgress}%`}
            metricPercent={profileProgress}
            metricColor={transparencyColor}
            hint={transparencyHint}
            ctaLabel={isOwnProfile ? t('farm.trust.guideCta') : undefined}
            ctaColor={FARM_ACCENT}
            onPressCta={onOpenTransparencyGuide}
          />
        </ScoreColumnWithTitle>

        <ScoreColumnWithTitle title={t('farm.trust.complianceGaugeCaption')}>
          <ScoreColumn
            badge={
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: chipStyle.border,
                  backgroundColor: chipStyle.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: chipStyle.text }} numberOfLines={1}>
                  {complianceBandText}
                </Text>
              </View>
            }
            gauge={
              <TrustTicksGauge
                score={complianceScore}
                caption={t('farm.trust.gaugeOutOf')}
                size={132}
                tickColor={complianceTickColor}
              />
            }
            metricLabel={t('farm.trust.accountStatus')}
            metricValue={complianceBandText}
            metricPercent={complianceScore}
            metricColor={complianceColor}
            hint={`${complianceMeaning} ${t('farm.trust.complianceHint')}`}
            ctaLabel={isOwnProfile ? t('farm.compliance.guideCta') : undefined}
            ctaColor="#047857"
            onPressCta={onOpenComplianceGuide}
          />
        </ScoreColumnWithTitle>
      </View>
    </View>
  );
}
