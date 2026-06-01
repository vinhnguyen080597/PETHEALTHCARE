import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PetFeedPost, PetFeedReport } from '../types';

type AdminReviewScreenProps = {
  posts: PetFeedPost[];
  reports: PetFeedReport[];
  onBack: () => void;
  onLoad: (adminSecret: string) => Promise<void>;
  onUpdateStatus: (adminSecret: string, postId: string, status: string) => Promise<void>;
};

export function AdminReviewScreen({ posts, reports, onBack, onLoad, onUpdateStatus }: AdminReviewScreenProps) {
  const { t } = useTranslation();
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      await onLoad(adminSecret.trim());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminReview.loadFailed'), message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(postId: string, status: string) {
    setLoading(true);
    try {
      await onUpdateStatus(adminSecret.trim(), postId, status);
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
          <Text className="text-sm leading-5 text-slate-600">{t('adminReview.secretNote')}</Text>
          <TextInput
            className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('adminReview.secretPlaceholder')}
            secureTextEntry
            value={adminSecret}
            onChangeText={setAdminSecret}
          />
          <Pressable testID="admin-review-load-button" className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={load} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="refresh-outline" size={18} color="#fff" />}
            <Text className="text-sm font-bold text-white">{t('adminReview.load')}</Text>
          </Pressable>
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
                <Pressable className="flex-1 rounded-xl bg-emerald-600 py-3" onPress={() => updateStatus(post.id, 'published')}>
                  <Text className="text-center text-xs font-bold text-white">{t('adminReview.approve')}</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-xl bg-slate-700 py-3" onPress={() => updateStatus(post.id, 'archived')}>
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
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
