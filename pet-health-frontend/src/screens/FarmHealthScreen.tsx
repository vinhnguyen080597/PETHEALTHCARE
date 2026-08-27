import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { listMyBreederProfileSubmissions } from '../api';
import { TrustGuideEarnModal } from '../components/TrustGuideEarnModal';
import { TrustLevelChip } from '../components/breeder/TrustLevelChip';
import { TrustTicksGauge } from '../components/breeder/TrustTicksGauge';
import type { BreederProfile, PetFeedPost } from '../types';
import type { EarnSubmissionLite } from '../utils/trustGuideEarnStatus';
import { getActiveBreederViolations } from '../utils/breederQualityIndex';
import {
  computeTransparencyScore,
  getTransparencyTier,
  parseApprovedSocialFromMeta,
  parseTransparencyActivityFromMeta,
} from '../utils/breederTransparencyScore';
import {
  pickLangText,
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  trustGuideLangFromLocale,
  trustGuideTierSummary,
  type TrustGuideHowToEarn,
} from '../utils/farmTrustGuide';
import { farmTrustLevelChipLabel } from '../utils/farmTrustDisplay';
import {
  formatTransparencyBreakdownPoints,
  transparencyBreakdownLabel,
  visibleTransparencyBreakdownLines,
} from '../utils/transparencyBreakdownDisplay';
import {
  buildTrustGuideEarnRowStates,
  earnRowCtaI18nPath,
  type TrustGuideEarnAction,
} from '../utils/trustGuideEarnStatus';

const FARM_BG = '#FDFBF7';
const FARM_CARD = '#FFFFFF';
const FARM_BORDER = '#F3E2C8';
const FARM_ACCENT = '#B45309';
const FARM_TEXT = '#0F172A';
const FARM_MUTED = '#64748B';

type FarmHealthScreenProps = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  token: string | null;
  onBack: () => void;
  onOpenBreederProfile?: () => void;
  onOpenWarranty?: () => void;
};

function contactRecord(profile: BreederProfile): Record<string, string | undefined> {
  const contact = profile.contact ?? {};
  return {
    facebook: typeof contact.facebook === 'string' ? contact.facebook : undefined,
    zalo: typeof contact.zalo === 'string' ? contact.zalo : undefined,
    tiktok: typeof contact.tiktok === 'string' ? contact.tiktok : undefined,
    instagram: typeof contact.instagram === 'string' ? contact.instagram : undefined,
  };
}

