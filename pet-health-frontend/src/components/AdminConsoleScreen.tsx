import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  listAdminActionLogs,
  listAdminBreederSubmissions,
  listAdminSupportTickets,
  listAdminTransparencyWarnings,
  resolveAdminTransparencyWarning,
  updateAdminAnnouncementPost,
  updateAdminBreederSubmissionStatus,
  updateAdminSupportTicketStatus,
} from '../api';
import { AdminConsoleNavDrawer } from './AdminConsoleNavDrawer';
import { AdminFeaturesScreen } from '../screens/AdminFeaturesScreen';
import { AdminHealthEvidencePreview } from './AdminHealthEvidencePreview';
import { AdminRejectBreederModal } from './AdminRejectBreederModal';
import {
  ADMIN_CONSOLE_NAV_ITEMS,
  type AdminConsoleSection,
} from '../constants/adminConsoleNav';
import type {
  AccountProfile,
  AdminActionLog,
  AdminBreederSubmission,
  AdminFarmReview,
  AdminSupportTicket,
  AdminTransparencyWarning,
  AppFeatureFlags,
  BreederProfile,
  PetFeedPost,
  PetFeedReport,
  UserRole,
} from '../types';
import { confirmAdminModeration } from '../utils/adminConfirmModeration';
import {
  adminBreederPenaltySummary,
  adminReportReasonLabel,
  adminReportTargetSubtitle,
} from '../utils/adminModerationDisplay';
import { BRAND } from '../theme/brand';

type BreederStatusOptions = {
  rejectionReason?: string;
  adminAction?: string;
  adminNote?: string;
};

type FeatureToggleKey = keyof AppFeatureFlags;
type StatusTone = 'amber' | 'green' | 'red' | 'slate' | 'blue';

export type AdminConsoleScreenProps = {
  section: AdminConsoleSection;
  onSectionChange: (section: AdminConsoleSection) => void;
  account: AccountProfile | null;
  accounts: AccountProfile[];
  breederProfiles: BreederProfile[];
  posts: PetFeedPost[];
  reports: PetFeedReport[];
  farmReviews: AdminFarmReview[];
  myAnnouncements: PetFeedPost[];
  featureFlags: AppFeatureFlags | null;
  featureFlagsLoading: boolean;
  featureFlagSavingKey: FeatureToggleKey | null;
  token: string | null;
  refreshing?: boolean;
  onRefresh: () => Promise<void>;
  onOpenCreateNews: () => void;
  onOpenUser: (account: AccountProfile) => void;
  onCreateAccount: (payload: {
    email: string;
    password: string;
    displayName: string;
    primaryRole: UserRole;
  }) => Promise<void>;
  onUpdateBreederStatus: (userId: string, status: string, options?: BreederStatusOptions) => Promise<void>;
  onUpdatePostStatus: (postId: string, status: string, options?: BreederStatusOptions) => Promise<void>;
  onUpdateReportStatus: (reportId: string, status: string) => Promise<string | void>;
  onUpdateFarmReviewStatus: (
    reviewId: string,
    status: 'approved' | 'rejected',
    options?: BreederStatusOptions,
  ) => Promise<void>;
  onToggleFeature: (key: FeatureToggleKey, enabled: boolean) => Promise<void>;
  onLogout: () => void;
  onReloadAnnouncements?: () => Promise<void>;
};

const LISTING_STATUSES = ['all', 'pending_review', 'published', 'deposit_hold', 'sold', 'archived'] as const;
const REPORT_STATUSES = ['open', 'reviewed', 'dismissed', 'all'] as const;
const BREEDER_STATUSES = ['all', 'pending_review', 'verified', 'rejected', 'suspended'] as const;
const ROLE_OPTIONS: UserRole[] = ['sen', 'breeder', 'admin'];
const REQUEST_TYPES = ['all', 'breeder', 'post', 'report', 'farm_review', 'detail', 'appeal', 'feedback', 'scam'] as const;
const HISTORY_ACTION_FILTERS = [
  'all',
  'breeder.verify',
  'breeder.reject',
  'breeder.suspend',
  'post.approve',
  'post.archive',
  'report.review',
  'report.dismiss',
  'account.create',
  'account.update',
  'feature_flags.update',
  'announcement.create',
  'announcement.update',
] as const;

const CARD = 'mb-3 rounded-2xl border border-[#E8DFD0] bg-white p-4';
const INPUT = 'rounded-xl border border-[#E8DFD0] bg-[#FCFBFA] px-3 py-3 text-sm text-[#2B1E19]';

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View className="mb-3 flex-row items-baseline gap-2">
      <Text className="text-lg font-bold text-[#2B1E19]">{title}</Text>
      {typeof count === 'number' ? (
        <Text className="text-sm font-medium text-[#8B7355]">{count}</Text>
      ) : null}
    </View>
  );
}

