import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const ROLE_OPTIONS: UserRole[] = ['sen', 'breeder', 'admin'];
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

function SectionTitle({ label }: { label: string }) {
  return <Text className="mb-3 text-lg font-bold text-slate-900">{label}</Text>;
}

function MetricTile({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: number;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-[46%] flex-1 rounded-2xl border p-3 ${
        active ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'
      }`}
    >
      <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className="mt-1 text-2xl font-bold text-slate-900">{value}</Text>
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
      className={`rounded-full px-3 py-1.5 ${active ? 'bg-amber-100' : 'bg-slate-100'}`}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-amber-900' : 'text-slate-600'}`}>{label}</Text>
    </Pressable>
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
          ? 'bg-slate-200'
          : 'bg-[#D97706]';
  const text = tone === 'ghost' ? 'text-slate-700' : 'text-white';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 rounded-xl py-2.5 ${cls} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-center text-xs font-bold ${text}`}>{label}</Text>
    </Pressable>
  );
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

  return (
    <View className="flex-1 bg-[#FCFBFA]" testID="admin-console-screen">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BRAND.primary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-slate-900">{t('account.roles.admin.title')}</Text>
            <Text className="mt-1 text-sm text-slate-600">{t(sectionLabel)}</Text>
          </View>
          <View ref={menuRef} collapsable={false}>
            <Pressable
              testID="admin-console-menu-button"
              accessibilityRole="button"
              accessibilityLabel={t('adminConsole.menu')}
              className="h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white active:bg-orange-50"
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
              <Ionicons name="menu-outline" size={22} color="#334155" />
            </Pressable>
          </View>
        </View>

        {section === 'home' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.home.title')} />
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
                onPress={() => onSectionChange('breeders')}
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
                onPress={() => onSectionChange('breeders')}
              />
            </View>
            {account ? (
              <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-slate-900">{account.display_name || account.login_identifier}</Text>
                <Text className="mt-1 text-sm text-slate-500">{account.email ?? account.login_identifier}</Text>
              </View>
            ) : null}
            <Pressable
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-3.5"
              onPress={onOpenCreateNews}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('adminPost.createTitle')}</Text>
            </Pressable>
          </View>
        ) : null}

        {section === 'requests' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.nav.requests')} />
            <View className="mb-3 flex-row flex-wrap gap-2">
              {['all', 'breeder', 'post', 'report', 'farm_review', 'detail', 'appeal', 'feedback', 'scam'].map((key) => (
                <Chip
                  key={key}
                  label={t(`adminConsole.requests.types.${key}`)}
                  active={requestType === key}
                  onPress={() => setRequestType(key)}
                />
              ))}
            </View>
            {queueExtraLoading ? <ActivityIndicator color={BRAND.primary} className="mb-3" /> : null}

            {(requestType === 'all' || requestType === 'breeder')
              && pendingBreeders.map((profile) => (
                <View key={`b-${profile.user_id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">{profile.display_name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{t('adminConsole.requests.types.breeder')}</Text>
                  <View className="mt-3 flex-row gap-2">
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
                  </View>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'post')
              && pendingPosts.map((post) => (
                <View key={`p-${post.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">{post.title}</Text>
                  <AdminHealthEvidencePreview post={post} />
                  <View className="mt-3 flex-row gap-2">
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
                  </View>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'report')
              && openReports.map((report) => (
                <View key={`r-${report.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">{adminReportReasonLabel(t, report.reason)}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{adminReportTargetSubtitle(t, report, posts)}</Text>
                  <View className="mt-3 flex-row gap-2">
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
                  </View>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'farm_review')
              && pendingFarmReviews.map((review) => (
                <View key={`fr-${review.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">
                    {review.breeder_profile?.display_name || review.breeder_profile_id}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {t('adminConsole.requests.types.farm_review')} · {review.rating}*
                  </Text>
                  <View className="mt-3 flex-row gap-2">
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
                  </View>
                </View>
              ))}

            {(requestType === 'all' || requestType === 'detail')
              && submissions
                .filter((s) => s.status === 'pending' || s.status === 'pending_review')
                .map((sub) => (
                  <View key={`s-${sub.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <Text className="font-bold text-slate-900">
                      {sub.breeder_display_name || sub.breeder_profile_id || sub.id}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {t('adminConsole.requests.types.detail')} · {sub.submission_type || 'detail'}
                    </Text>
                    <View className="mt-3 flex-row gap-2">
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
                    </View>
                  </View>
                ))}

            {(requestType === 'all' || requestType === 'appeal')
              && appeals
                .filter((a) => a.status === 'appealed' || a.status === 'pending')
                .map((appeal) => (
                  <View key={`a-${appeal.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <Text className="font-bold text-slate-900">
                      {appeal.breeder_display_name || appeal.breeder_profile_id || appeal.id}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">{t('adminConsole.requests.types.appeal')}</Text>
                    {appeal.appeal_note ? (
                      <Text className="mt-2 text-sm text-slate-600">{appeal.appeal_note}</Text>
                    ) : null}
                    <View className="mt-3 flex-row gap-2">
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
                    </View>
                  </View>
                ))}

            {(requestType === 'all' || requestType === 'feedback' || requestType === 'scam')
              && tickets
                .filter((tkt) => {
                  if (tkt.status !== 'open') return false;
                  if (requestType === 'feedback') return tkt.kind === 'feedback';
                  if (requestType === 'scam') return tkt.kind === 'scam';
                  return tkt.kind === 'feedback' || tkt.kind === 'scam';
                })
                .map((ticket) => (
                  <View key={`t-${ticket.id}`} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <Text className="font-bold text-slate-900">{ticket.subject || ticket.id}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {t(`adminConsole.requests.types.${ticket.kind === 'scam' ? 'scam' : 'feedback'}`)}
                    </Text>
                    {ticket.body ? <Text className="mt-2 text-sm text-slate-600">{ticket.body}</Text> : null}
                    <View className="mt-3 flex-row gap-2">
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
                    </View>
                  </View>
                ))}
          </View>
        ) : null}

        {section === 'listings' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.nav.listings')} />
            <View className="mb-3 flex-row flex-wrap gap-2">
              {LISTING_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`adminConsole.listings.status.${status}`)}
                  active={listingStatus === status}
                  onPress={() => setListingStatus(status)}
                />
              ))}
            </View>
            {filteredListings.length === 0 ? (
              <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminConsole.empty')}</Text>
            ) : null}
            {filteredListings.map((post) => (
              <View key={post.id} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-slate-900">{post.title}</Text>
                <Text className="mt-1 text-xs uppercase text-slate-500">{post.status}</Text>
                <AdminHealthEvidencePreview post={post} />
                <View className="mt-3 flex-row flex-wrap gap-2">
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
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {section === 'breeders' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.nav.breeders')} />
            {breederProfiles.length === 0 ? (
              <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminConsole.empty')}</Text>
            ) : null}
            {breederProfiles.map((profile) => (
              <View key={profile.user_id} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-slate-900">{profile.display_name}</Text>
                <Text className="mt-1 text-xs uppercase text-slate-500">{profile.verification_status}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {(() => {
                    const summary = adminBreederPenaltySummary(profile);
                    return summary.points > 0 || summary.violations > 0
                      ? `${summary.points} pts · ${summary.violations} violations`
                      : '';
                  })()}
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
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
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {section === 'reports' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.nav.reports')} />
            <View className="mb-3 flex-row flex-wrap gap-2">
              {REPORT_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`adminConsole.reports.status.${status}`)}
                  active={reportStatus === status}
                  onPress={() => setReportStatus(status)}
                />
              ))}
            </View>
            {filteredReports.length === 0 ? (
              <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminConsole.empty')}</Text>
            ) : null}
            {filteredReports.map((report) => (
              <View key={report.id} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-slate-900">{adminReportReasonLabel(t, report.reason)}</Text>
                <Text className="mt-1 text-xs text-slate-500">{adminReportTargetSubtitle(t, report, posts)}</Text>
                <Text className="mt-1 text-xs uppercase text-slate-400">{report.status}</Text>
                {report.status === 'open' ? (
                  <View className="mt-3 flex-row gap-2">
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
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {section === 'history' ? (
          <View className="mt-5">
            <SectionTitle label={t('adminConsole.nav.history')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row gap-2">
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
              </View>
            </ScrollView>
            {historyLoading && historyLogs.length === 0 ? (
              <ActivityIndicator color={BRAND.primary} />
            ) : null}
            {historyLogs.map((log) => (
              <View key={log.id} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-slate-900">{log.action}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {log.actor_display_name || log.actor_user_id || '—'} · {log.target_type}
                  {log.target_id ? ` · ${log.target_id}` : ''}
                </Text>
                <Text className="mt-1 text-[11px] text-slate-400">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </Text>
              </View>
            ))}
            {historyCursor ? (
              <Pressable
                className="mt-2 rounded-xl border border-gray-200 bg-white py-3"
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
            <SectionTitle label={t('adminConsole.nav.users')} />
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-sm font-bold text-slate-900">{t('adminHub.createAccount')}</Text>
              <TextInput
                className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('adminReview.accountEmail')}
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
              />
              <TextInput
                className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('adminReview.accountDisplayName')}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
              />
              <TextInput
                className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('login.password')}
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
                className="mt-3 rounded-xl bg-[#D97706] py-3"
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
            <TextInput
              className="mt-4 rounded-xl border border-gray-200 bg-white px-3 py-3 text-slate-900"
              placeholder={t('adminHub.searchUsers')}
              value={userSearch}
              onChangeText={setUserSearch}
            />
            <View className="mt-3 gap-3">
              {filteredAccounts.map((row) => (
                <Pressable
                  key={row.user_id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 active:bg-slate-50"
                  onPress={() => onOpenUser(row)}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-slate-900">{row.display_name || row.login_identifier}</Text>
                      <Text className="mt-1 text-xs text-slate-500">{row.email ?? row.login_identifier}</Text>
                      <Text className="mt-2 text-xs font-bold uppercase text-[#D97706]">
                        {t(`account.roles.${row.primary_role}.title`)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
            <SectionTitle label={t('adminConsole.nav.news')} />
            <Pressable
              className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-3.5"
              onPress={onOpenCreateNews}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('adminPost.createTitle')}</Text>
            </Pressable>
            {myAnnouncements.length === 0 ? (
              <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminConsole.empty')}</Text>
            ) : null}
            {myAnnouncements.map((post) => {
              const published = post.status === 'published';
              return (
                <View key={post.id} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">{post.title}</Text>
                  <Text className="mt-1 text-xs uppercase text-slate-500">{post.status}</Text>
                  {token ? (
                    <View className="mt-3 flex-row gap-2">
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
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <Pressable
          className="mt-8 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5"
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#334155" />
          <Text className="text-sm font-semibold text-slate-700">{t('account.menu.logout')}</Text>
        </Pressable>
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
