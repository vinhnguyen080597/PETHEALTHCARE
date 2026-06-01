import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CreatePetFeedPostPayload } from '../types';

type CreatePetFeedPostScreenProps = {
  onBack: () => void;
  onSubmit: (payload: CreatePetFeedPostPayload) => Promise<void>;
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function CreatePetFeedPostScreen({ onBack, onSubmit }: CreatePetFeedPostScreenProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [species, setSpecies] = useState('cat');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [location, setLocation] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [vaccineStatus, setVaccineStatus] = useState('');
  const [dewormingStatus, setDewormingStatus] = useState('');
  const [paperwork, setPaperwork] = useState('');
  const [facebook, setFacebook] = useState('');
  const [zalo, setZalo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        species,
        breed,
        gender,
        ageMonths: ageMonths ? Number(ageMonths) : null,
        location,
        priceNote,
        description,
        personality: splitList(personality),
        vaccineStatus,
        dewormingStatus,
        paperwork: splitList(paperwork),
        contact: { facebook, zalo },
        status: 'pending_review',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      Alert.alert(t('createPetFeedPost.submitFailed'), message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View testID="create-pet-feed-post-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="create-pet-feed-post-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('createPetFeedPost.title')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm leading-5 text-amber-900">{t('createPetFeedPost.reviewNote')}</Text>
        </View>
        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          {[
            [t('createPetFeedPost.postTitle'), title, setTitle],
            [t('createPetFeedPost.species'), species, setSpecies],
            [t('createPetFeedPost.breed'), breed, setBreed],
            [t('createPetFeedPost.gender'), gender, setGender],
            [t('createPetFeedPost.ageMonths'), ageMonths, setAgeMonths],
            [t('createPetFeedPost.location'), location, setLocation],
            [t('createPetFeedPost.priceNote'), priceNote, setPriceNote],
            [t('createPetFeedPost.personality'), personality, setPersonality],
            [t('createPetFeedPost.vaccineStatus'), vaccineStatus, setVaccineStatus],
            [t('createPetFeedPost.dewormingStatus'), dewormingStatus, setDewormingStatus],
            [t('createPetFeedPost.paperwork'), paperwork, setPaperwork],
            ['Facebook URL', facebook, setFacebook],
            ['Zalo', zalo, setZalo],
          ].map(([placeholder, value, setter]) => (
            <TextInput
              key={String(placeholder)}
              className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
              placeholder={String(placeholder)}
              value={String(value)}
              onChangeText={setter as (value: string) => void}
            />
          ))}
          <TextInput
            className="min-h-[110px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('createPetFeedPost.description')}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          <Pressable testID="create-pet-feed-post-submit-button" className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={18} color="#fff" />}
            <Text className="text-sm font-bold text-white">{t('createPetFeedPost.submit')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