function MetricTile({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[46%] flex-1 rounded-2xl border border-[#E8DFD0] bg-white p-4 active:border-[#D97706]/60"
    >
      <Text className={`text-3xl font-bold ${value > 0 ? 'text-[#D97706]' : 'text-[#C4B5A5]'}`}>
        {value}
      </Text>
      <Text className="mt-1 text-xs font-medium text-[#8B7355]">{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3.5 py-2 ${active ? 'bg-[#FFF1DE]' : 'bg-[#F3EDE3]'}`}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-[#B45309]' : 'text-[#5C4A3A]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
      <View className="flex-row items-center gap-2 pr-2">{children}</View>
    </ScrollView>
  );
}

function StatusPill({ label, tone = 'slate' }: { label: string; tone?: StatusTone }) {
  const borderBg: Record<StatusTone, string> = {
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
    slate: 'border-[#E8DFD0] bg-[#F8F5F2]',
    blue: 'border-sky-200 bg-sky-50',
  };
  const textTone: Record<StatusTone, string> = {
    amber: 'text-amber-900',
    green: 'text-emerald-800',
    red: 'text-red-800',
    slate: 'text-[#5C4A3A]',
    blue: 'text-sky-800',
  };
  return (
    <View className={`rounded-full border px-2.5 py-0.5 ${borderBg[tone]}`}>
      <Text className={`text-[10px] font-bold uppercase tracking-wide ${textTone[tone]}`}>
        {label}
      </Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-[#E8DFD0] bg-white px-4 py-10">
      <Ionicons name="file-tray-outline" size={28} color="#C4B5A5" />
      <Text className="mt-3 text-center text-sm text-[#8B7355]">{message}</Text>
    </View>
  );
}

function ActionBtn({
  label,
  tone = 'primary',
  disabled,
  onPress,
}: {
  label: string;
  tone?: 'primary' | 'danger' | 'ghost' | 'success';
  disabled?: boolean;
  onPress: () => void;
}) {
  const cls =
    tone === 'danger'
      ? 'bg-red-600'
      : tone === 'success'
        ? 'bg-emerald-600'
        : tone === 'ghost'
          ? 'bg-[#F3EDE3]'
          : 'bg-[#D97706]';
  const text = tone === 'ghost' ? 'text-[#5C4A3A]' : 'text-white';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[44px] min-w-[46%] flex-1 justify-center rounded-xl px-3 py-2.5 ${cls} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-center text-xs font-bold ${text}`} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return <View className="mt-3 flex-row flex-wrap gap-2">{children}</View>;
}

function listingStatusTone(status: string): StatusTone {
  if (status === 'pending_review') return 'amber';
  if (status === 'published') return 'green';
  if (status === 'deposit_hold') return 'blue';
  if (status === 'sold') return 'slate';
  if (status === 'archived') return 'red';
  return 'slate';
}

function breederStatusTone(status: string): StatusTone {
  if (status === 'pending_review') return 'amber';
  if (status === 'verified') return 'green';
  if (status === 'rejected' || status === 'suspended') return 'red';
  return 'slate';
}

function reportStatusTone(status: string): StatusTone {
  if (status === 'open') return 'amber';
  if (status === 'reviewed') return 'green';
  if (status === 'dismissed') return 'slate';
  return 'slate';
}

export function AdminConsoleScreen({
  section,
  onSectionChange,
  account,
  accounts,
  breederProfiles,
  posts,
  reports,
  farmReviews,
  myAnnouncements,
  featureFlags,
  featureFlagsLoading,
  featureFlagSavingKey,
  token,
  refreshing = false,
  onRefresh,
  onOpenCreateNews,
  onOpenUser,
  onCreateAccount,
  onUpdateBreederStatus,
  onUpdatePostStatus,
  onUpdateReportStatus,
  onUpdateFarmReviewStatus,
  onToggleFeature,
  onLogout,
  onReloadAnnouncements,
}: AdminConsoleScreenProps) {
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<View>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rejectBreederId, setRejectBreederId] = useState<string | null>(null);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [listingStatus, setListingStatus] = useState<(typeof LISTING_STATUSES)[number]>('all');
  const [reportStatus, setReportStatus] = useState<(typeof REPORT_STATUSES)[number]>('open');
  const [breederStatus, setBreederStatus] = useState<(typeof BREEDER_STATUSES)[number]>('all');
  const [requestType, setRequestType] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sen');
  const [historyAction, setHistoryAction] = useState<(typeof HISTORY_ACTION_FILTERS)[number]>('all');
  const [historyLogs, setHistoryLogs] = useState<AdminActionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AdminBreederSubmission[]>([]);
  const [appeals, setAppeals] = useState<AdminTransparencyWarning[]>([]);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [queueExtraLoading, setQueueExtraLoading] = useState(false);

  const pendingBreeders = useMemo(
    () => breederProfiles.filter((p) => p.verification_status === 'pending_review'),
    [breederProfiles],
  );
  const pendingPosts = useMemo(
    () => posts.filter((p) => p.status === 'pending_review'),
    [posts],
  );
  const openReports = useMemo(() => reports.filter((r) => r.status === 'open'), [reports]);
  const verifiedBreeders = useMemo(
    () => breederProfiles.filter((p) => p.verification_status === 'verified'),
    [breederProfiles],
  );
  const pendingFarmReviews = useMemo(
    () => farmReviews.filter((r) => !r.status || r.status === 'pending'),
    [farmReviews],
  );

  const pendingRequestCount =
    pendingBreeders.length
    + pendingPosts.length
    + openReports.length
    + pendingFarmReviews.length
    + submissions.filter((s) => s.status === 'pending' || s.status === 'pending_review').length
    + appeals.filter((a) => a.status === 'appealed' || a.status === 'pending').length
    + tickets.filter((tkt) => tkt.status === 'open').length;

  const filteredListings = useMemo(() => {
    if (listingStatus === 'all') return posts;
    return posts.filter((p) => p.status === listingStatus);
  }, [posts, listingStatus]);

  const filteredReports = useMemo(() => {
    if (reportStatus === 'all') return reports;
    return reports.filter((r) => r.status === reportStatus);
  }, [reports, reportStatus]);

  const filteredBreeders = useMemo(() => {
    if (breederStatus === 'all') return breederProfiles;
    return breederProfiles.filter((p) => p.verification_status === breederStatus);
  }, [breederProfiles, breederStatus]);

  const filteredAccounts = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) =>
      [a.display_name, a.email, a.login_identifier, a.primary_role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [accounts, userSearch]);

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === 'pending' || s.status === 'pending_review'),
    [submissions],
  );
  const pendingAppeals = useMemo(
    () => appeals.filter((a) => a.status === 'appealed' || a.status === 'pending'),
    [appeals],
  );
  const openTickets = useMemo(() => {
    return tickets.filter((tkt) => {
      if (tkt.status !== 'open') return false;
      if (requestType === 'feedback') return tkt.kind === 'feedback';
      if (requestType === 'scam') return tkt.kind === 'scam';
      return tkt.kind === 'feedback' || tkt.kind === 'scam';
    });
  }, [tickets, requestType]);

  const requestQueueCount = useMemo(() => {
    let n = 0;
    if (requestType === 'all' || requestType === 'breeder') n += pendingBreeders.length;
    if (requestType === 'all' || requestType === 'post') n += pendingPosts.length;
    if (requestType === 'all' || requestType === 'report') n += openReports.length;
    if (requestType === 'all' || requestType === 'farm_review') n += pendingFarmReviews.length;
    if (requestType === 'all' || requestType === 'detail') n += pendingSubmissions.length;
    if (requestType === 'all' || requestType === 'appeal') n += pendingAppeals.length;
    if (requestType === 'all' || requestType === 'feedback' || requestType === 'scam') n += openTickets.length;
    return n;
  }, [
    requestType,
    pendingBreeders.length,
    pendingPosts.length,
    openReports.length,
    pendingFarmReviews.length,
    pendingSubmissions.length,
    pendingAppeals.length,
    openTickets.length,
  ]);

  const loadQueueExtras = useCallback(async () => {
    if (!token) return;
    setQueueExtraLoading(true);
    try {
      const [subs, warns, tix] = await Promise.all([
        listAdminBreederSubmissions(token, '').catch(() => ({ data: [] as AdminBreederSubmission[] })),
        listAdminTransparencyWarnings(token, '').catch(() => ({ data: [] as AdminTransparencyWarning[] })),
        listAdminSupportTickets(token, '').catch(() => ({ data: [] as AdminSupportTicket[] })),
      ]);
      setSubmissions(Array.isArray(subs.data) ? subs.data : []);
      setAppeals(Array.isArray(warns.data) ? warns.data : []);
      setTickets(Array.isArray(tix.data) ? tix.data : []);
    } finally {
      setQueueExtraLoading(false);
    }
  }, [token]);

  const loadHistory = useCallback(
    async (reset: boolean) => {
      if (!token) return;
      setHistoryLoading(true);
      try {
        const res = await listAdminActionLogs(token, {
          action: historyAction === 'all' ? undefined : historyAction,
          cursor: reset ? null : historyCursor,
          limit: 30,
        });
        setHistoryLogs((prev) => (reset ? res.data : [...prev, ...res.data]));
        setHistoryCursor(res.next_cursor);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t('common.unknownError');
        Alert.alert(t('common.error'), message);
      } finally {
        setHistoryLoading(false);
      }
    },
    [token, historyAction, historyCursor, t],
  );

  useEffect(() => {
    if (section === 'requests' || section === 'home') {
      void loadQueueExtras();
    }
  }, [section, loadQueueExtras]);

  useEffect(() => {
    if (section === 'history') {
      setHistoryCursor(null);
      void loadHistory(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filter/section changes
  }, [section, historyAction]);

  async function runAction(key: string, action: () => Promise<unknown>, success?: string) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await action();
      if (success) Alert.alert(t('common.ok'), success);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('common.error'), message);
    } finally {
      setBusyKey(null);
    }
  }

  const sectionLabel =
    ADMIN_CONSOLE_NAV_ITEMS.find((item) => item.key === section)?.labelKey
    ?? 'adminConsole.title';

  function listingStatusLabel(status: string) {
    const key = `adminConsole.listings.status.${status}` as const;
    const translated = t(key);
    return translated === key ? status : translated;
  }

  function breederStatusLabel(status: string) {
    const key = `adminConsole.breeders.status.${status}` as const;
    const translated = t(key);
    return translated === key ? status.replace(/_/g, ' ') : translated;
  }

  return (
    <View className="flex-1 bg-[#FCFBFA]" testID="admin-console-screen">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BRAND.primary} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#8B7355]">
              {t('adminConsole.title')}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-[#2B1E19]" numberOfLines={1}>
              {t(sectionLabel)}
            </Text>
          </View>
          <View ref={menuRef} collapsable={false}>
            <Pressable
              testID="admin-console-menu-button"
              accessibilityRole="button"
              accessibilityLabel={t('adminConsole.menu')}
              className="h-11 w-11 items-center justify-center rounded-full border border-[#E8DFD0] bg-white active:bg-[#FFF1DE]"
              onPress={() => {
                const windowWidth = Dimensions.get('window').width;
                menuRef.current?.measureInWindow((x, y, width, height) => {
                  setMenuAnchor({
                    top: y + height + 8,
                    right: Math.max(12, windowWidth - (x + width)),
                  });
                  setNavOpen(true);
                });
              }}
            >
              <Ionicons name="menu-outline" size={22} color="#5C4A3A" />
            </Pressable>
          </View>
        </View>

        {section === 'home' ? (
          <View className="mt-5">
            <View className="flex-row flex-wrap gap-3">
              <MetricTile
                label={t('adminConsole.home.metric.requests')}
                value={pendingRequestCount}
                onPress={() => onSectionChange('requests')}
              />
              <MetricTile
                label={t('adminConsole.home.metric.listings')}
                value={pendingPosts.length}
                onPress={() => {
                  setListingStatus('pending_review');
                  onSectionChange('listings');
                }}
              />
              <MetricTile
                label={t('adminConsole.home.metric.breeders')}
                value={pendingBreeders.length}
                onPress={() => {
                  setBreederStatus('pending_review');
                  onSectionChange('breeders');
                }}
              />
              <MetricTile
                label={t('adminConsole.home.metric.reports')}
                value={openReports.length}
                onPress={() => {
                  setReportStatus('open');
                  onSectionChange('reports');
                }}
              />
              <MetricTile
                label={t('adminConsole.home.metric.users')}
                value={accounts.length}
                onPress={() => onSectionChange('users')}
              />
              <MetricTile
                label={t('adminConsole.home.metric.verified')}
                value={verifiedBreeders.length}
                onPress={() => {
                  setBreederStatus('verified');
                  onSectionChange('breeders');
                }}
              />
            </View>
            {account ? (
              <View className={`${CARD} mt-5`}>
                <Text className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
                  {t('adminConsole.home.signedIn')}
                </Text>
                <Text className="mt-1 font-bold text-[#2B1E19]" numberOfLines={1}>
                  {account.display_name || account.login_identifier}
                </Text>
                <Text className="mt-1 text-sm text-[#8B7355]" numberOfLines={1}>
                  {account.email ?? account.login_identifier}
                </Text>
              </View>
            ) : null}
            <Pressable
              className="mt-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-3.5 active:opacity-90"
              onPress={onOpenCreateNews}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('adminPost.createTitle')}</Text>
            </Pressable>
          </View>
        ) : null}

        {section === 'requests' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.requests')} count={requestQueueCount} />
            <Text className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
              {t('adminConsole.filters')}
            </Text>
            <FilterChipRow>
              {REQUEST_TYPES.map((key) => (
                <Chip
                  key={key}
                  label={t(`adminConsole.requests.types.${key}`)}
                  active={requestType === key}
                  onPress={() => setRequestType(key)}
                />
              ))}
            </FilterChipRow>
            {queueExtraLoading ? <ActivityIndicator color={BRAND.primary} className="mb-3" /> : null}

            {(requestType === 'all' || requestType === 'breeder')
              && pendingBreeders.map((profile) => (
                <View key={`b-${profile.user_id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill label={t('adminConsole.requests.types.breeder')} tone="amber" />
                    {profile.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3EDE3' }}
                        contentFit="cover"
                      />
                    ) : null}
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>{profile.display_name}</Text>
                  {profile.location ? (
                    <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={1}>{profile.location}</Text>
                  ) : null}
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.approve')}
                      tone="success"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        void runAction(`bv-${profile.user_id}`, () => onUpdateBreederStatus(profile.user_id, 'verified'), t('adminReview.updateSuccess'))
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.reject')}
                      tone="danger"
                      disabled={Boolean(busyKey)}
                      onPress={() => setRejectBreederId(profile.user_id)}
                    />
                  </ActionRow>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'post')
              && pendingPosts.map((post) => {
                const thumb = post.media_urls?.[0];
                return (
                  <View key={`p-${post.id}`} className={CARD}>
                    <View className="mb-2 flex-row flex-wrap items-center gap-2">
                      <StatusPill label={t('adminConsole.requests.types.post')} tone="amber" />
                    </View>
                    <View className="flex-row gap-3">
                      {thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: '#F3EDE3' }}
                          contentFit="cover"
                        />
                      ) : null}
                      <View className="min-w-0 flex-1">
                        <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>{post.title}</Text>
                        <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={1}>
                          {[post.breed, post.location].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <AdminHealthEvidencePreview post={post} />
                    <ActionRow>
                      <ActionBtn
                        label={t('adminReview.approve')}
                        tone="success"
                        disabled={Boolean(busyKey)}
                        onPress={() =>
                          void runAction(`pa-${post.id}`, () => onUpdatePostStatus(post.id, 'published'), t('adminReview.updateSuccess'))
                        }
                      />
                      <ActionBtn
                        label={t('adminReview.reject')}
                        tone="danger"
                        disabled={Boolean(busyKey)}
                        onPress={() => setRejectPostId(post.id)}
                      />
                    </ActionRow>
                  </View>
                );
              })}

            {(requestType === 'all' || requestType === 'report')
              && openReports.map((report) => (
                <View key={`r-${report.id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill label={t('adminConsole.requests.types.report')} tone="red" />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                    {adminReportReasonLabel(t, report.reason)}
                  </Text>
                  <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={2}>
                    {adminReportTargetSubtitle(t, report, posts)}
                  </Text>
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.markReviewed')}
                      tone="danger"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        confirmAdminModeration('violation', t, () => {
                          void runAction(`rr-${report.id}`, () => onUpdateReportStatus(report.id, 'reviewed'));
                        })
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.dismiss')}
                      tone="ghost"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        void runAction(`rd-${report.id}`, () => onUpdateReportStatus(report.id, 'dismissed'))
                      }
                    />
                  </ActionRow>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'farm_review')
              && pendingFarmReviews.map((review) => (
                <View key={`fr-${review.id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill label={t('adminConsole.requests.types.farm_review')} tone="blue" />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                    {review.breeder_profile?.display_name || review.breeder_profile_id}
                  </Text>
                  <Text className="mt-1 text-xs text-[#8B7355]">
                    {t('adminConsole.requests.types.farm_review')} · {review.rating}*
                  </Text>
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.approve')}
                      tone="success"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        void runAction(`fra-${review.id}`, () => onUpdateFarmReviewStatus(review.id, 'approved'))
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.reject')}
                      tone="danger"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        void runAction(`frr-${review.id}`, () =>
                          onUpdateFarmReviewStatus(review.id, 'rejected', {
                            rejectionReason: t('adminReview.reject'),
                          }),
                        )
                      }
                    />
                  </ActionRow>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'detail')
              && pendingSubmissions.map((sub) => (
                <View key={`s-${sub.id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill label={t('adminConsole.requests.types.detail')} tone="amber" />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                    {sub.breeder_display_name || sub.breeder_profile_id || sub.id}
                  </Text>
                  <Text className="mt-1 text-xs text-[#8B7355]">
                    {sub.submission_type || 'detail'}
                  </Text>
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.approve')}
                      tone="success"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`sa-${sub.id}`, async () => {
                          if (!token) return;
                          await updateAdminBreederSubmissionStatus(token, sub.id, 'approved');
                          await loadQueueExtras();
                        })
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.reject')}
                      tone="danger"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`sr-${sub.id}`, async () => {
                          if (!token) return;
                          await updateAdminBreederSubmissionStatus(token, sub.id, 'rejected', {
                            rejectionReason: t('adminReview.reject'),
                          });
                          await loadQueueExtras();
                        })
                      }
                    />
                  </ActionRow>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'appeal')
              && pendingAppeals.map((appeal) => (
                <View key={`a-${appeal.id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill label={t('adminConsole.requests.types.appeal')} tone="red" />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                    {appeal.breeder_display_name || appeal.breeder_profile_id || appeal.id}
                  </Text>
                  {appeal.appeal_note ? (
                    <Text className="mt-2 text-sm leading-5 text-[#5C4A3A]" numberOfLines={4}>
                      {appeal.appeal_note}
                    </Text>
                  ) : null}
                  <ActionRow>
                    <ActionBtn
                      label={t('adminConsole.appeals.restore')}
                      tone="success"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`ar-${appeal.id}`, async () => {
                          if (!token) return;
                          await resolveAdminTransparencyWarning(token, appeal.id, 'restore');
                          await loadQueueExtras();
                        })
                      }
                    />
                    <ActionBtn
                      label={t('adminConsole.appeals.uphold')}
                      tone="danger"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`au-${appeal.id}`, async () => {
                          if (!token) return;
                          await resolveAdminTransparencyWarning(token, appeal.id, 'uphold');
                          await loadQueueExtras();
                        })
                      }
                    />
                  </ActionRow>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'feedback' || requestType === 'scam')
              && openTickets.map((ticket) => (
                <View key={`t-${ticket.id}`} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill
                      label={t(`adminConsole.requests.types.${ticket.kind === 'scam' ? 'scam' : 'feedback'}`)}
                      tone={ticket.kind === 'scam' ? 'red' : 'blue'}
                    />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                    {ticket.subject || ticket.id}
                  </Text>
                  {ticket.body ? (
                    <Text className="mt-2 text-sm leading-5 text-[#5C4A3A]" numberOfLines={4}>
                      {ticket.body}
                    </Text>
                  ) : null}
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.markReviewed')}
                      tone="success"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`tr-${ticket.id}`, async () => {
                          if (!token) return;
                          await updateAdminSupportTicketStatus(token, ticket.id, 'reviewed');
                          await loadQueueExtras();
                        })
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.dismiss')}
                      tone="ghost"
                      disabled={Boolean(busyKey) || !token}
                      onPress={() =>
                        void runAction(`td-${ticket.id}`, async () => {
                          if (!token) return;
                          await updateAdminSupportTicketStatus(token, ticket.id, 'dismissed');
                          await loadQueueExtras();
                        })
                      }
                    />
                  </ActionRow>
                </View>
              ))}

            {!queueExtraLoading && requestQueueCount === 0 ? (
              <EmptyState message={t('adminConsole.empty')} />
            ) : null}
          </View>
        ) : null}

        {section === 'listings' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.listings')} count={filteredListings.length} />
            <FilterChipRow>
              {LISTING_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`adminConsole.listings.status.${status}`)}
                  active={listingStatus === status}
                  onPress={() => setListingStatus(status)}
                />
              ))}
            </FilterChipRow>
            {filteredListings.length === 0 ? <EmptyState message={t('adminConsole.empty')} /> : null}
            {filteredListings.map((post) => {
              const thumb = post.media_urls?.[0];
              return (
                <View key={post.id} className={CARD}>
                  <View className="flex-row gap-3">
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3EDE3' }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-20 w-20 items-center justify-center rounded-xl bg-[#F3EDE3]">
                        <Ionicons name="image-outline" size={22} color="#C4B5A5" />
                      </View>
                    )}
                    <View className="min-w-0 flex-1">
                      <View className="mb-1.5 flex-row flex-wrap items-center gap-2">
                        <StatusPill
                          label={listingStatusLabel(post.status)}
                          tone={listingStatusTone(post.status)}
                        />
                      </View>
                      <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>{post.title}</Text>
                      <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={1}>
                        {[post.breed, post.location, post.price_note].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <AdminHealthEvidencePreview post={post} />
                  {post.status === 'pending_review' || post.status === 'published' || post.status === 'deposit_hold' ? (
                    <ActionRow>
                      {post.status === 'pending_review' ? (
                        <>
                          <ActionBtn
                            label={t('adminReview.approve')}
                            tone="success"
                            disabled={Boolean(busyKey)}
                            onPress={() =>
                              void runAction(`la-${post.id}`, () => onUpdatePostStatus(post.id, 'published'))
                            }
                          />
                          <ActionBtn
                            label={t('adminReview.reject')}
                            tone="danger"
                            disabled={Boolean(busyKey)}
                            onPress={() => setRejectPostId(post.id)}
                          />
                        </>
                      ) : null}
                      {post.status === 'published' || post.status === 'deposit_hold' ? (
                        <ActionBtn
                          label={t('adminReview.archive')}
                          tone="ghost"
                          disabled={Boolean(busyKey)}
                          onPress={() =>
                            void runAction(`lar-${post.id}`, () => onUpdatePostStatus(post.id, 'archived'))
                          }
                        />
                      ) : null}
                    </ActionRow>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {section === 'breeders' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.breeders')} count={filteredBreeders.length} />
            <FilterChipRow>
              {BREEDER_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={breederStatusLabel(status)}
                  active={breederStatus === status}
                  onPress={() => setBreederStatus(status)}
                />
              ))}
            </FilterChipRow>
            {filteredBreeders.length === 0 ? <EmptyState message={t('adminConsole.empty')} /> : null}
            {filteredBreeders.map((profile) => {
              const summary = adminBreederPenaltySummary(profile);
              return (
                <View key={profile.user_id} className={CARD}>
                  <View className="flex-row gap-3">
                    {profile.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3EDE3' }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFF1DE]">
                        <Ionicons name="person-outline" size={22} color="#D97706" />
                      </View>
                    )}
                    <View className="min-w-0 flex-1">
                      <View className="mb-1.5 flex-row flex-wrap items-center gap-2">
                        <StatusPill
                          label={breederStatusLabel(profile.verification_status)}
                          tone={breederStatusTone(profile.verification_status)}
                        />
                      </View>
                      <Text className="font-bold text-[#2B1E19]" numberOfLines={1}>
                        {profile.display_name}
                      </Text>
                      {profile.location ? (
                        <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={1}>
                          {profile.location}
                        </Text>
                      ) : null}
                      {summary.points > 0 || summary.violations > 0 ? (
                        <Text className="mt-1 text-xs font-semibold text-amber-800">
                          {summary.points} pts · {summary.violations} violations
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <ActionRow>
                    {profile.verification_status === 'pending_review' ? (
                      <>
                        <ActionBtn
                          label={t('adminReview.approve')}
                          tone="success"
                          disabled={Boolean(busyKey)}
                          onPress={() =>
                            void runAction(`ba-${profile.user_id}`, () =>
                              onUpdateBreederStatus(profile.user_id, 'verified'),
                            )
                          }
                        />
                        <ActionBtn
                          label={t('adminReview.reject')}
                          tone="danger"
                          disabled={Boolean(busyKey)}
                          onPress={() => setRejectBreederId(profile.user_id)}
                        />
                      </>
                    ) : null}
                    {profile.verification_status === 'verified' ? (
                      <ActionBtn
                        label={t('adminReview.suspend')}
                        tone="danger"
                        disabled={Boolean(busyKey)}
                        onPress={() =>
                          confirmAdminModeration('suspend', t, () => {
                            void runAction(`bs-${profile.user_id}`, () =>
                              onUpdateBreederStatus(profile.user_id, 'suspended'),
                            );
                          })
                        }
                      />
                    ) : null}
                    {profile.verification_status === 'rejected' || profile.verification_status === 'suspended' ? (
                      <ActionBtn
                        label={t('adminReview.approve')}
                        tone="success"
                        disabled={Boolean(busyKey)}
                        onPress={() =>
                          void runAction(`br-${profile.user_id}`, () =>
                            onUpdateBreederStatus(profile.user_id, 'verified'),
                          )
                        }
                      />
                    ) : null}
                  </ActionRow>
                </View>
              );
            })}
          </View>
        ) : null}

        {section === 'reports' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.reports')} count={filteredReports.length} />
            <FilterChipRow>
              {REPORT_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`adminConsole.reports.status.${status}`)}
                  active={reportStatus === status}
                  onPress={() => setReportStatus(status)}
                />
              ))}
            </FilterChipRow>
            {filteredReports.length === 0 ? <EmptyState message={t('adminConsole.empty')} /> : null}
            {filteredReports.map((report) => (
              <View key={report.id} className={CARD}>
                <View className="mb-2 flex-row flex-wrap items-center gap-2">
                  <StatusPill
                    label={t(`adminConsole.reports.status.${report.status}`)}
                    tone={reportStatusTone(report.status)}
                  />
                </View>
                <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>
                  {adminReportReasonLabel(t, report.reason)}
                </Text>
                <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={2}>
                  {adminReportTargetSubtitle(t, report, posts)}
                </Text>
                {report.note ? (
                  <Text className="mt-2 text-sm leading-5 text-[#5C4A3A]" numberOfLines={3}>
                    {report.note}
                  </Text>
                ) : null}
                {report.status === 'open' ? (
                  <ActionRow>
                    <ActionBtn
                      label={t('adminReview.markReviewed')}
                      tone="danger"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        confirmAdminModeration('violation', t, () => {
                          void runAction(`rpr-${report.id}`, () => onUpdateReportStatus(report.id, 'reviewed'));
                        })
                      }
                    />
                    <ActionBtn
                      label={t('adminReview.dismiss')}
                      tone="ghost"
                      disabled={Boolean(busyKey)}
                      onPress={() =>
                        void runAction(`rpd-${report.id}`, () => onUpdateReportStatus(report.id, 'dismissed'))
                      }
                    />
                  </ActionRow>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {section === 'history' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.history')} count={historyLogs.length} />
            <FilterChipRow>
              {HISTORY_ACTION_FILTERS.map((action) => (
                <Chip
                  key={action}
                  label={
                    action === 'all'
                      ? t('adminHub.history.filterAll')
                      : t(`adminHub.history.actions.${action}`)
                  }
                  active={historyAction === action}
                  onPress={() => setHistoryAction(action)}
                />
              ))}
            </FilterChipRow>
            {historyLoading && historyLogs.length === 0 ? (
              <ActivityIndicator color={BRAND.primary} className="my-8" />
            ) : null}
            {!historyLoading && historyLogs.length === 0 ? (
              <EmptyState message={t('adminConsole.empty')} />
            ) : null}
            {historyLogs.map((log) => (
              <View key={log.id} className={CARD}>
                <StatusPill label={log.action} tone="slate" />
                <Text className="mt-2 text-sm font-semibold text-[#2B1E19]" numberOfLines={2}>
                  {log.actor_display_name || log.actor_user_id || '—'}
                </Text>
                <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={2}>
                  {log.target_type}
                  {log.target_id ? ` · ${log.target_id}` : ''}
                </Text>
                <Text className="mt-1 text-[11px] text-[#B8A990]">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </Text>
              </View>
            ))}
            {historyCursor ? (
              <Pressable
                className="mt-1 min-h-[44px] items-center justify-center rounded-xl border border-[#E8DFD0] bg-white py-3"
                disabled={historyLoading}
                onPress={() => void loadHistory(false)}
              >
                <Text className="text-center text-sm font-semibold text-[#D97706]">
                  {historyLoading ? t('common.loading') : t('adminConsole.loadMore')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {section === 'users' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.users')} count={filteredAccounts.length} />
            <View className={`${CARD}`}>
              <Text className="text-sm font-bold text-[#2B1E19]">{t('adminHub.createAccount')}</Text>
              <TextInput
                className={`${INPUT} mt-3`}
                placeholder={t('adminReview.accountEmail')}
                placeholderTextColor="#B8A990"
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                className={`${INPUT} mt-2.5`}
                placeholder={t('adminReview.accountDisplayName')}
                placeholderTextColor="#B8A990"
                value={newDisplayName}
                onChangeText={setNewDisplayName}
              />
              <TextInput
                className={`${INPUT} mt-2.5`}
                placeholder={t('login.password')}
                placeholderTextColor="#B8A990"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <View className="mt-3 flex-row flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <Chip
                    key={role}
                    label={t(`account.roles.${role}.title`)}
                    active={newRole === role}
                    onPress={() => setNewRole(role)}
                  />
                ))}
              </View>
              <Pressable
                className="mt-3 min-h-[44px] items-center justify-center rounded-xl bg-[#D97706] py-3 active:opacity-90"
                onPress={() => {
                  void onCreateAccount({
                    email: newEmail.trim(),
                    password: newPassword,
                    displayName: newDisplayName.trim(),
                    primaryRole: newRole,
                  }).then(() => {
                    setNewEmail('');
                    setNewDisplayName('');
                    setNewPassword('');
                    setNewRole('sen');
                  });
                }}
              >
                <Text className="text-center text-sm font-bold text-white">{t('adminHub.createAccount')}</Text>
              </Pressable>
            </View>
            <View className="relative mt-1">
              <Ionicons
                name="search-outline"
                size={18}
                color="#B8A990"
                style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
              />
              <TextInput
                className={`${INPUT} pl-10`}
                placeholder={t('adminHub.searchUsers')}
                placeholderTextColor="#B8A990"
                value={userSearch}
                onChangeText={setUserSearch}
                autoCapitalize="none"
              />
            </View>
            <View className="mt-3">
              {filteredAccounts.length === 0 ? <EmptyState message={t('adminConsole.empty')} /> : null}
              {filteredAccounts.map((row) => (
                <Pressable
                  key={row.user_id}
                  className={`${CARD} active:bg-[#FFF8F0]`}
                  onPress={() => onOpenUser(row)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-[#2B1E19]" numberOfLines={1}>
                        {row.display_name || row.login_identifier}
                      </Text>
                      <Text className="mt-1 text-xs text-[#8B7355]" numberOfLines={1}>
                        {row.email ?? row.login_identifier}
                      </Text>
                      <View className="mt-2 self-start">
                        <StatusPill label={t(`account.roles.${row.primary_role}.title`)} tone="amber" />
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#C4B5A5" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {section === 'features' ? (
          <View className="mt-5">
            <AdminFeaturesScreen
              embedded
              flags={featureFlags}
              loading={featureFlagsLoading}
              savingKey={featureFlagSavingKey}
              onToggle={onToggleFeature}
              onLogout={onLogout}
            />
          </View>
        ) : null}

        {section === 'news' ? (
          <View className="mt-5">
            <SectionHeader title={t('adminConsole.nav.news')} count={myAnnouncements.length} />
            <Pressable
              className="mb-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-3.5 active:opacity-90"
              onPress={onOpenCreateNews}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('adminPost.createTitle')}</Text>
            </Pressable>
            {myAnnouncements.length === 0 ? <EmptyState message={t('adminConsole.empty')} /> : null}
            {myAnnouncements.map((post) => {
              const published = post.status === 'published';
              return (
                <View key={post.id} className={CARD}>
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <StatusPill
                      label={listingStatusLabel(post.status)}
                      tone={listingStatusTone(post.status)}
                    />
                  </View>
                  <Text className="font-bold text-[#2B1E19]" numberOfLines={2}>{post.title}</Text>
                  {post.description ? (
                    <Text className="mt-2 text-sm leading-5 text-[#5C4A3A]" numberOfLines={3}>
                      {post.description}
                    </Text>
                  ) : null}
                  {token ? (
                    <ActionRow>
                      <ActionBtn
                        label={published ? t('adminConsole.news.archive') : t('adminConsole.news.publish')}
                        tone={published ? 'ghost' : 'success'}
                        disabled={Boolean(busyKey)}
                        onPress={() =>
                          void runAction(`news-${post.id}`, async () => {
                            await updateAdminAnnouncementPost(token, post.id, {
                              status: published ? 'archived' : 'published',
                            });
                            await onReloadAnnouncements?.();
                          })
                        }
                      />
                    </ActionRow>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {section === 'home' || section === 'users' || section === 'features' ? (
          <Pressable
            className="mt-8 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-[#E8DFD0] bg-white py-3.5 active:bg-[#F8F5F2]"
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#5C4A3A" />
            <Text className="text-sm font-semibold text-[#5C4A3A]">{t('account.menu.logout')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <AdminConsoleNavDrawer
        visible={navOpen}
        activeSection={section}
        anchorTop={menuAnchor?.top}
        anchorRight={menuAnchor?.right}
        onClose={() => setNavOpen(false)}
        onSelect={onSectionChange}
      />

      <AdminRejectBreederModal
        visible={Boolean(rejectBreederId || rejectPostId)}
        variant={rejectPostId ? 'listing' : 'breeder'}
        onClose={() => {
          setRejectBreederId(null);
          setRejectPostId(null);
        }}
        onSubmit={async (payload) => {
          if (rejectBreederId) {
            await onUpdateBreederStatus(rejectBreederId, 'rejected', payload);
            setRejectBreederId(null);
            return;
          }
          if (rejectPostId) {
            await onUpdatePostStatus(rejectPostId, 'archived', payload);
            setRejectPostId(null);
          }
        }}
      />
    </View>
  );
}
