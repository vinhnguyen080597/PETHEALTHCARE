import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AccountProfile, BreederProfile, PetFeedPost, PetFeedReport, UserRole } from '../types';

const ROLE_OPTIONS: UserRole[] = ['sen', 'breeder', 'admin'];

type AdminHubScreenProps = {
  accounts: AccountProfile[];
  breederProfiles: BreederProfile[];
  posts: PetFeedPost[];
  reports: PetFeedReport[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onCreateAccount: (payload: { email: string; password: string; displayName: string; primaryRole: UserRole }) => Promise<void>;
  onOpenUser: (account: AccountProfile) => void;
  onUpdateBreederStatus: (userId: string, status: string) => Promise<void>;
  onUpdatePostStatus: (postId: string, status: string) => Promise<void>;
  onUpdateReportStatus: (reportId: string, status: string) => Promise<void>;
};

export function AdminHubScreen({
  accounts,
  breederProfiles,
  posts,
  reports,
  loading,
  onBack,
  onRefresh,
  onCreateAccount,
  onOpenUser,
  onUpdateBreederStatus,
  onUpdatePostStatus,
  onUpdateReportStatus,
}: AdminHubScreenProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'users' | 'moderation'>('users');
  const [search, setSearch] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sen');

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((account) => [account.display_name, account.email, account.login_identifier, account.primary_role].some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [accounts, search]);

  async function handleCreateAccount() {
    await onCreateAccount({
      email: newEmail.trim(),
      password: newPassword,
      displayName: newDisplayName.trim(),
      primaryRole: newRole,
    });
    setNewEmail('');
    setNewDisplayName('');
    setNewPassword('');
  }

  return (
    <View testID="admin-hub-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="admin-hub-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('adminHub.title')}</Text>
        <Pressable className="w-14 items-center rounded-lg p-2" onPress={onRefresh} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#2563eb" /> : <Ionicons name="refresh-outline" size={22} color="#2563eb" />}
        </Pressable>
      </View>

      <View className="mx-5 mt-4 flex-row rounded-xl border border-gray-200 bg-white p-1">
        {(['users', 'moderation'] as const).map((key) => (
          <Pressable key={key} className={`flex-1 rounded-lg py-2.5 ${tab === key ? 'bg-blue-600' : ''}`} onPress={() => setTab(key)}>
            <Text className={`text-center text-xs font-bold ${tab === key ? 'text-white' : 'text-slate-600'}`}>{t(`adminHub.tabs.${key}`)}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {tab === 'users' ? (
          <>
            <Text className="text-base font-bold text-slate-900">{t('adminHub.createAccount')}</Text>
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
              <Pressable className="mt-3 rounded-xl bg-blue-600 py-3" onPress={() => void handleCreateAccount()} disabled={loading}>
                <Text className="text-center text-sm font-bold text-white">{t('adminHub.createAccount')}</Text>
              </Pressable>
            </View>

            <TextInput className="mt-5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-slate-900" placeholder={t('adminHub.searchUsers')} value={search} onChangeText={setSearch} />

            <View className="mt-3 gap-3">
              {filteredAccounts.map((account) => (
                <Pressable key={account.user_id} className="rounded-2xl border border-gray-200 bg-white p-4 active:bg-slate-50" onPress={() => onOpenUser(account)}>
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-slate-900">{account.display_name || account.login_identifier}</Text>
                      <Text className="mt-1 text-xs text-slate-500">{account.email ?? account.login_identifier}</Text>
                      <Text className="mt-2 text-xs font-bold uppercase text-blue-600">{t(`account.roles.${account.primary_role}.title`)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text className="text-base font-bold text-slate-900">{t('adminReview.pendingPosts')}</Text>
            <View className="mt-3 gap-3">
              {posts.length === 0 ? <Text className="rounded-2xl bg-white p-4 text-sm text-slate-500">{t('adminReview.noPendingPosts')}</Text> : null}
              {posts.map((post) => (
                <View key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="text-base font-bold text-slate-900">{post.title}</Text>
                  <Text className="mt-1 text-sm text-slate-600">{[post.species, post.breed, post.location].filter(Boolean).join(' • ')}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable className="flex-1 rounded-xl bg-emerald-600 py-3" onPress={() => void onUpdatePostStatus(post.id, 'published')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.approve')}</Text>
                    </Pressable>
                    <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => void onUpdatePostStatus(post.id, 'archived')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.archive')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.breeders')}</Text>
            <View className="mt-3 gap-3">
              {breederProfiles.filter((p) => p.verification_status === 'pending_review').map((profile) => (
                <View key={profile.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <Text className="font-bold text-slate-900">{profile.display_name}</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Pressable className="min-w-[96px] flex-1 rounded-xl bg-emerald-600 py-3" onPress={() => void onUpdateBreederStatus(profile.user_id, 'verified')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.verify')}</Text>
                    </Pressable>
                    <Pressable className="min-w-[96px] flex-1 rounded-xl bg-amber-600 py-3" onPress={() => void onUpdateBreederStatus(profile.user_id, 'rejected')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.reject')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <Text className="mt-5 text-base font-bold text-slate-900">{t('adminReview.reports')}</Text>
            <View className="mt-3 gap-3">
              {reports.map((report) => (
                <View key={report.id} className="rounded-2xl border border-red-100 bg-white p-4">
                  <Text className="text-sm font-bold text-slate-900">{report.reason}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable className="flex-1 rounded-xl bg-blue-600 py-3" onPress={() => void onUpdateReportStatus(report.id, 'reviewed')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.markReviewed')}</Text>
                    </Pressable>
                    <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => void onUpdateReportStatus(report.id, 'dismissed')}>
                      <Text className="text-center text-xs font-bold text-white">{t('adminReview.dismiss')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
