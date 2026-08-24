import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BreederHero, type BreederHeroData } from '../components/breeder/BreederHero';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { ReportModal } from '../components/ReportModal';
import { getBreederTemplateId, templateAccent, type BreederTemplateId } from '../constants/breederTemplates';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import type { BreederProfile, PetFeedPost } from '../types';
import { computeBreederTrust, hasBreederContact, metadataArray, metadataString } from '../utils/breederTrust';
import { breederDisplaySpecies } from '../utils/breederSpeciesSelection';
import { displayRegistrationUnit } from '../utils/breederRegistrationUnits';
import { parsePetFeedPriceToVnd } from '../utils/petFeedCurrency';

type BreederDetailScreenProps = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  onBack: () => void;
  onReportBreeder: (profile: BreederProfile, reason: string, note?: string) => void;
  onHideBreeder: (profile: BreederProfile) => void;
  onOpenPostDetail: (postId: string) => void;
  onOpenFarmHealth?: () => void;
  onOpenTemplatePicker?: () => void;
  /** Feature flag (admins always allowed via isFeatureEnabled). */
  allowTemplateChange?: boolean;
  currentUserId?: string | null;
};

type GenderFilter = 'all' | 'male' | 'female' | 'unknown';
type SortField = 'date' | 'age' | 'price';
type SortDirection = 'asc' | 'desc';
type DetailTab = 'overview' | 'listings';