export function FarmHealthScreen({
  profile,
  posts: _posts,
  token,
  onBack,
  onOpenBreederProfile,
  onOpenWarranty,
}: FarmHealthScreenProps) {
  const { t, i18n } = useTranslation();
  const lang = trustGuideLangFromLocale(i18n.language);
  const metadata = profile.metadata ?? {};
  const activity = parseTransparencyActivityFromMeta(metadata);
  const social = parseApprovedSocialFromMeta(metadata);
  const isVerified = profile.verification_status === 'verified';
  const [submissions, setSubmissions] = useState<EarnSubmissionLite[]>([]);
  const [earnModalRowId, setEarnModalRowId] = useState<string | null>(null);

  const refreshSubmissions = useCallback(async () => {
    if (!token) {
      setSubmissions([]);
      return;
    }
    try {
      const res = await listMyBreederProfileSubmissions(token);
      const rows = Array.isArray(res.data) ? res.data : [];
      setSubmissions(
        rows.map((row) => ({
          submission_type: row.submission_type,
          status: row.status,
          payload: row.payload,
        })),
      );
    } catch {
      // Keep prior rows; guide still works from profile metadata.
    }
  }, [token]);

  useEffect(() => {
    void refreshSubmissions();
  }, [refreshSubmissions]);

  const computed = useMemo(
    () =>
      computeTransparencyScore({
        isVerified,
        ...social,
        approvedFacilityVideo: activity.approvedFacilityVideo,
        approvedBusinessLicense: activity.approvedBusinessLicense,
        approvedFirstWarranty: activity.approvedFirstWarranty,
        senConfirmedCompletions: activity.senConfirmedCompletions,
        fiveStarReviewCount: activity.fiveStarReviewCount,
        penaltyPoints:
          typeof metadata.penaltyPoints === 'number'
            ? metadata.penaltyPoints
            : Number(metadata.penaltyPoints) || 0,
      }),
    [activity, isVerified, metadata.penaltyPoints, social],
  );
  const score = computed.score;
  const tier = getTransparencyTier(score);
  const tierLabel = farmTrustLevelChipLabel(
    tier.level,
    lang === 'VI' ? tier.nameVI : tier.nameEN,
  );
  const tierMeaning = lang === 'VI' ? tier.meaningVI : tier.meaningEN;
  const violations = getActiveBreederViolations(profile);
  const earnRows = useMemo(
    () =>
      buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
        isVerified,
        meta: metadata,
        senConfirmedCompletions: activity.senConfirmedCompletions,
        fiveStarReviewCount: activity.fiveStarReviewCount,
        lang,
        verificationStatus: profile.verification_status,
        submissions,
        contact: contactRecord(profile),
      }),
    [activity, isVerified, lang, metadata, profile, submissions],
  );
  const tierRows = useMemo(() => trustGuideTierSummary(lang), [lang]);
  const breakdownLines = visibleTransparencyBreakdownLines(computed.lines);
  const earnModalRow = TRUST_GUIDE_HOW_TO_EARN.find((row) => row.id === earnModalRowId) as
    | TrustGuideHowToEarn
    | undefined;
  const earnModalAction = earnRows.find((row) => row.id === earnModalRowId)?.action ?? null;

  function openEarnModal(rowId: string, action: TrustGuideEarnAction) {
    if (action.kind === 'none') return;
    setEarnModalRowId(rowId);
  }

  return (
    <View testID="farm-health-screen" style={{ flex: 1, backgroundColor: FARM_BG }}>
      {earnModalRow && earnModalAction && token ? (
        <TrustGuideEarnModal
          visible={Boolean(earnModalRowId)}
          token={token}
          row={earnModalRow}
          action={earnModalAction}
          onClose={() => setEarnModalRowId(null)}
          onSubmitted={() => void refreshSubmissions()}
          onOpenBreederProfile={onOpenBreederProfile}
          onOpenWarranty={onOpenWarranty ?? onBack}
        />
      ) : null}
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
          testID="farm-health-back-button"
          accessibilityRole="button"
          accessibilityLabel={t('farm.trust.guide.back')}
          className="w-14 rounded-lg p-2"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: FARM_TEXT }}
          numberOfLines={1}
        >
          {t('farm.trust.guide.title')}
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
          {t('farm.trust.guide.ownerOnly')}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: FARM_TEXT, marginBottom: 8 }}>
          {t('farm.trust.guide.title')}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: FARM_MUTED, marginBottom: 16 }}>
          {t('farm.trust.guide.intro')}
        </Text>

        {/* Score snapshot */}
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
          <TrustTicksGauge score={score} caption={t('farm.trust.gaugeCaption')} size={180} />
          <View style={{ marginTop: 12, alignItems: 'center', gap: 8 }}>
            <TrustLevelChip level={tier.level} label={tierLabel} />
            <Text style={{ fontSize: 13, color: FARM_MUTED, textAlign: 'center', lineHeight: 19 }}>
              {t('farm.trust.guide.scoreSnapshot', {
                score,
                profile: computed.profilePoints,
                activity: computed.activityPoints,
                penalty: computed.violationPoints,
              })}
            </Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 }}>
              {tierMeaning}
            </Text>
          </View>
        </View>

        {/* Live breakdown */}
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
            ?? {t('farm.trust.breakdownTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: FARM_MUTED, marginBottom: 10, lineHeight: 19 }}>
            {t('farm.trust.guide.breakdownHint')}
          </Text>
          {breakdownLines.map((line) => (
            <View
              key={line.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <Text style={{ color: line.done ? '#059669' : '#CBD5E1', fontSize: 14 }}>
                  {line.done ? '?' : '?'}
                </Text>
                <Text style={{ fontSize: 13, color: '#334155', flexShrink: 1 }} numberOfLines={2}>
                  {transparencyBreakdownLabel(lang, line.key)}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: FARM_MUTED, marginLeft: 8 }}>
                {formatTransparencyBreakdownPoints(line, lang)}
              </Text>
            </View>
          ))}
          {violations.length > 0 ? (
            <View
              style={{
                marginTop: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FEE2E2',
                backgroundColor: '#FEF2F2',
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#991B1B' }}>
                {t('farm.trust.guide.confirmedViolations')}
              </Text>
              {violations.map((v) => (
                <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B' }}>{v.reason}</Text>
                    {v.createdAt ? (
                      <Text style={{ fontSize: 11, color: '#F87171', marginTop: 2 }}>{v.createdAt}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>?{v.points}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* How to earn */}
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
            ? {t('farm.trust.guide.earnTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: FARM_MUTED, marginBottom: 12, lineHeight: 19 }}>
            {t('farm.trust.guide.earnIntro')}
          </Text>
          {TRUST_GUIDE_HOW_TO_EARN.map((row) => {
            const state = earnRows.find((item) => item.id === row.id);
            const done = state?.done ?? false;
            const cta = state?.cta ?? 'none';
            const pointsLabel = state?.pointsLabel ?? `+${row.points}?`;
            const description =
              state?.description ?? pickLangText(lang, row.howVI, row.howEN);
            const descriptionHref = state?.descriptionHref ?? null;
            const ctaPath = earnRowCtaI18nPath(cta);
            return (
              <View
                key={row.id}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: done ? '#D1FAE5' : '#F1F5F9',
                  backgroundColor: done ? '#ECFDF5' : '#F8FAFC',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: '700',
                      color: done ? '#065F46' : FARM_TEXT,
                    }}
                  >
                    {pickLangText(lang, row.titleVI, row.titleEN)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: done ? '#047857' : FARM_MUTED,
                    }}
                  >
                    {pointsLabel}
                  </Text>
                </View>
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  {descriptionHref ? (
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => void Linking.openURL(descriptionHref)}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 19,
                          color: done ? '#047857' : FARM_MUTED,
                          textDecorationLine: 'underline',
                        }}
                      >
                        {description}
                      </Text>
                    </Pressable>
                  ) : description ? (
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        lineHeight: 19,
                        color: done ? '#047857' : FARM_MUTED,
                      }}
                    >
                      {description}
                    </Text>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  {cta === 'pending' && ctaPath ? (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>{t(ctaPath)}</Text>
                  ) : null}
                  {(cta === 'update' || cta === 'rejected') && ctaPath ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        openEarnModal(row.id, state?.action ?? { kind: 'none' })
                      }
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: cta === 'rejected' ? '#FECACA' : '#D97706',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: cta === 'rejected' ? '#B91C1C' : '#D97706',
                        }}
                      >
                        {t(ctaPath)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {state?.mediaKind === 'image' && state.mediaUrl ? (
                  <Image
                    source={{ uri: state.mediaUrl }}
                    style={{ marginTop: 8, width: '100%', height: 160, borderRadius: 10, backgroundColor: '#fff' }}
                    resizeMode="contain"
                  />
                ) : null}
                {state?.mediaKind === 'video' && state.mediaUrl ? (
                  <Pressable
                    style={{ marginTop: 8 }}
                    onPress={() => void Linking.openURL(state.mediaUrl!)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>
                      {t('farm.facility.openVideo')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Rules */}
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
            ?? {t('farm.trust.guide.rulesTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: FARM_MUTED, marginBottom: 12, lineHeight: 19 }}>
            {t('farm.trust.guide.rulesIntro')}
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
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>?{row.points}?</Text>
              </View>
              <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: FARM_MUTED }}>
                {pickLangText(lang, row.actionVI, row.actionEN)}
              </Text>
            </View>
          ))}
        </View>

        {/* Impact */}
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
            ?? {t('farm.trust.guide.impactTitle')}
          </Text>
          {TRUST_GUIDE_IMPACT.map((row) => (
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
              {t('farm.trust.guide.tiersTitle')}
            </Text>
            {tierRows.map((line) => (
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
