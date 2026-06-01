import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BreederProfile, PetFeedPost, UpsertBreederProfilePayload } from '../types';

const PRIMARY = '#1E6FE8';

type BreederProfileScreenProps = {
  profile: BreederProfile | null;
  posts: PetFeedPost[];
  canCreatePost: boolean;
  onBack: () => void;
  onSaveProfile: (payload: UpsertBreederProfilePayload) => Promise<void>;
  onCreatePost: () => void;
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function BreederProfileScreen({ profile, posts, canCreatePost, onBack, onSaveProfile, onCreatePost }: BreederProfileScreenProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [primarySpecies, setPrimarySpecies] = useState((profile?.primary_species ?? []).join(', '));
  const [mainBreeds, setMainBreeds] = useState((profile?.main_breeds ?? []).join(', '));
  const [careEnvironment, setCareEnvironment] = useState(profile?.care_environment ?? '');
  const [facebook, setFacebook] = useState(String(profile?.contact?.facebook ?? ''));
  const [zalo, setZalo] = useState(String(profile?.contact?.zalo ?? ''));
  const [phone, setPhone] = useState(String(profile?.contact?.phone ?? ''));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setPrimarySpecies((profile?.primary_species ?? []).join(', '));
    setMainBreeds((profile?.main_breeds ?? []).join(', '));
    setCareEnvironment(profile?.care_environment ?? '');
    setFacebook(String(profile?.contact?.facebook ?? ''));
    setZalo(String(profile?.contact?.zalo ?? ''));
    setPhone(String(profile?.contact?.phone ?? ''));
  }, [profile]);

  async function submit() {
    setSubmitting(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        contact: { facebook: facebook.trim(), zalo: zalo.trim(), phone: phone.trim() },
        primarySpecies: splitList(primarySpecies),
        mainBreeds: splitList(mainBreeds),
        careEnvironment: careEnvironment.trim(),
      });
      Alert.alert(t('common.ok'), t('breederProfile.saved'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('breederProfile.saveFailed'), message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View testID="breeder-profile-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="breeder-profile-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('breederProfile.title')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.profileInfo')}</Text>
          {profile?.verification_status ? (
            <Text className="mt-2 text-sm font-semibold text-slate-600">{t(`account.breederRequestStatus.${profile.verification_status}`)}</Text>
          ) : null}
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.displayName')} value={displayName} onChangeText={setDisplayName} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.location')} value={location} onChangeText={setLocation} />
          <TextInput className="mt-3 min-h-[86px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.bio')} multiline textAlignVertical="top" value={bio} onChangeText={setBio} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.primarySpecies')} value={primarySpecies} onChangeText={setPrimarySpecies} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.mainBreeds')} value={mainBreeds} onChangeText={setMainBreeds} />
          <TextInput className="mt-3 min-h-[86px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.careEnvironment')} multiline textAlignVertical="top" value={careEnvironment} onChangeText={setCareEnvironment} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Facebook URL" autoCapitalize="none" value={facebook} onChangeText={setFacebook} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Zalo / phone" keyboardType="phone-pad" value={zalo} onChangeText={setZalo} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Pressable testID="breeder-profile-save-button" className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
            <Text className="text-sm font-bold text-white">{t('breederProfile.save')}</Text>
          </Pressable>
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">{t('breederProfile.myPosts')}</Text>
            {canCreatePost ? (
            <Pressable testID="breeder-profile-create-post-button" className="rounded-full bg-blue-50 px-3 py-2" onPress={onCreatePost}>
              <Text className="text-xs font-bold" style={{ color: PRIMARY }}>{t('breederProfile.createPost')}</Text>
            </Pressable>
            ) : null}
          </View>
          <View className="mt-3 gap-3">
            {posts.length === 0 ? <Text className="text-sm text-slate-500">{t('breederProfile.noPosts')}</Text> : null}
            {posts.map((post) => (
              <View key={post.id} className="rounded-xl bg-slate-50 p-3">
                <Text className="font-bold text-slate-900">{post.title}</Text>
                <Text className="mt-1 text-xs font-semibold text-slate-500">{t(`petFeed.status.${post.status}`)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
