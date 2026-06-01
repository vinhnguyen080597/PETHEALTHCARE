import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AccountProfile, AdminCreateAccountPayload, AdminUpdateAccountPayload, BreederProfile, PetFeedPost, PetFeedReport, UserRole } from '../types';

type AdminReviewScreenProps = {
  accounts: AccountProfile[];
  breederProfiles: BreederProfile[];
  posts: PetFeedPost[];
  reports: PetFeedReport[];
  onBack: () => void;
  onLoad: () => Promise<void>;
  onCreateAccount: (payload: AdminCreateAccountPayload) => Promise<void>;
  onUpdateAccount: (userId: string, payload: AdminUpdateAccountPayload) => Promise<void>;
  onUpdateBreederStatus: (userId: string, verificationStatus: string) => Promise<void>;
  onUpdateStatus: (postId: string, status: string) => Promise<void>;
  onUpdateReportStatus: (reportId: string, status: string) => Promise<void>;
};

const ROLE_OPTIONS: UserRole[] = ['sen', 'breeder', 'admin', 'vet'];
const BREEDER_REVIEW_STATUSES = ['pending_review', 'verified', 'rejected', 'suspended', 'unverified'] as const;

export function AdminReviewScreen({
  accounts,
  breederProfiles,
  posts,
  reports,
  onBack,
  onLoad,
  onCreateAccount,
  onUpdateAccount,
  onUpdateBreederStatus,
  onUpdateStatus,
  onUpdateReportStatus,
}: AdminReviewScreenProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sen');
  const breederGroups = BREEDER_REVIEW_STATUSES.map((status) => ({
    status,
    profiles: breederProfiles.filter((profile) => profile.verification_status === status),
  })).filter((group) => group.profiles.length > 0);

  async function load() {
    setLoading(true);
    try {
      await onLoad();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.loadFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    setLoading(true);
    try {
      await onCreateAccount({ email: newEmail.trim(), password: newPassword, displayName: newDisplayName.trim(), primaryRole: newRole });
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function updateAccount(userId: string, payload: AdminUpdateAccountPayload) {
    setLoading(true);
    try {
      await onUpdateAccount(userId, payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function updateBreederStatus(userId: string, status: string) {
    setLoading(true);
    try {
      await onUpdateBreederStatus(userId, status);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePostStatus(postId: string, status: string) {
    setLoading(true);
    try {
      await onUpdateStatus(postId, status);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, status: string) {
    setLoading(true);
    try {
      await onUpdateReportStatus(reportId, status);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.updateFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View testID="admin-review-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="admin-review-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('adminReview.title')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm leading-5 text-slate-600">{t('adminReview.roleNote')}</Text>
          <Pressable testID="admin-review-load-button" className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="refresh-outline" size={18} color="#fff" />}
            <Text className="text-sm font-bold text-white">{t('adminReview.load')}</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.createAccount')}</Text>
        <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
          <TextInput className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('adminReview.accountEmail')} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('adminReview.accountDisplayName')} value={newDisplayName} onChangeText={setNewDisplayName} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('login.password')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <View className="mt-3 flex-row flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <Pressable key={role} className={`rounded-full px-3 py-2 ${newRole === role ? 'bg-blue-600' : 'bg-slate-100'}`} onPress={() => setNewRole(role)}>
                <Text className={`text-xs font-bold ${newRole === role ? 'text-white' : 'text-slate-700'}`}>{t(`account.roles.${role}.title`)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable className="mt-3 rounded-xl bg-blue-600 py-3" onPress={createAccount} disabled={loading}>
            <Text className="text-center text-sm font-bold text-white">{t('adminReview.createAccount')}</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.accounts')}</Text>
        <View className="mt-3 gap-3">
          {accounts.map((account) => (
            <View key={account.user_id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="font-bold text-slate-900">{account.display_name || account.login_identifier || account.email}</Text>
              <Text className="mt-1 text-xs text-slate-500">{account.email ?? account.login_identifier}</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <Pressable key={role} className={`rounded-full px-3 py-2 ${account.primary_role === role ? 'bg-blue-600' : 'bg-slate-100'}`} onPress={() => updateAccount(account.user_id, { primaryRole: role })}>
                    <Text className={`text-xs font-bold ${account.primary_role === role ? 'text-white' : 'text-slate-700'}`}>{t(`account.roles.${role}.title`)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.breeders')}</Text>
        <View className="mt-3 gap-3">
          {breederProfiles.length === 0 ? <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminReview.noBreeders')}</Text> : null}
          {breederGroups.map((group) => (
            <View key={group.status} className="gap-3">
              <Text className="text-xs font-bold uppercase text-slate-500">{t(`account.breederRequestStatus.${group.status}`)}</Text>
              {group.profiles.map((profile) => (
            <View key={profile.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="font-bold text-slate-900">{profile.display_name}</Text>
              <Text className="mt-1 text-xs text-slate-500">{[profile.location, t(`account.breederRequestStatus.${profile.verification_status}`)].filter(Boolean).join(' • ')}</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-700">{profile.bio}</Text>
              <View className="mt-3 flex-row gap-2">
                <Pressable className="flex-1 rounded-xl bg-emerald-600 py-3" onPress={() => updateBreederStatus(profile.user_id, 'verified')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.verify')}</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-amber-600 py-3" onPress={() => updateBreederStatus(profile.user_id, 'rejected')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.reject')}</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => updateBreederStatus(profile.user_id, 'suspended')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.suspend')}</Text>
                </Pressable>
              </View>
            </View>
              ))}
            </View>
          ))}
        </View>

        <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.pendingPosts')}</Text>
        <View className="mt-3 gap-3">
          {posts.length === 0 ? <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminReview.noPendingPosts')}</Text> : null}
          {posts.map((post) => (
            <View key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{post.title}</Text>
              <Text className="mt-1 text-sm text-slate-600">{[post.species, post.breed, post.location].filter(Boolean).join(' • ')}</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-700">{post.description}</Text>
              <View className="mt-3 flex-row gap-2">
                <Pressable className="flex-1 rounded-xl bg-emerald-600 py-3" onPress={() => updatePostStatus(post.id, 'published')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.approve')}</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => updatePostStatus(post.id, 'archived')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.archive')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.reports')}</Text>
        <View className="mt-3 gap-3">
          {reports.length === 0 ? <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminReview.noReports')}</Text> : null}
          {reports.map((report) => (
            <View key={report.id} className="rounded-2xl border border-red-100 bg-white p-4">
              <Text className="text-sm font-bold text-slate-900">{report.reason}</Text>
              <Text className="mt-1 text-xs text-slate-500">{report.post_id}</Text>
              {report.note ? <Text className="mt-2 text-sm leading-5 text-slate-700">{report.note}</Text> : null}
              <View className="mt-3 flex-row gap-2">
                <Pressable className="flex-1 rounded-xl bg-blue-600 py-3" onPress={() => updateReportStatus(report.id, 'reviewed')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.markReviewed')}</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => updateReportStatus(report.id, 'dismissed')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.dismiss')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
