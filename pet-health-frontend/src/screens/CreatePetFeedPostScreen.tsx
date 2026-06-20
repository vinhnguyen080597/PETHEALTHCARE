import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import type { CreatePetFeedPostMedia, CreatePetFeedPostPayload, PetFeedPost, UserRole } from '../types';
import { ACTIVE_PET_FEED_SPECIES } from '../constants/petSpecies';
import { normalizePetFeedPriceInput, petFeedPriceInputUnit } from '../utils/petFeedCurrency';

const PRIMARY = '#1E6FE8';
const MAX_PHOTOS = 6;

type Option = {
  value: string;
  label: string;
};

type CreatePetFeedPostScreenProps = {
  onBack: () => void;
  onSubmit: (payload: CreatePetFeedPostPayload, media: CreatePetFeedPostMedia) => Promise<void>;
  role?: UserRole;
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 active:bg-slate-100"
        onPress={() => setOpen(true)}
      >
        <Text className="text-base font-semibold text-slate-900">{selected?.label ?? label}</Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-slate-950/40" onPress={() => setOpen(false)}>
          <View className="rounded-t-3xl bg-white p-5" onStartShouldSetResponder={() => true}>
            <Text className="mb-3 text-lg font-bold text-slate-900">{label}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  className={`mb-2 flex-row items-center justify-between rounded-xl px-3 py-3 ${active ? 'bg-blue-50' : 'bg-slate-50'}`}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text className={`text-base font-semibold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{option.label}</Text>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={PRIMARY} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChipMultiSelect({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: Option[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }
  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              className={`rounded-full border px-3 py-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'}`}
              onPress={() => toggle(option.value)}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{children}</Text>;
}

export function CreatePetFeedPostScreen({ onBack, onSubmit, role = 'breeder' }: CreatePetFeedPostScreenProps) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [species, setSpecies] = useState('cat');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('unknown');
  const [ageMonths, setAgeMonths] = useState('3');
  const [location, setLocation] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [vaccineStatus, setVaccineStatus] = useState('unknown');
  const [dewormingStatus, setDewormingStatus] = useState('unknown');
  const [paperwork, setPaperwork] = useState<string[]>([]);
  const [facebook, setFacebook] = useState('');
  const [zalo, setZalo] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === 'admin';

  const speciesOptions = useMemo<Option[]>(
    () =>
      ACTIVE_PET_FEED_SPECIES.map((value) => ({
        value,
        label: t(`createPetFeedPost.options.species.${value}`),
      })),
    [t],
  );
  const genderOptions = useMemo<Option[]>(() => [
    { value: 'unknown', label: t('createPetFeedPost.options.gender.unknown') },
    { value: 'male', label: t('createPetFeedPost.options.gender.male') },
    { value: 'female', label: t('createPetFeedPost.options.gender.female') },
  ], [t]);
  const ageOptions = useMemo<Option[]>(() => [
    { value: '2', label: t('createPetFeedPost.options.age.two') },
    { value: '3', label: t('createPetFeedPost.options.age.three') },
    { value: '6', label: t('createPetFeedPost.options.age.six') },
    { value: '12', label: t('createPetFeedPost.options.age.twelve') },
    { value: '24', label: t('createPetFeedPost.options.age.twentyFour') },
  ], [t]);
  const locationOptions = useMemo<Option[]>(() => [
    { value: '', label: t('createPetFeedPost.options.location.unspecified') },
    { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
    { value: 'Hà Nội', label: 'Hà Nội' },
    { value: 'Đà Nẵng', label: 'Đà Nẵng' },
    { value: 'Cần Thơ', label: 'Cần Thơ' },
    { value: 'Khác', label: t('createPetFeedPost.options.location.other') },
  ], [t]);
  const personalityOptions = useMemo<Option[]>(() => [
    { value: t('createPetFeedPost.options.personality.friendly'), label: t('createPetFeedPost.options.personality.friendly') },
    { value: t('createPetFeedPost.options.personality.calm'), label: t('createPetFeedPost.options.personality.calm') },
    { value: t('createPetFeedPost.options.personality.playful'), label: t('createPetFeedPost.options.personality.playful') },
    { value: t('createPetFeedPost.options.personality.kidFriendly'), label: t('createPetFeedPost.options.personality.kidFriendly') },
    { value: t('createPetFeedPost.options.personality.petFriendly'), label: t('createPetFeedPost.options.personality.petFriendly') },
  ], [t]);
  const vaccineOptions = useMemo<Option[]>(() => [
    { value: 'unknown', label: t('createPetFeedPost.options.vaccine.unknown') },
    { value: t('createPetFeedPost.options.vaccine.notYet'), label: t('createPetFeedPost.options.vaccine.notYet') },
    { value: t('createPetFeedPost.options.vaccine.firstDose'), label: t('createPetFeedPost.options.vaccine.firstDose') },
    { value: t('createPetFeedPost.options.vaccine.basicDone'), label: t('createPetFeedPost.options.vaccine.basicDone') },
    { value: t('createPetFeedPost.options.vaccine.needUpdate'), label: t('createPetFeedPost.options.vaccine.needUpdate') },
  ], [t]);
  const dewormingOptions = useMemo<Option[]>(() => [
    { value: 'unknown', label: t('createPetFeedPost.options.deworming.unknown') },
    { value: t('createPetFeedPost.options.deworming.notYet'), label: t('createPetFeedPost.options.deworming.notYet') },
    { value: t('createPetFeedPost.options.deworming.recent'), label: t('createPetFeedPost.options.deworming.recent') },
    { value: t('createPetFeedPost.options.deworming.due'), label: t('createPetFeedPost.options.deworming.due') },
  ], [t]);
  const paperworkOptions = useMemo<Option[]>(() => [
    { value: t('createPetFeedPost.options.paperwork.vaccineBook'), label: t('createPetFeedPost.options.paperwork.vaccineBook') },
    { value: t('createPetFeedPost.options.paperwork.origin'), label: t('createPetFeedPost.options.paperwork.origin') },
    { value: t('createPetFeedPost.options.paperwork.microchip'), label: t('createPetFeedPost.options.paperwork.microchip') },
    { value: t('createPetFeedPost.options.paperwork.contract'), label: t('createPetFeedPost.options.paperwork.contract') },
  ], [t]);

  const selectedGenderLabel = genderOptions.find((option) => option.value === gender)?.label ?? '';
  const selectedVaccineLabel = vaccineStatus === 'unknown' ? '' : vaccineStatus;
  const selectedDewormingLabel = dewormingStatus === 'unknown' ? '' : dewormingStatus;
  const ageValue = ageMonths ? Number(ageMonths) : null;
  const priceUnit = petFeedPriceInputUnit(i18n.language);
  const canonicalPriceNote = normalizePetFeedPriceInput(priceNote, i18n.language);

  const previewPost: PetFeedPost = {
    id: 'preview',
    user_id: 'preview',
    breeder_profile_id: null,
    title: title.trim() || t('createPetFeedPost.previewUntitled'),
    species,
    breed,
    gender: selectedGenderLabel,
    age_months: ageValue != null && Number.isFinite(ageValue) ? ageValue : null,
    location,
    price_note: canonicalPriceNote,
    description,
    personality,
    vaccine_status: selectedVaccineLabel,
    deworming_status: selectedDewormingLabel,
    paperwork,
    media_urls: photoUris,
    video_url: videoUri || null,
    contact: { facebook, zalo, phone },
    status: isAdmin ? 'published' : 'pending_review',
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: new Date().toISOString(),
  };

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const newUris: string[] = [];
    for (const asset of result.assets) {
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      newUris.push(compressed.uri);
    }
    setPhotoUris((current) => [...current, ...newUris].slice(0, MAX_PHOTOS));
    setValidationMessage('');
  }

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 15,
      quality: 0.75,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setVideoUri(result.assets[0].uri);
    setValidationMessage('');
  }

  function validateForReview() {
    if (!title.trim()) return t('createPetFeedPost.errors.titleRequired');
    if (photoUris.length === 0) return t('createPetFeedPost.errors.photoRequired');
    if (!videoUri) return t('createPetFeedPost.errors.videoRequired');
    return '';
  }

  function openReview() {
    const message = validateForReview();
    setValidationMessage(message);
    if (!message) setReviewOpen(true);
  }

  async function submit(status: CreatePetFeedPostPayload['status']) {
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        species,
        breed,
        gender: selectedGenderLabel,
        ageMonths: ageValue != null && Number.isFinite(ageValue) ? ageValue : null,
        location,
        priceNote: canonicalPriceNote,
        description,
        personality,
        vaccineStatus: selectedVaccineLabel,
        dewormingStatus: selectedDewormingLabel,
        paperwork,
        contact: { facebook, zalo, phone },
        status,
      }, { photoUris, videoUri });
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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm leading-5 text-amber-900">
            {isAdmin ? t('createPetFeedPost.adminReviewNote') : t('createPetFeedPost.reviewNote')}
          </Text>
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('createPetFeedPost.basicInfo')}</Text>
          <FieldLabel>{t('createPetFeedPost.postTitle')}</FieldLabel>
          <TextInput
            className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('createPetFeedPost.postTitle')}
            value={title}
            onChangeText={setTitle}
          />
          {speciesOptions.length > 1 ? (
            <SelectField label={t('createPetFeedPost.species')} value={species} options={speciesOptions} onChange={setSpecies} />
          ) : null}
          <FieldLabel>{t('createPetFeedPost.breed')}</FieldLabel>
          <TextInput
            className="mb-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('createPetFeedPost.breed')}
            value={breed}
            onChangeText={setBreed}
          />
          <SelectField label={t('createPetFeedPost.gender')} value={gender} options={genderOptions} onChange={setGender} />
          <SelectField label={t('createPetFeedPost.ageMonths')} value={ageMonths} options={ageOptions} onChange={setAgeMonths} />
          <SelectField label={t('createPetFeedPost.location')} value={location} options={locationOptions} onChange={setLocation} />
          <FieldLabel>{t('createPetFeedPost.priceNote', { unit: priceUnit })}</FieldLabel>
          <TextInput
            className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('createPetFeedPost.pricePlaceholder', { unit: priceUnit })}
            value={priceNote}
            onChangeText={setPriceNote}
            keyboardType="decimal-pad"
          />
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('createPetFeedPost.mediaSection')}</Text>
          <Text className="mb-3 text-sm leading-5 text-slate-500">{t('createPetFeedPost.mediaHint')}</Text>
          <Pressable className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 py-3 active:opacity-80" onPress={pickPhotos}>
            <Ionicons name="images-outline" size={18} color={PRIMARY} />
            <Text className="text-sm font-bold text-blue-700">{t('createPetFeedPost.pickPhotos', { count: photoUris.length, max: MAX_PHOTOS })}</Text>
          </Pressable>
          {photoUris.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
                  <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
                  <Pressable
                    className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1"
                    onPress={() => setPhotoUris((current) => current.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 active:opacity-80" onPress={pickVideo}>
            <Ionicons name={videoUri ? 'videocam' : 'videocam-outline'} size={18} color={videoUri ? PRIMARY : '#64748b'} />
            <Text className={`text-sm font-bold ${videoUri ? 'text-blue-700' : 'text-slate-600'}`}>
              {videoUri ? t('createPetFeedPost.videoSelected') : t('createPetFeedPost.pickVideo')}
            </Text>
          </Pressable>
          {videoUri ? (
            <Pressable className="mt-2 self-start active:opacity-80" onPress={() => setVideoUri('')}>
              <Text className="text-sm font-bold text-red-600">{t('createPetFeedPost.removeVideo')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('createPetFeedPost.careInfo')}</Text>
          <ChipMultiSelect label={t('createPetFeedPost.personality')} values={personality} options={personalityOptions} onChange={setPersonality} />
          <SelectField label={t('createPetFeedPost.vaccineStatus')} value={vaccineStatus} options={vaccineOptions} onChange={setVaccineStatus} />
          <SelectField label={t('createPetFeedPost.dewormingStatus')} value={dewormingStatus} options={dewormingOptions} onChange={setDewormingStatus} />
          <ChipMultiSelect label={t('createPetFeedPost.paperwork')} values={paperwork} options={paperworkOptions} onChange={setPaperwork} />
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-base font-bold text-slate-900">{t('createPetFeedPost.descriptionAndContact')}</Text>
          <TextInput
            className="min-h-[110px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('createPetFeedPost.description')}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Facebook URL" value={facebook} onChangeText={setFacebook} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Zalo" value={zalo} onChangeText={setZalo} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {validationMessage ? <Text className="mt-3 text-sm font-semibold text-red-600">{validationMessage}</Text> : null}
          <Pressable testID="create-pet-feed-post-review-button" className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={openReview}>
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('createPetFeedPost.review')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={reviewOpen} animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <View className="flex-1 bg-[#F2F4F8]">
          <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
            <Pressable className="w-14 rounded-lg p-2" onPress={() => setReviewOpen(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </Pressable>
            <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('createPetFeedPost.review')}</Text>
            <View className="w-14" />
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}>
            <PetFeedPostCard post={previewPost} showFavorite={false} showContact={false} showReport={false} testID="create-pet-feed-post-preview-card" />
          </ScrollView>
          <View className="border-t border-gray-200 bg-white p-4">
            <Pressable className="mb-3 rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50" onPress={() => setReviewOpen(false)}>
              <Text className="text-center text-sm font-bold text-slate-700">{t('createPetFeedPost.edit')}</Text>
            </Pressable>
            <Pressable
              testID="create-pet-feed-post-submit-button"
              className="flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
              onPress={() => void submit(isAdmin ? 'published' : 'pending_review')}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name={isAdmin ? 'cloud-upload-outline' : 'send-outline'} size={18} color="#fff" />}
              <Text className="text-sm font-bold text-white">{isAdmin ? t('createPetFeedPost.publish') : t('createPetFeedPost.submit')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
