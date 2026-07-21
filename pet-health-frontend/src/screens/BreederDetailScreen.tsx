import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModalScreenShell } from '../components/ModalScreenShell';
import { PetFeedCommentComposer, PetFeedCommentsSection } from '../components/PetFeedCommentsSection';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { ReportModal } from '../components/ReportModal';
import { type PetFeedReportReason } from '../constants/petFeedReportReasons';
import { usePetFeedPostDetail } from '../hooks/usePetFeedPostDetail';
import { usePetFeedPostComments } from '../hooks/usePetFeedPostComments';
import type { BreederProfile, PetFeedComment, PetFeedPost } from '../types';
import { computeBreederTrust, hasBreederContact, metadataArray, metadataString } from '../utils/breederTrust';
import { parsePetFeedPriceToVnd } from '../utils/petFeedCurrency';

const PRIMARY = '#1E6FE8';

type BreederDetailScreenProps = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  onBack: () => void;
  onToggleFavorite: (post: PetFeedPost) => void;
  onReportPost: (post: PetFeedPost, reason: string, note?: string) => void;
  onReportBreeder: (profile: BreederProfile, reason: string, note?: string) => void;
  onHideBreeder: (profile: BreederProfile) => void;
  onFetchPostDetail?: (postId: string) => Promise<PetFeedPost | null>;
  onFetchPostComments?: (postId: string) => Promise<PetFeedComment[]>;
  onSubmitPostComment?: (postId: string, body: string, parentId?: string | null) => Promise<PetFeedComment | null>;
  onDeletePostComment?: (comment: PetFeedComment, removedCount?: number) => Promise<boolean>;
  onReportPostComment?: (comment: PetFeedComment, reason: string, note?: string) => void;
  currentUserId?: string | null;
};

type GenderFilter = 'all' | 'male' | 'female' | 'unknown';
type SortField = 'date' | 'age' | 'price';
type SortDirection = 'asc' | 'desc';

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

