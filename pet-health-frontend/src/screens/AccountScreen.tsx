import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAI_GUIDING } from '../assets/maiAssets';
import { APP_LINKS } from '../config';
import type { AccountProfile, BreederProfile, PetFeedPost, PetFeedReport, UserRole } from '../types';
import { formatPetFeedPrice } from '../utils/petFeedCurrency';
import { modalTopInset } from '../utils/modalSafeArea';

const PRIMARY = '#1E6FE8';

const REQUEST_TYPE_FILTERS: Array<{ key: AdminRequestTypeFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'adminRequests.types.all' },
  { key: 'breeder', labelKey: 'adminRequests.types.breeder' },
  { key: 'post', labelKey: 'adminRequests.types.post' },
  { key: 'report', labelKey: 'adminRequests.types.report' },
];

const REQUEST_STATUS_FILTERS: Array<{ key: AdminRequestStatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'adminRequests.statuses.all' },
  { key: 'waiting', labelKey: 'adminRequests.statuses.waiting' },
  { key: 'approved', labelKey: 'adminRequests.statuses.approved' },
  { key: 'rejected', labelKey: 'adminRequests.statuses.rejected' },
  { key: 'resolved', labelKey: 'adminRequests.statuses.resolved' },
];

const REQUEST_DATE_FILTERS: Array<{ key: AdminRequestDateFilter; labelKey: string }> = [
  { key: 'newest', labelKey: 'adminRequests.dates.newest' },
  { key: 'oldest', labelKey: 'adminRequests.dates.oldest' },
  { key: 'today', labelKey: 'adminRequests.dates.today' },
  { key: 'week', labelKey: 'adminRequests.dates.week' },
];

const BREEDER_STATUS_FILTERS: Array<{ key: AdminBreederStatusFilter; labelKey: string }> = [
  { key: 'all', labelKey: 'adminBreeders.statuses.all' },
  { key: 'active', labelKey: 'adminBreeders.statuses.active' },
  { key: 'inactive', labelKey: 'adminBreeders.statuses.inactive' },
  { key: 'waiting', labelKey: 'adminBreeders.statuses.waiting' },
];

type AdminRequestTypeFilter = 'all' | 'breeder' | 'post' | 'report';
type AdminRequestStatusFilter = 'all' | 'waiting' | 'approved' | 'rejected' | 'resolved';
type AdminRequestDateFilter = 'newest' | 'oldest' | 'today' | 'week';
type AdminBreederStatusFilter = 'all' | 'active' | 'inactive' | 'waiting';

type AdminRequestItem =
  | {
      id: string;
      type: 'breeder';
      status: string;
      createdAt: string;
      title: string;
      subtitle: string;
      body: string;
      profile: BreederProfile;
    }
  | {
      id: string;
      type: 'post';
      status: string;
      createdAt: string;
      title: string;
      subtitle: string;
      body: string;
      post: PetFeedPost;
    }
  | {
      id: string;
      type: 'report';
      status: string;
      createdAt: string;
      title: string;
      subtitle: string;
      body: string;
      report: PetFeedReport;
    };

type AccountScreenProps = {
  account: AccountProfile | null;
  breederProfile: BreederProfile | null;
  petCount: number;
  savedPostCount: number;
  myPostCount: number;
  myPosts: PetFeedPost[];
  adminBreederProfiles: BreederProfile[];
  adminFeedPosts: PetFeedPost[];
  adminFeedReports: PetFeedReport[];
  adminPendingBreederRequestCount: number;
  adminRejectedBreederRequestCount: number;
  adminPendingPostCount: number;
  adminPublishedPostCount: number;
  adminArchivedPostCount: number;
  activeBreederCount: number;
  inactiveBreederCount: number;
  onOpenBreederProfile: () => void;
  onOpenPetFeed: () => void;
  onOpenCreatePetFeedPost: () => void;
  onOpenAdminHub: () => void;
  onOpenUpdateAccount: () => void;
  onUpdateBreederStatus: (userId: string, verificationStatus: string) => Promise<void>;
  onUpdatePostStatus: (postId: string, status: string) => Promise<void>;
  onUpdateReportStatus: (reportId: string, status: string) => Promise<void>;
  onLogout: () => void;
  onConfirmDeleteAccount: () => Promise<void>;
  showHeaderMenu?: boolean;
};

function roleIcon(role: UserRole | undefined) {
  if (role === 'admin') return 'shield-checkmark-outline';
  if (role === 'breeder') return 'ribbon-outline';
  if (role === 'vet') return 'medkit-outline';
  return 'heart-outline';
}

function adminRequestStatusGroup(item: AdminRequestItem): Exclude<AdminRequestStatusFilter, 'all'> {
  if (item.type === 'report') return item.status === 'open' ? 'waiting' : 'resolved';
  if (item.type === 'breeder') {
    if (item.status === 'verified') return 'approved';
    if (item.status === 'rejected' || item.status === 'suspended') return 'rejected';
    return 'waiting';
  }
  if (item.status === 'published') return 'approved';
  if (item.status === 'archived') return 'rejected';
  return 'waiting';
}

function formatRequestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function breederStatusGroup(profile: BreederProfile): Exclude<AdminBreederStatusFilter, 'all'> {
  if (profile.verification_status === 'verified') return 'active';
  if (profile.verification_status === 'rejected' || profile.verification_status === 'suspended') return 'inactive';
  return 'waiting';
}

export function AccountScreen({
  account,
  breederProfile,
  petCount,
  savedPostCount,
  myPostCount,
  myPosts,
  adminBreederProfiles,
  adminFeedPosts,
  adminFeedReports,
  adminPendingBreederRequestCount,
  adminRejectedBreederRequestCount,
  adminPendingPostCount,
  adminPublishedPostCount,
  adminArchivedPostCount,
  activeBreederCount,
  inactiveBreederCount,
  onOpenBreederProfile,
  onOpenPetFeed,
  onOpenCreatePetFeedPost,
  onOpenAdminHub,
  onOpenUpdateAccount,
  onUpdateBreederStatus,
  onUpdatePostStatus,
  onUpdateReportStatus,
  onLogout,
  onConfirmDeleteAccount,
  showHeaderMenu = true,
}: AccountScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [adminSection, setAdminSection] = useState<'requests' | 'breeders' | 'posts'>('requests');
  const [requestTypeFilter, setRequestTypeFilter] = useState<AdminRequestTypeFilter>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<AdminRequestStatusFilter>('all');
  const [requestDateFilter, setRequestDateFilter] = useState<AdminRequestDateFilter>('newest');
  const [activeRequestDropdown, setActiveRequestDropdown] = useState<'type' | 'status' | 'date' | null>(null);
  const [breederStatusFilter, setBreederStatusFilter] = useState<AdminBreederStatusFilter>('all');
  const [breederSpeciesFilter, setBreederSpeciesFilter] = useState('all');
  const [breederDateFilter, setBreederDateFilter] = useState<AdminRequestDateFilter>('newest');
  const [activeBreederDropdown, setActiveBreederDropdown] = useState<'status' | 'species' | 'date' | null>(null);
  const role = account?.primary_role ?? 'sen';
  const breederStatus = breederProfile?.verification_status ?? 'unverified';
  const isAdmin = role === 'admin';
  const isSen = role === 'sen';
  const isBreeder = role === 'breeder';
  const breederRequestPending = breederStatus === 'pending_review';
  const publishedMyPostCount = myPosts.filter((post) => post.status === 'published').length;
  const pendingMyPostCount = myPosts.filter((post) => post.status === 'pending_review').length;
  const pendingReportCount = adminFeedReports.filter((report) => report.status === 'open').length;
  const pendingRequestCount = adminPendingBreederRequestCount + adminPendingPostCount + pendingReportCount;
  const breederApplicationSummary = (profile: BreederProfile) => {
    const metadata = profile.metadata ?? {};
    const breederType = typeof metadata.breederType === 'string' ? metadata.breederType : '';
    const scaleRange = typeof metadata.scaleRange === 'string' ? metadata.scaleRange : '';
    const registeredKennelName = typeof metadata.registeredKennelName === 'string' ? metadata.registeredKennelName : '';
    const checklistCount = Array.isArray(metadata.careChecklist) ? metadata.careChecklist.length : 0;
    return [
      breederType ? t(`breederProfile.breederTypes.${breederType}`) : '',
      scaleRange ? t(`breederProfile.scaleOptions.${scaleRange}`) : '',
      registeredKennelName,
      checklistCount ? t('adminRequests.breederChecklistCount', { count: checklistCount }) : '',
    ].filter(Boolean).join(' - ');
  };
  const adminRequestItems = useMemo<AdminRequestItem[]>(() => {
    const breederItems: AdminRequestItem[] = adminBreederProfiles.map((profile) => ({
      id: `breeder-${profile.id}`,
      type: 'breeder',
      status: profile.verification_status,
      createdAt: profile.created_at,
      title: profile.display_name || t('adminRequests.untitledBreeder'),
      subtitle: [profile.location, profile.primary_species.join(', ')].filter(Boolean).join(' - '),
      body: breederApplicationSummary(profile) || profile.care_environment || profile.bio || profile.main_breeds.join(', '),
      profile,
    }));
    const postItems: AdminRequestItem[] = adminFeedPosts.map((post) => ({
      id: `post-${post.id}`,
      type: 'post',
      status: post.status,
      createdAt: post.created_at,
      title: post.title || t('adminRequests.untitledPost'),
      subtitle: [post.species, post.breed, post.location].filter(Boolean).join(' - '),
      body: post.description || post.vaccine_status || formatPetFeedPrice(post.price_note, i18n.language),
      post,
    }));
    const reportItems: AdminRequestItem[] = adminFeedReports.map((report) => ({
      id: `report-${report.id}`,
      type: 'report',
      status: report.status,
      createdAt: report.created_at,
      title: report.reason || t('adminRequests.report'),
      subtitle: report.target_type === 'breeder_profile'
        ? `${t('adminRequests.types.breeder')}: ${report.breeder_profile?.display_name ?? report.breeder_profile_id ?? ''}`
        : `${t('adminRequests.postId')}: ${report.post_id ?? ''}`,
      body: report.note || (report.target_type === 'breeder_profile' ? report.breeder_profile?.bio ?? '' : ''),
      report,
    }));
    return [...breederItems, ...postItems, ...reportItems];
  }, [adminBreederProfiles, adminFeedPosts, adminFeedReports, i18n.language, t]);
  const filteredAdminRequestItems = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return adminRequestItems
      .filter((item) => requestTypeFilter === 'all' || item.type === requestTypeFilter)
      .filter((item) => requestStatusFilter === 'all' || adminRequestStatusGroup(item) === requestStatusFilter)
      .filter((item) => {
        const createdMs = new Date(item.createdAt).getTime();
        if (!Number.isFinite(createdMs)) return requestDateFilter !== 'today' && requestDateFilter !== 'week';
        if (requestDateFilter === 'today') return createdMs >= startOfToday.getTime();
        if (requestDateFilter === 'week') return createdMs >= sevenDaysAgo;
        return true;
      })
      .sort((a, b) => {
        const aMs = new Date(a.createdAt).getTime() || 0;
        const bMs = new Date(b.createdAt).getTime() || 0;
        return requestDateFilter === 'oldest' ? aMs - bMs : bMs - aMs;
      });
  }, [adminRequestItems, requestDateFilter, requestStatusFilter, requestTypeFilter]);
  const breederSpeciesOptions = useMemo(() => {
    const species = Array.from(
      new Set(
        adminBreederProfiles
          .flatMap((profile) => profile.primary_species)
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ).sort();
    return [
      { key: 'all', label: t('adminBreeders.species.all') },
      ...species.map((item) => ({ key: item, label: item })),
    ];
  }, [adminBreederProfiles, t]);
  const filteredBreederProfiles = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return adminBreederProfiles
      .filter((profile) => breederStatusFilter === 'all' || breederStatusGroup(profile) === breederStatusFilter)
      .filter((profile) => breederSpeciesFilter === 'all' || profile.primary_species.map((item) => item.trim().toLowerCase()).includes(breederSpeciesFilter))
      .filter((profile) => {
        const createdMs = new Date(profile.created_at).getTime();
        if (!Number.isFinite(createdMs)) return breederDateFilter !== 'today' && breederDateFilter !== 'week';
        if (breederDateFilter === 'today') return createdMs >= startOfToday.getTime();
        if (breederDateFilter === 'week') return createdMs >= sevenDaysAgo;
        return true;
      })
      .sort((a, b) => {
        const aMs = new Date(a.created_at).getTime() || 0;
        const bMs = new Date(b.created_at).getTime() || 0;
        return breederDateFilter === 'oldest' ? aMs - bMs : bMs - aMs;
      });
  }, [adminBreederProfiles, breederDateFilter, breederSpeciesFilter, breederStatusFilter]);
  const metricItems = isAdmin
    ? [
        { key: 'requests' as const, label: t('account.adminMetrics.requests'), value: pendingRequestCount },
        { key: 'breeders' as const, label: t('account.adminMetrics.breeders'), value: activeBreederCount },
        { key: 'posts' as const, label: t('account.adminMetrics.myPosts'), value: myPostCount },
      ]
    : isBreeder
      ? [
          { key: 'posts', label: t('account.breederMetrics.total'), value: myPostCount },
          { key: 'published', label: t('account.breederMetrics.published'), value: publishedMyPostCount },
          { key: 'pending', label: t('account.breederMetrics.pending'), value: pendingMyPostCount },
        ]
    : [
        { key: 'pets', label: t('account.pets'), value: petCount },
        { key: 'saved', label: t('account.savedPosts'), value: savedPostCount },
      ];
  async function runAdminAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    }
  }

  function requestStatusLabel(item: AdminRequestItem) {
    return t(`adminRequests.statuses.${adminRequestStatusGroup(item)}`);
  }

  const requestTypeFilterLabel = t(REQUEST_TYPE_FILTERS.find((filter) => filter.key === requestTypeFilter)?.labelKey ?? 'adminRequests.types.all');
  const requestStatusFilterLabel = t(REQUEST_STATUS_FILTERS.find((filter) => filter.key === requestStatusFilter)?.labelKey ?? 'adminRequests.statuses.all');
  const requestDateFilterLabel = t(REQUEST_DATE_FILTERS.find((filter) => filter.key === requestDateFilter)?.labelKey ?? 'adminRequests.dates.newest');
  const breederStatusFilterLabel = t(BREEDER_STATUS_FILTERS.find((filter) => filter.key === breederStatusFilter)?.labelKey ?? 'adminBreeders.statuses.all');
  const breederSpeciesFilterLabel = breederSpeciesOptions.find((filter) => filter.key === breederSpeciesFilter)?.label ?? t('adminBreeders.species.all');
  const breederDateFilterLabel = t(REQUEST_DATE_FILTERS.find((filter) => filter.key === breederDateFilter)?.labelKey ?? 'adminRequests.dates.newest');

  async function handleConfirmDeleteAccount() {
    setDeletingAccount(true);
    try {
      await onConfirmDeleteAccount();
      setDeleteModalOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('account.deleteAccount.failedTitle'), message);
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <>
    <ScrollView
      testID="account-screen"
      className="flex-1 bg-[#F2F4F8]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 20 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-bold text-slate-900">{t(`account.roles.${role}.title`)}</Text>
          {!isSen ? (
            <Text className="mt-1 text-sm leading-5 text-slate-600">
              {isAdmin ? t('account.adminSubtitle') : isBreeder ? t('account.breederSubtitle') : t('account.subtitle')}
            </Text>
          ) : null}
        </View>
        {showHeaderMenu ? (
          <Pressable
            testID="account-menu-button"
            accessibilityRole="button"
            accessibilityLabel={t('account.menu.open')}
            className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white active:bg-slate-100"
            onPress={() => setMenuOpen(true)}
          >
            <Ionicons name="menu-outline" size={22} color="#334155" />
          </Pressable>
        ) : null}
      </View>

      {isSen ? (
        <View className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-white p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-32 w-24 overflow-hidden rounded-2xl">
              <Image source={MAI_GUIDING} resizeMode="cover" style={{ height: 128, width: 96 }} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-slate-900">{t('account.senIntro.title')}</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-600">{t('account.senIntro.body')}</Text>
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <Pressable
              testID="account-open-pet-feed-button"
              accessibilityRole="button"
              accessibilityLabel="Open Pet Feed"
              className="min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 py-3 active:bg-blue-100"
              onPress={onOpenPetFeed}
            >
              <Ionicons name="newspaper-outline" size={18} color={PRIMARY} />
              <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('account.senIntro.petFeedCta')}</Text>
            </Pressable>
            <Pressable
              testID="account-request-breeder-button"
              accessibilityRole="button"
              accessibilityLabel="Request breeder verification"
              accessibilityState={{ disabled: breederRequestPending }}
              className={`min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
                breederRequestPending ? 'bg-slate-200' : 'bg-blue-600 active:opacity-90'
              }`}
              onPress={onOpenBreederProfile}
              disabled={breederRequestPending}
            >
              <Ionicons name={breederRequestPending ? 'time-outline' : 'ribbon-outline'} size={18} color={breederRequestPending ? '#64748b' : '#fff'} />
              <Text className={`text-sm font-bold ${breederRequestPending ? 'text-slate-600' : 'text-white'}`}>
                {t(breederRequestPending ? 'account.senIntro.pendingCta' : 'account.senIntro.breederCta')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isBreeder ? (
        <View className="mt-5 rounded-2xl border border-blue-100 bg-white p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <Ionicons name="shield-checkmark-outline" size={21} color={PRIMARY} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-base font-bold text-slate-900">
                  {breederProfile?.display_name || account?.display_name || t('account.breederTrust.untitled')}
                </Text>
                <Text className={`rounded-full px-2.5 py-1 text-xs font-bold ${breederStatus === 'verified' ? 'bg-emerald-50 text-emerald-700' : breederStatus === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {t(`account.breederRequestStatus.${breederStatus}`)}
                </Text>
              </View>
              <Text className="mt-1 text-sm leading-5 text-slate-600">
                {[breederProfile?.location, breederProfile?.primary_species?.join(', ')].filter(Boolean).join(' - ') || t('account.breederTrust.missingInfo')}
              </Text>
              <Text className="mt-2 text-xs leading-5 text-slate-500">{t('account.breederTrust.note')}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {!isAdmin && !isSen && !isBreeder ? <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">{t('account.myRole')}</Text>
        <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-slate-50 p-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Ionicons name={roleIcon(role)} size={20} color={PRIMARY} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-slate-900">{t(`account.roles.${role}.title`)}</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-600">{t(`account.roles.${role}.body`)}</Text>
            {account?.display_name ? <Text className="mt-2 text-xs text-slate-500">{account.display_name}</Text> : null}
          </View>
        </View>
      </View> : null}

      <View className="mt-5 flex-row flex-wrap gap-3">
        {metricItems.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole={isAdmin ? 'button' : undefined}
            testID={isAdmin ? `account-admin-section-${item.key}-button` : undefined}
            className={`min-w-[140px] flex-1 rounded-2xl border p-4 ${isAdmin && adminSection === item.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
            onPress={isAdmin ? () => setAdminSection(item.key as 'requests' | 'breeders' | 'posts') : undefined}
          >
            <Text className="text-xs font-bold uppercase text-slate-500">{item.label}</Text>
            <Text className="mt-1 text-2xl font-bold text-slate-900">{item.value}</Text>
          </Pressable>
        ))}
      </View>

      {isAdmin ? (
        <Pressable
          testID="account-create-post-button"
          accessibilityRole="button"
          accessibilityLabel="Create post"
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 active:opacity-90"
          onPress={onOpenCreatePetFeedPost}
        >
          <Ionicons name="add-circle-outline" size={19} color="#fff" />
          <Text className="text-sm font-bold text-white">{isAdmin ? t('adminPost.createTitle') : t('account.createPost')}</Text>
        </Pressable>
      ) : null}

      {isAdmin ? (
        <Pressable
          testID="account-open-admin-hub-button"
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3.5 active:bg-blue-50"
          onPress={onOpenAdminHub}
        >
          <Ionicons name="people-outline" size={19} color={PRIMARY} />
          <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('adminHub.openHub')}</Text>
        </Pressable>
      ) : null}

      {isAdmin && adminSection === 'requests' ? (
        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-bold text-slate-900">{t('adminRequests.filters')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <FilterDropdownButton
              label={t('adminRequests.filterType')}
              value={requestTypeFilterLabel}
              active={activeRequestDropdown === 'type'}
              onPress={() => setActiveRequestDropdown((current) => (current === 'type' ? null : 'type'))}
            />
            <FilterDropdownButton
              label={t('adminRequests.filterStatus')}
              value={requestStatusFilterLabel}
              active={activeRequestDropdown === 'status'}
              onPress={() => setActiveRequestDropdown((current) => (current === 'status' ? null : 'status'))}
            />
            <FilterDropdownButton
              label={t('adminRequests.filterDate')}
              value={requestDateFilterLabel}
              active={activeRequestDropdown === 'date'}
              onPress={() => setActiveRequestDropdown((current) => (current === 'date' ? null : 'date'))}
            />
          </View>
          {activeRequestDropdown === 'type' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {REQUEST_TYPE_FILTERS.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={requestTypeFilter === filter.key}
                  onPress={() => {
                    setRequestTypeFilter(filter.key);
                    setActiveRequestDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          {activeRequestDropdown === 'status' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {REQUEST_STATUS_FILTERS.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={requestStatusFilter === filter.key}
                  onPress={() => {
                    setRequestStatusFilter(filter.key);
                    setActiveRequestDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          {activeRequestDropdown === 'date' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {REQUEST_DATE_FILTERS.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={requestDateFilter === filter.key}
                  onPress={() => {
                    setRequestDateFilter(filter.key);
                    setActiveRequestDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {isAdmin && adminSection === 'breeders' ? (
        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-bold text-slate-900">{t('adminBreeders.filters')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <FilterDropdownButton
              label={t('adminBreeders.filterStatus')}
              value={breederStatusFilterLabel}
              active={activeBreederDropdown === 'status'}
              onPress={() => setActiveBreederDropdown((current) => (current === 'status' ? null : 'status'))}
            />
            <FilterDropdownButton
              label={t('adminBreeders.filterSpecies')}
              value={breederSpeciesFilterLabel}
              active={activeBreederDropdown === 'species'}
              onPress={() => setActiveBreederDropdown((current) => (current === 'species' ? null : 'species'))}
            />
            <FilterDropdownButton
              label={t('adminBreeders.filterDate')}
              value={breederDateFilterLabel}
              active={activeBreederDropdown === 'date'}
              onPress={() => setActiveBreederDropdown((current) => (current === 'date' ? null : 'date'))}
            />
          </View>
          {activeBreederDropdown === 'status' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {BREEDER_STATUS_FILTERS.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={breederStatusFilter === filter.key}
                  onPress={() => {
                    setBreederStatusFilter(filter.key);
                    setActiveBreederDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          {activeBreederDropdown === 'species' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {breederSpeciesOptions.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={filter.label}
                  active={breederSpeciesFilter === filter.key}
                  onPress={() => {
                    setBreederSpeciesFilter(filter.key);
                    setActiveBreederDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          {activeBreederDropdown === 'date' ? (
            <View className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {REQUEST_DATE_FILTERS.map((filter) => (
                <DropdownOption
                  key={filter.key}
                  label={t(filter.labelKey)}
                  active={breederDateFilter === filter.key}
                  onPress={() => {
                    setBreederDateFilter(filter.key);
                    setActiveBreederDropdown(null);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {isAdmin ? (
        adminSection === 'requests' ? (
          <View className="mt-5 gap-3">
            {filteredAdminRequestItems.length === 0 ? (
              <Text className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-5 text-slate-500">
                {t('adminRequests.empty')}
              </Text>
            ) : null}
            {filteredAdminRequestItems.map((item) => (
              <View key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="gap-2">
                  <View className="flex-row flex-wrap gap-2">
                    <Text className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {t(`adminRequests.types.${item.type}`)}
                    </Text>
                    <Text className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {requestStatusLabel(item)}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-slate-400">{formatRequestDate(item.createdAt)}</Text>
                </View>
                <Text className="mt-3 text-base font-bold text-slate-900" numberOfLines={2}>{item.title}</Text>
                {item.subtitle ? <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>{item.subtitle}</Text> : null}
                {item.body ? <Text className="mt-2 text-sm leading-5 text-slate-700" numberOfLines={3}>{item.body}</Text> : null}
                {item.type === 'post' ? <AdminPostMediaPreview post={item.post} /> : null}
                {item.type === 'breeder' ? (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <AdminActionButton label={t('adminReview.verify')} variant="success" onPress={() => void runAdminAction(() => onUpdateBreederStatus(item.profile.user_id, 'verified'))} />
                    <AdminActionButton label={t('adminReview.reject')} variant="warning" onPress={() => void runAdminAction(() => onUpdateBreederStatus(item.profile.user_id, 'rejected'))} />
                    <AdminActionButton label={t('adminReview.suspend')} variant="neutral" onPress={() => void runAdminAction(() => onUpdateBreederStatus(item.profile.user_id, 'suspended'))} />
                  </View>
                ) : null}
                {item.type === 'post' ? (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <AdminActionButton label={t('adminReview.approve')} variant="success" onPress={() => void runAdminAction(() => onUpdatePostStatus(item.post.id, 'published'))} />
                    <AdminActionButton label={t('adminReview.archive')} variant="neutral" onPress={() => void runAdminAction(() => onUpdatePostStatus(item.post.id, 'archived'))} />
                  </View>
                ) : null}
                {item.type === 'report' ? (
                  <View className="mt-4 gap-2">
                    {item.report.post_id ? (
                      <View className="flex-row flex-wrap gap-2">
                        <AdminActionButton
                          label={t('adminReview.archive')}
                          variant="warning"
                          onPress={() => void runAdminAction(() => onUpdatePostStatus(item.report.post_id!, 'archived'))}
                        />
                        <AdminActionButton
                          label={t('adminReview.markReviewed')}
                          variant="primary"
                          onPress={() => void runAdminAction(() => onUpdateReportStatus(item.report.id, 'reviewed'))}
                        />
                      </View>
                    ) : null}
                    {item.report.breeder_profile?.user_id ? (
                      <View className="flex-row flex-wrap gap-2">
                        <AdminActionButton
                          label={t('adminReview.suspend')}
                          variant="warning"
                          onPress={() => void runAdminAction(() => onUpdateBreederStatus(item.report.breeder_profile!.user_id, 'suspended'))}
                        />
                        <AdminActionButton
                          label={t('adminReview.markReviewed')}
                          variant="primary"
                          onPress={() => void runAdminAction(() => onUpdateReportStatus(item.report.id, 'reviewed'))}
                        />
                      </View>
                    ) : null}
                    {!item.report.post_id && !item.report.breeder_profile?.user_id ? (
                      <View className="flex-row flex-wrap gap-2">
                        <AdminActionButton label={t('adminReview.markReviewed')} variant="primary" onPress={() => void runAdminAction(() => onUpdateReportStatus(item.report.id, 'reviewed'))} />
                        <AdminActionButton label={t('adminReview.dismiss')} variant="neutral" onPress={() => void runAdminAction(() => onUpdateReportStatus(item.report.id, 'dismissed'))} />
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-2">
                        <AdminActionButton label={t('adminReview.dismiss')} variant="neutral" onPress={() => void runAdminAction(() => onUpdateReportStatus(item.report.id, 'dismissed'))} />
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : adminSection === 'posts' ? (
          <View className="mt-5 gap-3">
            {myPosts.map((post) => (
              <View key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
                    <Text className="mt-1 text-xs font-semibold uppercase text-slate-500">{t(`petFeed.status.${post.status}`)}</Text>
                  </View>
                  <Text className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {post.species || 'pet'}
                  </Text>
                </View>
                <Text className="mt-2 text-sm leading-5 text-slate-600" numberOfLines={3}>
                  {post.description || [post.breed, post.location].filter(Boolean).join(' - ')}
                </Text>
                <AdminPostMediaPreview post={post} />
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {filteredBreederProfiles.length === 0 ? (
              <Text className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-5 text-slate-500">
                {t('adminBreeders.empty')}
              </Text>
            ) : null}
            {filteredBreederProfiles.map((profile) => {
              const statusGroup = breederStatusGroup(profile);
              const species = profile.primary_species.join(', ');
              const breeds = profile.main_breeds.join(', ');
              return (
                <View key={profile.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <View className="gap-2">
                    <View className="flex-row flex-wrap gap-2">
                      <Text className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {t(`adminBreeders.statuses.${statusGroup}`)}
                      </Text>
                      {species ? (
                        <Text className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{species}</Text>
                      ) : null}
                    </View>
                    <Text className="text-xs font-semibold text-slate-400">{formatRequestDate(profile.created_at)}</Text>
                  </View>
                  <Text className="mt-3 text-base font-bold text-slate-900" numberOfLines={2}>
                    {profile.display_name || t('adminBreeders.untitled')}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
                    {[profile.location, breeds].filter(Boolean).join(' - ')}
                  </Text>
                  {profile.care_environment || profile.bio ? (
                    <Text className="mt-2 text-sm leading-5 text-slate-700" numberOfLines={3}>
                      {profile.care_environment || profile.bio}
                    </Text>
                  ) : null}
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {profile.verification_status !== 'verified' ? (
                      <AdminActionButton label={t('adminReview.verify')} variant="success" onPress={() => void runAdminAction(() => onUpdateBreederStatus(profile.user_id, 'verified'))} />
                    ) : null}
                    {profile.verification_status !== 'rejected' ? (
                      <AdminActionButton label={t('adminReview.reject')} variant="warning" onPress={() => void runAdminAction(() => onUpdateBreederStatus(profile.user_id, 'rejected'))} />
                    ) : null}
                    {profile.verification_status !== 'suspended' ? (
                      <AdminActionButton label={t('adminReview.suspend')} variant="neutral" onPress={() => void runAdminAction(() => onUpdateBreederStatus(profile.user_id, 'suspended'))} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )
      ) : null}

      {isBreeder ? (
        <View className="mt-5 gap-3">
          {breederStatus === 'verified' ? (
            <Pressable
              testID="account-create-post-button"
              accessibilityRole="button"
              accessibilityLabel="Create post"
              className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 active:opacity-90"
              onPress={onOpenCreatePetFeedPost}
            >
              <Ionicons name="add-circle-outline" size={19} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('account.createPost')}</Text>
            </Pressable>
          ) : (
            <Pressable
              testID="account-breeder-profile-button"
              accessibilityRole="button"
              accessibilityLabel="Update breeder verification profile"
              className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 active:opacity-90"
              onPress={onOpenBreederProfile}
            >
              <Ionicons name="ribbon-outline" size={19} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('account.breederTrust.updateProfile')}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 py-3 active:bg-blue-100"
            onPress={onOpenBreederProfile}
          >
            <Ionicons name="create-outline" size={18} color={PRIMARY} />
            <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('account.breederTrust.editProfile')}</Text>
          </Pressable>
        </View>
      ) : null}

      {isBreeder ? (
        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm leading-5 text-amber-900">{t('account.breederSafety')}</Text>
        </View>
      ) : null}

      {!isAdmin && !isSen && !isBreeder ? <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="text-sm leading-5 text-amber-900">{t('account.communitySafety')}</Text>
      </View> : null}

      <View className="mt-5 gap-3">
        {role === 'sen' ? (
          <>
            <View className="rounded-2xl border border-amber-200 bg-white p-4">
              <Text className="text-base font-bold text-amber-950">{t('account.senStatus.title')}</Text>
              <View className="mt-3 rounded-xl bg-amber-50 p-3">
                <Text className="text-sm font-semibold text-amber-950">
                  {t(`account.breederRequestStatus.${breederStatus}`)}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-amber-900">
                  {t(`account.senStatus.helper.${breederStatus}`)}
                </Text>
              </View>
            </View>
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('account.senQuickActions.title')}</Text>
              <View className="mt-3 gap-2">
                <SenInfoRow icon="heart-outline" label={t('account.senQuickActions.savedPosts')} value={savedPostCount} />
                <SenInfoRow icon="paw-outline" label={t('account.senQuickActions.petProfiles')} value={petCount} />
                <SenInfoRow icon="calendar-outline" label={t('account.senQuickActions.carePassport')} value={petCount} />
              </View>
            </View>
          </>
        ) : null}
        {role === 'vet' ? (
          <Text className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-5 text-slate-600">
            {t('account.vetSummary')}
          </Text>
        ) : null}
        {isBreeder ? (
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('account.breederPosts.title')}</Text>
            <View className="mt-3 gap-3">
              {myPosts.length === 0 ? (
                <Text className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-500">
                  {t('account.breederPosts.empty')}
                </Text>
              ) : null}
              {myPosts.map((post) => (
                <View key={post.id} className="rounded-xl bg-slate-50 p-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-slate-900" numberOfLines={2}>{post.title}</Text>
                      <Text className="mt-1 text-xs font-semibold uppercase text-slate-500">{t(`petFeed.status.${post.status}`)}</Text>
                    </View>
                    <Text className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      {post.species || 'pet'}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-slate-600" numberOfLines={2}>
                    {[post.breed, post.location].filter(Boolean).join(' - ') || post.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('legal.title')}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">{t('legal.body')}</Text>
          <View className="mt-3 gap-2">
            <LegalLinkButton label={t('legal.privacy')} url={APP_LINKS.privacyPolicy} />
            <LegalLinkButton label={t('legal.terms')} url={APP_LINKS.termsOfService} />
            <LegalLinkButton label={t('legal.support')} url={APP_LINKS.support} />
          </View>
        </View>
      </View>
    </ScrollView>

    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <Pressable className="flex-1 bg-black/20" onPress={() => setMenuOpen(false)}>
        <View className="absolute right-5 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl" style={{ top: modalTopInset(insets.top) + 56 }}>
          <AccountMenuItem
            testID="account-menu-update-button"
            icon="create-outline"
            label={t('account.menu.updateAccount')}
            onPress={() => {
              setMenuOpen(false);
              onOpenUpdateAccount();
            }}
          />
          <View className="h-px bg-gray-100" />
          <AccountMenuItem
            testID="account-menu-logout-button"
            icon="log-out-outline"
            label={t('account.menu.logout')}
            onPress={() => {
              setMenuOpen(false);
              onLogout();
            }}
          />
          <View className="h-px bg-gray-100" />
          <AccountMenuItem
            testID="account-menu-delete-button"
            icon="trash-outline"
            label={t('account.menu.deleteAccount')}
            destructive
            onPress={() => {
              setMenuOpen(false);
              setDeleteModalOpen(true);
            }}
          />
        </View>
      </Pressable>
    </Modal>

    <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => setDeleteModalOpen(false)}>
        <Pressable className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-4" onPress={(event) => event.stopPropagation()}>
          <Text className="text-base font-bold text-red-900">{t('account.deleteAccount.cardTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-red-800">{t('account.deleteAccount.cardBody')}</Text>
          <Pressable
            testID="account-delete-confirm-button"
            accessibilityRole="button"
            disabled={deletingAccount}
            className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3 ${deletingAccount ? 'bg-red-400' : 'bg-red-600 active:bg-red-700'}`}
            onPress={() => void handleConfirmDeleteAccount()}
          >
            <Ionicons name="trash-outline" size={17} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('account.deleteAccount.cta')}</Text>
          </Pressable>
          <Pressable
            testID="account-delete-cancel-button"
            className="mt-3 rounded-xl border border-red-100 bg-white py-3 active:bg-red-50"
            onPress={() => setDeleteModalOpen(false)}
          >
            <Text className="text-center text-sm font-semibold text-red-700">{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

function AccountMenuItem({
  icon,
  label,
  onPress,
  testID,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      className="flex-row items-center gap-3 px-4 py-3.5 active:bg-slate-50"
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={destructive ? '#dc2626' : '#334155'} />
      <Text className={`flex-1 text-sm font-semibold ${destructive ? 'text-red-600' : 'text-slate-800'}`}>{label}</Text>
    </Pressable>
  );
}

function LegalLinkButton({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      className="flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-3 active:bg-slate-100"
      onPress={() => void Linking.openURL(url)}
    >
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <Ionicons name="open-outline" size={17} color="#64748b" />
    </Pressable>
  );
}

function AdminStatusRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <Text className="text-sm font-bold text-slate-900">{value}</Text>
    </View>
  );
}

function SenInfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Ionicons name={icon} size={18} color={PRIMARY} />
        <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-700" numberOfLines={1}>{label}</Text>
      </View>
      <Text className="ml-3 text-sm font-bold text-slate-900">{value}</Text>
    </View>
  );
}

function FilterDropdownButton({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-w-[110px] flex-1 rounded-xl border px-2.5 py-2.5 ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-slate-50'}`}
      onPress={onPress}
    >
      <Text className="text-[10px] font-bold uppercase text-slate-400" numberOfLines={1}>{label}</Text>
      <View className="mt-1 flex-row items-center justify-between gap-1">
        <Text className={`min-w-0 flex-1 text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name={active ? 'chevron-up' : 'chevron-down'} size={14} color={active ? PRIMARY : '#64748b'} />
      </View>
    </Pressable>
  );
}

function DropdownOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center justify-between px-3 py-3 ${active ? 'bg-blue-50' : 'bg-white'}`}
      onPress={onPress}
    >
      <Text className={`min-w-0 flex-1 text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`} numberOfLines={1}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark" size={17} color={PRIMARY} /> : null}
    </Pressable>
  );
}

function AdminPostMediaPreview({ post }: { post: PetFeedPost }) {
  const imageUrl = post.media_urls[0];
  if (!imageUrl && !post.video_url) return null;
  return (
    <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <View className="h-40 w-full">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="videocam-outline" size={32} color="#64748b" />
          </View>
        )}
      </View>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text className="text-xs font-bold uppercase text-slate-500">Media review</Text>
        <View className="flex-row gap-2">
          <Text className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">
            {post.media_urls.length} photo{post.media_urls.length === 1 ? '' : 's'}
          </Text>
          {post.video_url ? (
            <Text className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Video</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function AdminActionButton({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: 'primary' | 'success' | 'warning' | 'neutral';
  onPress: () => void;
}) {
  const className =
    variant === 'success'
      ? 'bg-emerald-600'
      : variant === 'warning'
        ? 'bg-amber-600'
        : variant === 'primary'
          ? 'bg-blue-600'
          : 'bg-slate-700';
  return (
    <Pressable className={`min-w-[96px] flex-1 rounded-xl py-3 ${className}`} onPress={onPress}>
      <Text className="text-center text-xs font-bold text-white">{label}</Text>
    </Pressable>
  );
}