function normalizeSearchText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function createdTime(post: PetFeedPost) {
  const time = new Date(post.created_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareMaybeNumber(a: number | null, b: number | null, direction: SortDirection) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function genderGroup(post: PetFeedPost): GenderFilter {
  const value = normalizeSearchText(post.gender);
  if (value.includes('female') || value.includes('cai')) return 'female';
  if (value.includes('male') || value.includes('duc')) return 'male';
  return 'unknown';
}

function shortBreederTypeLabel(t: (key: string) => string, breederType: string) {
  if (!breederType) return '';
  const shortKey = `breederDetail.typeShort.${breederType}`;
  const short = t(shortKey);
  if (short !== shortKey) return short;
  return t(`breederProfile.breederTypes.${breederType}`);
}

export function BreederDetailScreen({
  profile,
  posts = [],
  onBack,
  onReportBreeder,
  onHideBreeder,
  onOpenPostDetail,
  onOpenFarmHealth,
  onOpenTemplatePicker,
  allowTemplateChange = false,
  currentUserId,
}: BreederDetailScreenProps) {
  const { t } = useTranslation();
  const isOwnProfile = Boolean(currentUserId && profile.user_id === currentUserId);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');
  const listingPosts = Array.isArray(posts) ? posts : [];
  const primarySpecies = Array.isArray(profile.primary_species) ? profile.primary_species : [];
  const mainBreeds = Array.isArray(profile.main_breeds) ? profile.main_breeds : [];
  const trust = useMemo(() => computeBreederTrust(profile, listingPosts), [profile, listingPosts]);
  const templateId = getBreederTemplateId(profile.metadata);
  const breederType = metadataString(profile.metadata, 'breederType');
  const registeredAt = metadataString(profile.metadata, 'registeredAt');
  const registrationUnitLabel = displayRegistrationUnit(
    profile.registration_unit || '',
    profile.registration_unit_other || '',
    (key) => t(key),
  );
  const registeredKennelName = metadataString(profile.metadata, 'registeredKennelName');
  const commitments = metadataArray(profile.metadata, 'transparencyCommitments');
  const coverImageUrl = metadataString(profile.metadata, 'coverImageUrl') || profile.avatar_url;
  const species = breederDisplaySpecies(primarySpecies)
    .map((value) => translatedOption(t, 'breederProfile.speciesOptions', value))
    .filter(Boolean)
    .join(', ');
  const breeds = mainBreeds.join(', ');
  const typeFullLabel = breederType ? t(`breederProfile.breederTypes.${breederType}`) : t('petFeed.topBreeders.notUpdated');
  const typeShortLabel = shortBreederTypeLabel(t, breederType) || typeFullLabel;
  const scaleRange = metadataString(profile.metadata, 'scaleRange');
  const scaleLabel = scaleRange
    ? t(`breederProfile.scaleOptions.${scaleRange}`)
    : t('petFeed.topBreeders.notUpdated');
  const isT5 = templateId === 'T5';
  const accent = templateAccent(templateId);
  const tabBg = isT5 ? '#0F172A' : '#fff';
  const tabText = isT5 ? '#94A3B8' : '#64748B';
  const screenBg = isT5 ? '#0F172A' : '#F2F4F8';
  const headerBg = headerBackground(templateId);
  const headerText = headerTextColor(templateId);

  const heroData: BreederHeroData = {
    name: profile.display_name || t('petFeed.breederFallback'),
    location: profile.location || '',
    speciesLabel: species,
    breedsLabel: breeds,
    typeShortLabel,
    typeFullLabel,
    scaleLabel,
    score: trust.score,
    listingsCount: listingPosts.length,
    verified: profile.verification_status === 'verified',
    coverImageUrl,
    registeredKennelName,
  };

  const filteredPosts = useMemo(() => {
    const byGender = genderFilter === 'all' ? listingPosts : listingPosts.filter((post) => genderGroup(post) === genderFilter);
    return [...byGender].sort((a, b) => {
      if (sortField === 'age') return compareMaybeNumber(a.age_months, b.age_months, sortDirection);
      if (sortField === 'price') return compareMaybeNumber(parsePetFeedPriceToVnd(a.price_note), parsePetFeedPriceToVnd(b.price_note), sortDirection);
      return sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a);
    });
  }, [genderFilter, listingPosts, sortDirection, sortField]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'date' ? 'desc' : 'asc');
  }

  function confirmHideBreeder() {
    Alert.alert(t('breederDetail.blockTitle'), t('breederDetail.blockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('breederDetail.blockConfirm'), style: 'destructive', onPress: () => onHideBreeder(profile) },
    ]);
  }

  function submitProfileReport() {
    onReportBreeder(profile, reportReason, reportNote);
    setReportVisible(false);
    setReportNote('');
  }

  return (
    <View testID="breeder-detail-screen" style={{ flex: 1, backgroundColor: screenBg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: headerBg, paddingHorizontal: 8, paddingVertical: 8 }}>
        <Pressable
          className="w-14 rounded-lg p-2"
          onPress={onBack}
          style={{
            backgroundColor:
              templateId === 'T3' || templateId === 'T4' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
            borderRadius: 10,
            marginLeft: 4,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={headerText} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: headerText }} numberOfLines={1}>
          {t('breederDetail.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <BreederHero data={heroData} templateId={templateId} />

        {isOwnProfile ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              gap: 10,
              backgroundColor: isT5 ? '#0F172A' : '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={onOpenFarmHealth}
              style={{
                flex: 1,
                paddingVertical: 11,
                backgroundColor: accent,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('breederDetail.openFarmHealth')}</Text>
            </Pressable>
            {allowTemplateChange && onOpenTemplatePicker ? (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenTemplatePicker}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  backgroundColor: isT5 ? 'rgba(255,255,255,0.08)' : '#fff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isT5 ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: isT5 ? '#E2E8F0' : '#0F172A', fontWeight: '600', fontSize: 13 }}>
                  {t('breederDetail.changeTemplate')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              gap: 10,
              backgroundColor: isT5 ? '#0F172A' : '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => setReportVisible(true)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 11,
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Ionicons name="flag-outline" size={16} color="#64748b" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{t('breederDetail.reportProfile')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmHideBreeder}
              style={{
                width: 46,
                height: 42,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <Ionicons name="eye-off-outline" size={18} color="#DC2626" />
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', backgroundColor: tabBg, borderBottomWidth: 1, borderBottomColor: isT5 ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
          {([
            { id: 'overview' as const, label: t('breederDetail.tabOverview') },
            { id: 'listings' as const, label: t('breederDetail.tabListings', { count: listingPosts.length }) },
          ]).map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.id ? accent : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: activeTab === tab.id ? '700' : '500', color: activeTab === tab.id ? accent : tabText }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'overview' ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
            <SectionCard title={t('breederDetail.farmInfo')} dark={isT5}>
              <InfoRow icon="🏠" label={t('petFeed.topBreeders.type')} value={typeFullLabel} dark={isT5} />
              <InfoRow icon="📍" label={t('breederDetail.area')} value={profile.location || t('petFeed.topBreeders.notUpdated')} dark={isT5} />
              <InfoRow icon="🐾" label={t('breederDetail.mainBreeds')} value={breeds || t('petFeed.topBreeders.notUpdated')} dark={isT5} />
              <InfoRow
                icon="📞"
                label={t('breederDetail.contact')}
                value={hasBreederContact(profile) ? t('breederDetail.contactAvailable') : t('breederDetail.contactMissing')}
                dark={isT5}
              />
            </SectionCard>

            <SectionCard title={t('breederDetail.trustSignalsTitle')} dark={isT5}>
              {trust.signals.map((signal) => (
                <View key={signal.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: signal.passed ? '#D1FAE5' : '#FEF3C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: signal.passed ? '#059669' : '#D97706' }}>{signal.passed ? '✓' : '!'}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: isT5 ? '#E2E8F0' : '#0F172A' }}>
                    {t(`breederDetail.trustSignals.${signal.key}`)}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: signal.passed ? '#059669' : '#D97706' }}>
                    {Math.round(signal.value)}/{signal.max}
                  </Text>
                </View>
              ))}
            </SectionCard>

            {profile.bio ? (
              <SectionCard title={t('breederDetail.profileInfo')} dark={isT5}>
                <Text style={{ fontSize: 13, color: isT5 ? '#CBD5E1' : '#334155', lineHeight: 20 }}>{profile.bio}</Text>
              </SectionCard>
            ) : null}

            {registeredAt || registrationUnitLabel || registeredKennelName || commitments.length ? (
              <SectionCard title={t('breederDetail.registration')} dark={isT5}>
                {registrationUnitLabel ? (
                  <InfoRow icon="🏛️" label={t('breederProfile.registrationUnit')} value={registrationUnitLabel} dark={isT5} />
                ) : null}
                {registeredAt ? <InfoRow icon="📅" label={t('breederProfile.registeredAt')} value={registeredAt} dark={isT5} /> : null}
                {registeredKennelName ? (
                  <InfoRow icon="🏅" label={t('breederProfile.registeredKennelName')} value={registeredKennelName} dark={isT5} />
                ) : null}
                {commitments.length ? (
                  <InfoRow
                    icon="🤝"
                    label={t('breederDetail.commitments')}
                    value={commitments.map((item) => t(`breederProfile.commitments.${item}`)).join(', ')}
                    dark={isT5}
                  />
                ) : null}
              </SectionCard>
            ) : null}

            <DisclaimerBanner />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['all', 'male', 'female', 'unknown'] as GenderFilter[]).map((item) => (
                  <FilterChip
                    key={item}
                    label={t(`breederDetail.gender.${item}`)}
                    active={genderFilter === item}
                    accent={accent}
                    onPress={() => setGenderFilter(item)}
                  />
                ))}
              </View>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['date', 'age', 'price'] as SortField[]).map((item) => (
                  <FilterChip
                    key={item}
                    label={t(`petFeed.sort.${item}`)}
                    active={sortField === item}
                    accent={accent}
                    onPress={() => toggleSort(item)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={{ gap: 10 }}>
              {filteredPosts.length === 0 ? (
                <Text
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#fff',
                    padding: 16,
                    fontSize: 13,
                    color: '#64748B',
                    lineHeight: 20,
                  }}
                >
                  {t('breederDetail.emptyListings')}
                </Text>
              ) : null}
              {filteredPosts.map((post) => (
                <PetFeedPostCard
                  key={post.id}
                  post={post}
                  variant="compact"
                  autoPlayVideo={false}
                  showFavorite={false}
                  showContact={false}
                  showReport={false}
                  onPress={(item) => onOpenPostDetail(item.id)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ReportModal
        visible={reportVisible}
        title={t('breederDetail.reportProfile')}
        body={t('breederDetail.reportBody')}
        reason={reportReason}
        note={reportNote}
        reasonLabel={(reason) => t(`breederDetail.reportReasons.${reason}`)}
        notePlaceholder={t('breederDetail.reportNotePlaceholder')}
        submitLabel={t('breederDetail.submitReport')}
        onChangeReason={setReportReason}
        onChangeNote={setReportNote}
        onCancel={() => setReportVisible(false)}
        onSubmit={submitProfileReport}
      />
    </View>
  );
}

function headerBackground(templateId: BreederTemplateId) {
  if (templateId === 'T1') return '#1E6FE8';
  if (templateId === 'T2') return '#0F172A';
  if (templateId === 'T3') return '#fff';
  if (templateId === 'T4') return '#ECFDF5';
  return '#0F172A';
}

function headerTextColor(templateId: BreederTemplateId) {
  if (templateId === 'T3') return '#0F172A';
  if (templateId === 'T4') return '#064E3B';
  return '#fff';
}

function translatedOption(t: (key: string) => string, namespace: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  const key = `${namespace}.${normalized}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

function SectionCard({ title, children, dark = false }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: dark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: dark ? '#F8FAFC' : '#0F172A' }}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value, dark = false }: { icon: string; label: string; value: string; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ fontSize: 12, color: dark ? '#64748B' : '#94A3B8', width: 72, flexShrink: 0 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: dark ? '#E2E8F0' : '#0F172A', fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: active ? accent : '#fff',
        borderWidth: active ? 0 : 1,
        borderColor: '#E2E8F0',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : '#64748B' }}>{label}</Text>
    </Pressable>
  );
}

function DisclaimerBanner() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 14 }}>⚠️</Text>
      <Text style={{ flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 }}>{t('breederDetail.disclaimer')}</Text>
    </View>
  );
}
