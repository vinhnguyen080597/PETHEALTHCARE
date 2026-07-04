import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminPostCard } from '../components/AdminPostCard';
import { ModalScreenShell } from '../components/ModalScreenShell';
import type { AnnouncementCategory, CreateAnnouncementPostMedia, CreateAnnouncementPostPayload, PetFeedPost } from '../types';

type CreateAdminPostScreenProps = {
  onBack: () => void;
  onSubmit: (payload: CreateAnnouncementPostPayload, media: CreateAnnouncementPostMedia) => Promise<void>;
};

const CATEGORIES: AnnouncementCategory[] = ['app_update', 'health_tip', 'community', 'general'];

export function CreateAdminPostScreen({ onBack, onSubmit }: CreateAdminPostScreenProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<AnnouncementCategory>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewPost: PetFeedPost = useMemo(() => ({
    id: 'preview',
    user_id: 'preview',
    breeder_profile_id: null,
    title: title.trim() || t('adminPost.previewUntitled'),
    species: 'general',
    breed: '',
    gender: '',
    age_months: null,
    location: '',
    price_note: '',
    description: description.trim() || t('adminPost.previewEmptyBody'),
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: photoUris,
    video_url: videoUri || null,
    contact: {},
    status: 'published',
    post_kind: 'announcement',
    metadata: { category, ctaLabel: ctaLabel.trim(), ctaUrl: ctaUrl.trim(), authorLabel: 'Pet Health Care' },
    breeder_profile: null,
    is_favorited: false,
    created_at: new Date().toISOString(),
  }), [category, ctaLabel, ctaUrl, description, photoUris, t, title, videoUri]);

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6 - photoUris.length,
      quality: 0.85,
    });
    if (result.canceled) return;
    setPhotoUris((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, 6));
  }

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setVideoUri(result.assets[0].uri);
  }

  function validate() {
    if (!title.trim()) return t('adminPost.errors.titleRequired');
    if (!description.trim()) return t('adminPost.errors.descriptionRequired');
    return '';
  }

  async function publish() {
    const message = validate();
    if (message) {
      Alert.alert(t('adminPost.submitFailed'), message);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
      }, { photoUris, videoUri: videoUri || undefined });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('adminPost.submitFailed'), msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View testID="create-admin-post-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="create-admin-post-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('adminPost.createTitle')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Text className="text-sm leading-5 text-blue-900">{t('adminPost.publishNote')}</Text>
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('adminPost.categoryLabel')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <Pressable key={item} className={`rounded-full px-3 py-2 ${category === item ? 'bg-blue-600' : 'bg-slate-100'}`} onPress={() => setCategory(item)}>
                <Text className={`text-xs font-bold ${category === item ? 'text-white' : 'text-slate-700'}`}>{t(`adminPost.category.${item}`)}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">{t('adminPost.titleLabel')}</Text>
          <TextInput className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" value={title} onChangeText={setTitle} placeholder={t('adminPost.titleLabel')} />
          <Text className="mb-2 text-sm font-semibold text-slate-900">{t('adminPost.bodyLabel')}</Text>
          <TextInput
            className="min-h-[120px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            value={description}
            onChangeText={setDescription}
            placeholder={t('adminPost.bodyLabel')}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('adminPost.mediaLabel')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {photoUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
            ))}
            {photoUris.length < 6 ? (
              <Pressable className="h-[72px] w-[72px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50" onPress={() => void pickPhotos()}>
                <Ionicons name="image-outline" size={22} color="#64748b" />
              </Pressable>
            ) : null}
          </View>
          <Pressable className="mt-3 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" onPress={() => void pickVideo()}>
            <Ionicons name="videocam-outline" size={18} color="#64748b" />
            <Text className="text-sm text-slate-700">{videoUri ? t('adminPost.videoSelected') : t('adminPost.videoOptional')}</Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('adminPost.ctaLabel')}</Text>
          <TextInput className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" value={ctaLabel} onChangeText={setCtaLabel} placeholder={t('adminPost.ctaButtonPlaceholder')} />
          <TextInput className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" value={ctaUrl} onChangeText={setCtaUrl} placeholder={t('adminPost.ctaUrlPlaceholder')} autoCapitalize="none" />
        </View>

        <Pressable className="mt-4 rounded-xl border border-slate-200 bg-white py-3.5 active:bg-slate-50" onPress={() => { const msg = validate(); if (msg) Alert.alert(t('adminPost.submitFailed'), msg); else setReviewOpen(true); }}>
          <Text className="text-center text-sm font-bold text-slate-700">{t('adminPost.preview')}</Text>
        </Pressable>
        <Pressable className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 active:opacity-90" onPress={() => void publish()} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
          <Text className="text-sm font-bold text-white">{t('adminPost.publish')}</Text>
        </Pressable>
      </ScrollView>

      <ModalScreenShell
        visible={reviewOpen}
        title={t('adminPost.preview')}
        closeLabel={t('common.cancel')}
        closeIconName="close"
        onClose={() => setReviewOpen(false)}
        scrollPaddingHorizontal={20}
      >
        <AdminPostCard post={previewPost} />
      </ModalScreenShell>
    </View>
  );
}