export function BreederDetailScreen({
  profile,
  posts,
  onBack,
  onToggleFavorite,
  onReportPost,
  onReportBreeder,
  onHideBreeder,
  onFetchPostDetail,
  onFetchPostComments,
  onSubmitPostComment,
  onDeletePostComment,
  onReportPostComment,
  currentUserId,
}: BreederDetailScreenProps) {
  const { t } = useTranslation();
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<PetFeedReportReason>('scam');
  const [reportNote, setReportNote] = useState('');
  const trust = useMemo(() => computeBreederTrust(profile, posts), [profile, posts]);
  const { selectedPost, detailLoading } = usePetFeedPostDetail(selectedPostId, posts, onFetchPostDetail);
  const {
    threads,
    loading: commentsLoading,
    submitting: commentSubmitting,
    replyTo,
    setReplyTo,
    addComment,
    removeComment,
  } = usePetFeedPostComments(
    selectedPostId,
    onFetchPostComments,
    onSubmitPostComment,
    onDeletePostComment,
  );
  const scaleRange = metadataString(profile.metadata, 'scaleRange');
  const breedingPetRange = metadataString(profile.metadata, 'breedingPetRange');
  const breederType = metadataString(profile.metadata, 'breederType');
  const registeredAt = metadataString(profile.metadata, 'registeredAt');
  const registeredKennelName = metadataString(profile.metadata, 'registeredKennelName');
  const careChecklist = metadataArray(profile.metadata, 'careChecklist');
  const commitments = metadataArray(profile.metadata, 'transparencyCommitments');
  const species = profile.primary_species.map((value) => translatedOption(t, 'breederProfile.speciesOptions', value)).filter(Boolean).join(', ');
  const breeds = profile.main_breeds.join(', ');
  const filteredPosts = useMemo(() => {
    const byGender = genderFilter === 'all' ? posts : posts.filter((post) => genderGroup(post) === genderFilter);
    return [...byGender].sort((a, b) => {
      if (sortField === 'age') return compareMaybeNumber(a.age_months, b.age_months, sortDirection);
      if (sortField === 'price') return compareMaybeNumber(parsePetFeedPriceToVnd(a.price_note), parsePetFeedPriceToVnd(b.price_note), sortDirection);
      return sortDirection === 'asc' ? createdTime(a) - createdTime(b) : createdTime(b) - createdTime(a);
    });
  }, [genderFilter, posts, sortDirection, sortField]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
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
    <View testID="breeder-detail-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900" numberOfLines={1}>
          {t('breederDetail.title')}
        </Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl bg-blue-600 p-5">
          <View className="flex-row items-start gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Ionicons name="storefront-outline" size={26} color="#fff" />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-xl font-black text-white" numberOfLines={2}>{profile.display_name || t('petFeed.breederFallback')}</Text>
                <Text className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">{t('petFeed.topBreeders.verified')}</Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-blue-50">
                {[profile.location, species].filter(Boolean).join(' - ') || t('petFeed.locationUnknown')}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row gap-2">
            <MetricCard label={t('petFeed.topBreeders.trustScore')} value={`${trust.score}/100`} light />
            <MetricCard label={t('petFeed.topBreeders.posts')} value={String(posts.length)} light />
          </View>
        </View>

        <View className="mt-3 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50"
            onPress={() => setReportVisible(true)}
          >
            <Ionicons name="flag-outline" size={17} color="#64748b" />
            <Text className="text-sm font-bold text-slate-700">{t('breederDetail.reportProfile')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 active:bg-red-100"
            onPress={confirmHideBreeder}
          >
            <Ionicons name="eye-off-outline" size={17} color="#dc2626" />
            <Text className="text-sm font-bold text-red-600">{t('breederDetail.hideBreeder')}</Text>
          </Pressable>
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederDetail.overview')}</Text>
          <View className="mt-3 gap-2">
            <InfoRow label={t('petFeed.topBreeders.type')} value={breederType ? t(`breederProfile.breederTypes.${breederType}`) : t('petFeed.topBreeders.notUpdated')} />
            <InfoRow label={t('petFeed.topBreeders.scale')} value={scaleRange ? t(`breederProfile.scaleOptions.${scaleRange}`) : t('petFeed.topBreeders.notUpdated')} />
            <InfoRow label={t('breederDetail.breedingPets')} value={breedingPetRange ? t(`breederProfile.breedingPetOptions.${breedingPetRange}`) : t('petFeed.topBreeders.notUpdated')} />
            <InfoRow label={t('petFeed.topBreeders.species')} value={species || t('petFeed.topBreeders.notUpdated')} />
            <InfoRow label={t('breederDetail.mainBreeds')} value={breeds || t('petFeed.topBreeders.notUpdated')} />
            <InfoRow label={t('breederDetail.contact')} value={hasBreederContact(profile) ? t('breederDetail.contactAvailable') : t('breederDetail.contactMissing')} />
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederDetail.trustTitle')}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">{t('breederDetail.trustBody')}</Text>
          <View className="mt-3 gap-2">
            {trust.signals.map((signal) => (
              <View key={signal.key} className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Ionicons name={signal.passed ? 'checkmark-circle' : 'alert-circle-outline'} size={19} color={signal.passed ? '#059669' : '#d97706'} />
                <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{t(`breederDetail.trustSignals.${signal.key}`)}</Text>
                <Text className="text-xs font-bold text-slate-500">{Math.round(signal.value)}/{signal.max}</Text>
              </View>
            ))}
          </View>
        </View>

        {profile.bio || profile.care_environment ? (
          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('breederDetail.profileInfo')}</Text>
            {profile.bio ? <Text className="mt-3 text-sm leading-5 text-slate-700">{profile.bio}</Text> : null}
            {profile.care_environment ? (
              <Text className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700">{profile.care_environment}</Text>
            ) : null}
          </View>
        ) : null}

        {registeredAt || registeredKennelName || careChecklist.length || commitments.length ? (
          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('breederDetail.registration')}</Text>
            <View className="mt-3 gap-2">
              {registeredAt ? <InfoRow label={t('breederProfile.registeredAt')} value={registeredAt} /> : null}
              {registeredKennelName ? <InfoRow label={t('breederProfile.registeredKennelName')} value={registeredKennelName} /> : null}
              {careChecklist.length ? <InfoRow label={t('breederDetail.careChecklist')} value={careChecklist.map((item) => t(`breederProfile.careChecklist.${item}`)).join(', ')} /> : null}
              {commitments.length ? <InfoRow label={t('breederDetail.commitments')} value={commitments.map((item) => t(`breederProfile.commitments.${item}`)).join(', ')} /> : null}
            </View>
          </View>
        ) : null}

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederDetail.listings')}</Text>
          <View className="mt-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(['all', 'male', 'female', 'unknown'] as GenderFilter[]).map((item) => (
                  <FilterChip key={item} label={t(`breederDetail.gender.${item}`)} active={genderFilter === item} onPress={() => setGenderFilter(item)} />
                ))}
              </View>
            </ScrollView>
          </View>
          <View className="mt-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(['date', 'age', 'price'] as SortField[]).map((item) => (
                  <FilterChip key={item} label={t(`petFeed.sort.${item}`)} active={sortField === item} onPress={() => toggleSort(item)} />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View className="mt-4 gap-4">
          {filteredPosts.length === 0 ? (
            <Text className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-5 text-slate-500">{t('breederDetail.emptyListings')}</Text>
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
              onPress={(item) => setSelectedPostId(item.id)}
            />
          ))}
        </View>
      </ScrollView>
      <ModalScreenShell
        visible={selectedPostId != null}
        title={t('petFeed.detailTitle')}
        closeLabel={t('petFeed.accessibility.closeDetail')}
        closeTestID="breeder-detail-post-back-button"
        onClose={() => setSelectedPostId(null)}
        footer={
          selectedPost ? (
            <PetFeedCommentComposer
              submitting={commentSubmitting}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSubmit={addComment}
            />
          ) : undefined
        }
      >
        {selectedPost ? (
          <>
            <PetFeedPostCard
              post={selectedPost}
              onToggleFavorite={onToggleFavorite}
              onReportPost={onReportPost}
              onHideBreeder={onHideBreeder}
              showHideBreeder
              autoPlayVideo={false}
              mediaLoading={detailLoading}
              testID={`breeder-detail-post-${selectedPost.id}`}
            />
            <PetFeedCommentsSection
              threads={threads}
              loading={commentsLoading}
              currentUserId={currentUserId}
              onReply={setReplyTo}
              onDelete={(comment) => void removeComment(comment)}
              onReport={onReportPostComment}
            />
          </>
        ) : detailLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : null}
      </ModalScreenShell>
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

function translatedOption(t: (key: string) => string, namespace: string, value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  const key = `${namespace}.${normalized}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

function MetricCard({ label, value, light = false }: { label: string; value: string; light?: boolean }) {
  return (
    <View className={`flex-1 rounded-2xl px-3 py-3 ${light ? 'bg-white/15' : 'bg-slate-50'}`}>
      <Text className={`text-xs font-bold uppercase ${light ? 'text-blue-50' : 'text-slate-500'}`}>{label}</Text>
      <Text className={`mt-1 text-lg font-black ${light ? 'text-white' : 'text-slate-900'}`}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-xl bg-slate-50 px-3 py-2.5">
      <Text className="text-xs font-bold uppercase text-slate-500">{label}</Text>
      <Text className="mt-1 text-sm font-semibold leading-5 text-slate-800">{value}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`rounded-full border px-3 py-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}
