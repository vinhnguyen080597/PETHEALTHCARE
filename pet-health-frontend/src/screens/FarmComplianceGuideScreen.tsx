import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrustTicksGauge } from '../components/breeder/TrustTicksGauge';
import type { BreederProfile } from '../types';
import { getActiveBreederViolations } from '../utils/breederQualityIndex';
import {
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandChipStyle,
  complianceBandForScore,
  complianceBandLabel,
  complianceBandMeaning,
  complianceTickColor,
  getComplianceScoreFromMetadata,
} from '../utils/breederComplianceScore';
import {
  COMPLIANCE_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  complianceGuideBandSummary,
  pickLangText,
  trustGuideLangFromLocale,
} from '../utils/farmTrustGuide';

const FARM_BG = '#FDFBF7';
const FARM_CARD = '#FFFFFF';
const FARM_BORDER = '#F3E2C8';
const FARM_ACCENT = '#B45309';
const FARM_TEXT = '#0F172A';
const FARM_MUTED = '#64748B';

type FarmComplianceGuideScreenProps = {
  profile: BreederProfile;
  onBack: () => void;
};

export function FarmComplianceGuideScreen({
  profile,
  onBack,
}: FarmComplianceGuideScreenProps) {
  const { t, i18n } = useTranslation();
  const lang = trustGuideLangFromLocale(i18n.language);
  const metadata = profile.metadata ?? {};
  const complianceScore =
    getComplianceScoreFromMetadata(metadata) || COMPLIANCE_SCORE_DEFAULT;
  const complianceBand = complianceBandForScore(complianceScore);
  const complianceBandText = complianceBandLabel(complianceBand, lang);
  const complianceMeaning = complianceBandMeaning(complianceBand, lang);
  const chipStyle = complianceBandChipStyle(complianceBand);
  const bandRows = useMemo(() => complianceGuideBandSummary(lang), [lang]);
  const violations = getActiveBreederViolations(profile);

  return (
    <View testID="farm-compliance-screen" style={{ flex: 1, backgroundColor: FARM_BG }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: FARM_BORDER,
          backgroundColor: FARM_CARD,
          paddingHorizontal: 8,
          paddingVertical: 8,
        }}
      >
        <Pressable
          testID="farm-compliance-back-button"
          accessibilityRole="button"
          accessibilityLabel={t('farm.compliance.guide.back')}
          className="w-14 rounded-lg p-2"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: FARM_TEXT }}
          numberOfLines={1}
        >
          {t('farm.compliance.guide.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: FARM_ACCENT,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          {t('farm.compliance.guide.ownerOnly')}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: FARM_TEXT, marginBottom: 8 }}>
          {t('farm.compliance.guide.title')}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: FARM_MUTED, marginBottom: 16 }}>
          {t('farm.compliance.guide.intro')}
        </Text>

        <View
          style={{
            backgroundColor: FARM_CARD,
            borderWidth: 1,
            borderColor: FARM_BORDER,
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <TrustTicksGauge
            score={complianceScore}
            caption={t('farm.trust.complianceGaugeCaption')}
            size={180}
            tickColor={complianceTickColor}
          />
          <View style={{ marginTop: 12, alignItems: 'center', gap: 8 }}>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: chipStyle.border,
                backgroundColor: chipStyle.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: chipStyle.text }}>
                {complianceBandText} · {complianceScore}/100
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: FARM_MUTED, textAlign: 'center', lineHeight: 19 }}>
              {complianceMeaning}
            </Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 }}>
              {t('farm.trust.complianceHint')}
            </Text>
          </View>
        </View>

        {violations.length > 0 ? (
          <View
            style={{
              backgroundColor: FARM_CARD,
              borderWidth: 1,
              borderColor: '#F1F5F9',
              borderRadius: 16,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: FARM_TEXT,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                marginBottom: 10,
              }}
            >
              {t('farm.trust.guide.confirmedViolations')}
            </Text>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FEE2E2',
                backgroundColor: '#FEF2F2',
                padding: 12,
                gap: 8,
              }}
            >
              {violations.map((v) => (
                <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B' }}>{v.reason}</Text>
                    {v.createdAt ? (
                      <Text style={{ fontSize: 11, color: '#F87171', marginTop: 2 }}>{v.createdAt}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>−{v.points}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: FARM_CARD,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            borderRadius: 16,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: FARM_TEXT,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 6,
            }}
          >
            {t('farm.compliance.guide.rulesTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: FARM_MUTED, marginBottom: 12, lineHeight: 19 }}>
            {t('farm.compliance.guide.rulesIntro')}
          </Text>
          {TRUST_GUIDE_PENALTIES.map((row) => (
            <View
              key={row.id}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FEF2F2',
                backgroundColor: '#FEF2F2',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: FARM_TEXT }}>
                  {pickLangText(lang, row.titleVI, row.titleEN)}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>−{row.points}đ</Text>
              </View>
              {row.behaviorsVI ? (
                <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: FARM_TEXT }}>
                  {pickLangText(lang, row.behaviorsVI, row.behaviorsEN || row.behaviorsVI)}
                </Text>
              ) : null}
              <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: FARM_MUTED }}>
                {pickLangText(lang, row.actionVI, row.actionEN)}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: FARM_CARD,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            borderRadius: 16,
            padding: 18,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: FARM_TEXT,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 12,
            }}
          >
            {t('farm.compliance.guide.impactTitle')}
          </Text>
          {COMPLIANCE_GUIDE_IMPACT.map((row) => (
            <View key={row.id} style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: FARM_TEXT, marginBottom: 4 }}>
                {pickLangText(lang, row.titleVI, row.titleEN)}
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: FARM_MUTED }}>
                {pickLangText(lang, row.bodyVI, row.bodyEN)}
              </Text>
            </View>
          ))}
          <View
            style={{
              marginTop: 4,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#F1F5F9',
              backgroundColor: '#F8FAFC',
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                marginBottom: 8,
              }}
            >
              {t('farm.compliance.guide.bandsTitle')}
            </Text>
            {bandRows.map((line) => (
              <Text key={line} style={{ fontSize: 11, lineHeight: 17, color: FARM_MUTED, marginBottom: 4 }}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
