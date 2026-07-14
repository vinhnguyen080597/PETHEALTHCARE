import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalScreenShell } from '../components/ModalScreenShell';
import { PetFeedPostCard } from '../components/PetFeedPostCard';
import { ApiRequestError } from '../api';
import type { CreatePetFeedPostMedia, CreatePetFeedPostPayload, PetFeedPost, UserRole } from '../types';
import { ACTIVE_PET_FEED_SPECIES } from '../constants/petSpecies';
import { POPULAR_CAT_BREED_KEYS } from '../constants/petBreeds';
import {
  formatPetFeedPriceInputDisplay,
  normalizePetFeedPriceInput,
  petFeedPriceInputFromStored,
  petFeedPriceInputUnit,
} from '../utils/petFeedCurrency';
import { modalBottomInset } from '../utils/modalSafeArea';
import {
  findOversizedPetFeedMedia,
  formatBytesAsMb,
  getLocalUriByteSize,
  optimizePetFeedListThumbUri,
  optimizePetFeedPhotoUri,
  isPetFeedVideoDurationAllowed,
  PET_FEED_VIDEO_MAX_DURATION_SECONDS,
  PET_FEED_VIDEO_MAX_BYTES,
} from '../utils/petFeedMedia';

const PRIMARY = '#1E6FE8';
const MAX_PHOTOS = 6;

type BasicFieldKey = 'title' | 'breed' | 'gender' | 'ageMonths' | 'location' | 'priceNote' | 'photos' | 'video';

type Option = {
  value: string;
  label: string;
};

type CreatePetFeedPostScreenProps = {
  onBack: () => void;
  onSubmit: (payload: CreatePetFeedPostPayload, media: CreatePetFeedPostMedia) => Promise<void>;
  onUpdate?: (postId: string, payload: CreatePetFeedPostPayload, media?: CreatePetFeedPostMedia) => Promise<void>;
  editingPost?: PetFeedPost | null;
  role?: UserRole;
};

function matchOptionValue(options: Option[], stored: string | undefined | null, fallback: string) {
  const value = typeof stored === 'string' ? stored.trim() : '';
  if (!value) return fallback;
  const match = options.find((option) => option.value === value || option.label === value);
  return match?.value ?? fallback;
}

/** Same picker behavior as Add Pet gender select (fade sheet + cancel). */
function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
        className={`flex-row items-center justify-between rounded-xl border bg-slate-50 px-3 py-3 active:bg-slate-100 ${
          error ? 'border-red-400' : 'border-gray-200'
        }`}
        onPress={() => setOpen(true)}
      >
        <Text className={`flex-1 pr-2 text-base font-semibold ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder ?? label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      {error ? <Text className="mt-1.5 text-xs font-medium text-red-600">{error}</Text> : null}
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
            <View
              className="max-h-[70%] rounded-t-2xl bg-white px-4 pt-2"
              style={{ paddingBottom: modalBottomInset(insets.bottom, 16) }}
            >
              <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
              <Text className="mb-1 text-center text-sm font-semibold text-slate-500">{label}</Text>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Text className={`text-center text-base ${active ? 'font-bold text-blue-600' : 'text-slate-900'}`}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable className="mt-2 py-3" onPress={() => setOpen(false)}>
                <Text className="text-center text-base text-blue-600">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
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

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Text className="mb-2 text-xs font-bold uppercase text-slate-500">
      {children}
      {required ? <Text className="text-red-500"> *</Text> : null}
    </Text>
  );
}

export function CreatePetFeedPostScreen({
  onBack,
  onSubmit,
  onUpdate,
  editingPost = null,
  role = 'breeder',
}: CreatePetFeedPostScreenProps) {
  const { t, i18n } = useTranslation();
  const isEditingDraft = Boolean(editingPost?.id);
  const [title, setTitle] = useState(editingPost?.title ?? '');
  const [species, setSpecies] = useState(editingPost?.species || 'cat');
  const [breed, setBreed] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [gender, setGender] = useState('male');
  const [ageMonths, setAgeMonths] = useState(
    editingPost?.age_months != null ? String(editingPost.age_months) : '3',
  );
  const [location, setLocation] = useState(editingPost?.location ?? '');
  const [priceNote, setPriceNote] = useState(() => petFeedPriceInputFromStored(editingPost?.price_note, i18n.language));
  const [description, setDescription] = useState(editingPost?.description ?? '');
  const [personality, setPersonality] = useState<string[]>(editingPost?.personality ?? []);
  const [vaccineStatus, setVaccineStatus] = useState('unknown');
  const [dewormingStatus, setDewormingStatus] = useState('unknown');
  const [paperwork, setPaperwork] = useState<string[]>(editingPost?.paperwork ?? []);
  const [facebook, setFacebook] = useState(editingPost?.contact?.facebook ?? '');
  const [zalo, setZalo] = useState(editingPost?.contact?.zalo ?? '');
  const [phone, setPhone] = useState(editingPost?.contact?.phone ?? '');
  const [photoUris, setPhotoUris] = useState<string[]>(editingPost?.media_urls ?? []);
  const [videoUri, setVideoUri] = useState(editingPost?.video_url ?? '');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'title' | 'breed' | 'gender' | 'ageMonths' | 'location' | 'priceNote' | 'photos' | 'video', string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === 'admin';
  const scrollRef = useRef<ScrollView>(null);
  const basicSectionYRef = useRef(0);
  const mediaSectionYRef = useRef(0);
  const fieldOffsetRef = useRef<Partial<Record<BasicFieldKey, number>>>({});
  const titleInputRef = useRef<TextInput>(null);
  const customBreedInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  const speciesOptions = useMemo<Option[]>(
    () =>
      ACTIVE_PET_FEED_SPECIES.map((value) => ({
        value,
        label: t(`createPetFeedPost.options.species.${value}`),
      })),
    [t],
  );
  const breedOptions = useMemo<Option[]>(
    () =>
      POPULAR_CAT_BREED_KEYS.map((value) => ({
        value,
        label: t(`createPetFeedPost.options.breeds.${value}`),
      })),
    [t],
  );
  const genderOptions = useMemo<Option[]>(() => [
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

  useEffect(() => {
    if (!editingPost) return;
    setGender(matchOptionValue(genderOptions, editingPost.gender, 'male'));
    setVaccineStatus(matchOptionValue(vaccineOptions, editingPost.vaccine_status, 'unknown'));
    setDewormingStatus(matchOptionValue(dewormingOptions, editingPost.deworming_status, 'unknown'));
    if (editingPost.age_months != null && ageOptions.some((option) => option.value === String(editingPost.age_months))) {
      setAgeMonths(String(editingPost.age_months));
    }
    if (editingPost.location) {
      const locationMatch = locationOptions.find(
        (option) => option.value === editingPost.location || option.label === editingPost.location,
      );
      setLocation(locationMatch?.value ?? editingPost.location);
    }
    const storedBreed = editingPost.breed?.trim() ?? '';
    if (storedBreed) {
      const breedMatch = breedOptions.find(
        (option) => option.value === storedBreed || option.label === storedBreed,
      );
      if (breedMatch) {
        setBreed(breedMatch.value);
        setCustomBreed('');
      } else {
        setBreed('other');
        setCustomBreed(storedBreed);
      }
    }
  }, [ageOptions, breedOptions, dewormingOptions, editingPost, genderOptions, locationOptions, vaccineOptions]);

  const selectedGenderLabel = genderOptions.find((option) => option.value === gender)?.label ?? '';
  const selectedBreedLabel =
    breed === 'other'
      ? customBreed.trim() || t('createPetFeedPost.options.breeds.other')
      : breedOptions.find((option) => option.value === breed)?.label ?? '';
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
    breed: selectedBreedLabel,
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
    status: isAdmin ? 'published' : isEditingDraft ? 'draft' : 'pending_review',
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
      newUris.push(await optimizePetFeedPhotoUri(asset.uri));
    }
    setPhotoUris((current) => [...current, ...newUris].slice(0, MAX_PHOTOS));
    clearFieldError('photos');
  }

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: PET_FEED_VIDEO_MAX_DURATION_SECONDS,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    if (!isPetFeedVideoDurationAllowed(asset.duration)) {
      Alert.alert(
        t('createPetFeedPost.submitFailed'),
        t('createPetFeedPost.errors.videoTooLong', { seconds: PET_FEED_VIDEO_MAX_DURATION_SECONDS }),
      );
      return;
    }
    const sizeBytes = asset.fileSize ?? (await getLocalUriByteSize(asset.uri));
    if (sizeBytes != null && sizeBytes > PET_FEED_VIDEO_MAX_BYTES) {
      Alert.alert(
        t('createPetFeedPost.submitFailed'),
        t('createPetFeedPost.errors.videoTooLarge', { size: formatBytesAsMb(sizeBytes) }),
      );
      return;
    }
    setVideoUri(asset.uri);
    clearFieldError('video');
  }

  function markFieldOffset(key: BasicFieldKey, y: number) {
    fieldOffsetRef.current[key] = y;
  }

  function scrollToMissingField(key: BasicFieldKey) {
    const inMedia = key === 'photos' || key === 'video';
    const sectionY = inMedia ? mediaSectionYRef.current : basicSectionYRef.current;
    const fieldY = fieldOffsetRef.current[key] ?? 0;
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionY + fieldY - 12),
      animated: true,
    });
    requestAnimationFrame(() => {
      if (key === 'title') titleInputRef.current?.focus();
      else if (key === 'breed' && breed === 'other') customBreedInputRef.current?.focus();
      else if (key === 'priceNote') priceInputRef.current?.focus();
    });
  }

  function validateForReview(): { message: string; focusKey?: BasicFieldKey } {
    const nextErrors: typeof fieldErrors = {};
    if (!title.trim()) nextErrors.title = t('createPetFeedPost.errors.titleRequired');
    if (!breed || (breed === 'other' && !customBreed.trim())) {
      nextErrors.breed = t('createPetFeedPost.errors.breedRequired');
    }
    if (!gender) nextErrors.gender = t('createPetFeedPost.errors.genderRequired');
    if (!ageMonths) nextErrors.ageMonths = t('createPetFeedPost.errors.ageRequired');
    if (!location.trim()) nextErrors.location = t('createPetFeedPost.errors.locationRequired');
    if (!priceNote.trim() && !canonicalPriceNote.trim()) {
      nextErrors.priceNote = t('createPetFeedPost.errors.priceRequired');
    }
    if (photoUris.length === 0) nextErrors.photos = t('createPetFeedPost.errors.photoRequired');
    if (!videoUri) nextErrors.video = t('createPetFeedPost.errors.videoRequired');
    setFieldErrors(nextErrors);
    const fieldOrder: BasicFieldKey[] = ['title', 'breed', 'gender', 'ageMonths', 'location', 'priceNote', 'photos', 'video'];
    for (const key of fieldOrder) {
      if (nextErrors[key]) {
        return { message: nextErrors[key]!, focusKey: key };
      }
    }
    return { message: '' };
  }

  function openReview() {
    const result = validateForReview();
    if (result.message) {
      if (result.focusKey) scrollToMissingField(result.focusKey);
      return;
    }
    setReviewOpen(true);
  }

  /** Draft = private for breeder only; title is enough (media/fields completed later before Gửi duyệt). */
  function saveDraftFromForm() {
    if (!title.trim()) {
      setFieldErrors((current) => ({ ...current, title: t('createPetFeedPost.errors.titleRequired') }));
      scrollToMissingField('title');
      return;
    }
    void submit('draft');
  }

  function clearFieldError(key: keyof typeof fieldErrors) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function mediaErrorMessage(error: unknown): string {
    const code = error instanceof ApiRequestError ? error.code : null;
    const raw = error instanceof Error ? error.message : '';
    if (
      code === 'MEDIA_TOO_LARGE' ||
      code === 'PET_FEED_VIDEO_TOO_LARGE' ||
      code === 'PET_FEED_PHOTO_TOO_LARGE' ||
      /exceeded the maximum allowed size|EntityTooLarge|too large for storage/i.test(raw)
    ) {
      return t('createPetFeedPost.errors.mediaTooLarge');
    }
    return raw || t('common.unknownError');
  }

  async function submit(status: CreatePetFeedPostPayload['status']) {
    setSubmitting(true);
    try {
      const payload: CreatePetFeedPostPayload = {
        title,
        species,
        breed: selectedBreedLabel,
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
      };

      if (isEditingDraft && editingPost && onUpdate) {
        const nextStatus = status === 'pending_review' ? 'pending_review' : 'draft';
        if (nextStatus === 'pending_review') {
          const result = validateForReview();
          if (result.message) {
            if (result.focusKey) scrollToMissingField(result.focusKey);
            throw new Error(result.message);
          }
        } else if (!title.trim()) {
          throw new Error(t('createPetFeedPost.errors.titleRequired'));
        }

        const optimizedPhotos: string[] = [];
        for (const uri of photoUris) {
          optimizedPhotos.push(/^https?:\/\//i.test(uri) || uri.startsWith('memory://') ? uri : await optimizePetFeedPhotoUri(uri));
        }
        const localForThumb = optimizedPhotos.find((uri) => !/^https?:\/\//i.test(uri) && !uri.startsWith('memory://'));
        const listThumbUri = localForThumb
          ? await optimizePetFeedListThumbUri(localForThumb)
          : undefined;
        const oversized = await findOversizedPetFeedMedia({
          photoUris: optimizedPhotos.filter((uri) => !/^https?:\/\//i.test(uri) && !uri.startsWith('memory://')),
          videoUri: videoUri && !/^https?:\/\//i.test(videoUri) && !videoUri.startsWith('memory://') ? videoUri : null,
        });
        if (oversized?.kind === 'photo') {
          throw new Error(
            t('createPetFeedPost.errors.photoTooLarge', {
              index: oversized.index + 1,
              size: formatBytesAsMb(oversized.sizeBytes),
            }),
          );
        }
        if (oversized?.kind === 'video') {
          throw new Error(
            t('createPetFeedPost.errors.videoTooLarge', {
              size: formatBytesAsMb(oversized.sizeBytes),
            }),
          );
        }

        await onUpdate(
          editingPost.id,
          { ...payload, status: nextStatus },
          {
            photoUris: optimizedPhotos,
            videoUri: videoUri || undefined,
            listThumbUri,
          },
        );
        setReviewOpen(false);
        return;
      }

      const isDraft = status === 'draft';
      if (!isDraft) {
        const result = validateForReview();
        if (result.message) {
          if (result.focusKey) scrollToMissingField(result.focusKey);
          throw new Error(result.message);
        }
      } else if (!title.trim()) {
        throw new Error(t('createPetFeedPost.errors.titleRequired'));
      }

      const optimizedPhotos: string[] = [];
      for (const uri of photoUris) {
        optimizedPhotos.push(await optimizePetFeedPhotoUri(uri));
      }
      const listThumbUri = optimizedPhotos[0]
        ? await optimizePetFeedListThumbUri(optimizedPhotos[0])
        : undefined;
      const oversized = await findOversizedPetFeedMedia({
        photoUris: optimizedPhotos,
        videoUri: videoUri || null,
      });
      if (oversized?.kind === 'photo') {
        throw new Error(
          t('createPetFeedPost.errors.photoTooLarge', {
            index: oversized.index + 1,
            size: formatBytesAsMb(oversized.sizeBytes),
          }),
        );
      }
      if (oversized?.kind === 'video') {
        throw new Error(
          t('createPetFeedPost.errors.videoTooLarge', {
            size: formatBytesAsMb(oversized.sizeBytes),
          }),
        );
      }
      await onSubmit(payload, {
        photoUris: optimizedPhotos,
        videoUri: videoUri || undefined,
        listThumbUri,
      });
      setReviewOpen(false);
    } catch (error: unknown) {
      const failTitle = status === 'draft' ? t('createPetFeedPost.draftSaveFailed') : t('createPetFeedPost.submitFailed');
      Alert.alert(failTitle, mediaErrorMessage(error));
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
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">
          {isEditingDraft ? t('createPetFeedPost.editDraftTitle') : t('createPetFeedPost.title')}
        </Text>
        <View className="w-14" />
      </View>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm leading-5 text-amber-900">
            {isAdmin ? t('createPetFeedPost.adminReviewNote') : t('createPetFeedPost.reviewNote')}
          </Text>
        </View>

        <View
          className="mt-4 rounded-2xl border border-gray-200 bg-white p-4"
          onLayout={(event) => {
            basicSectionYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="mb-1 text-base font-bold text-slate-900">{t('createPetFeedPost.basicInfo')}</Text>
          <Text className="mb-3 text-xs leading-5 text-slate-500">{t('createPetFeedPost.basicInfoRequiredHint')}</Text>
          <View onLayout={(event) => markFieldOffset('title', event.nativeEvent.layout.y)}>
            <FieldLabel required>{t('createPetFeedPost.postTitle')}</FieldLabel>
            <TextInput
              ref={titleInputRef}
              className={`mb-1 rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${
                fieldErrors.title ? 'border-red-400' : 'border-gray-200'
              }`}
              placeholder={t('createPetFeedPost.postTitle')}
              value={title}
              onChangeText={(value) => {
                clearFieldError('title');
                setTitle(value);
              }}
            />
            {fieldErrors.title ? <Text className="mb-3 text-xs font-medium text-red-600">{fieldErrors.title}</Text> : <View className="mb-3" />}
          </View>
          {speciesOptions.length > 1 ? (
            <SelectField required label={t('createPetFeedPost.species')} value={species} options={speciesOptions} onChange={setSpecies} />
          ) : null}
          <View onLayout={(event) => markFieldOffset('breed', event.nativeEvent.layout.y)}>
            <SelectField
              required
              label={t('createPetFeedPost.breed')}
              value={breed}
              options={breedOptions}
              placeholder={t('createPetFeedPost.selectBreed')}
              error={fieldErrors.breed}
              onChange={(value) => {
                clearFieldError('breed');
                setBreed(value);
                if (value !== 'other') setCustomBreed('');
              }}
            />
            {breed === 'other' ? (
              <TextInput
                ref={customBreedInputRef}
                className={`mb-3 rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${
                  fieldErrors.breed ? 'border-red-400' : 'border-gray-200'
                }`}
                placeholder={t('createPetFeedPost.breedOtherPlaceholder')}
                value={customBreed}
                onChangeText={(value) => {
                  clearFieldError('breed');
                  setCustomBreed(value);
                }}
              />
            ) : null}
          </View>
          <View onLayout={(event) => markFieldOffset('gender', event.nativeEvent.layout.y)}>
            <SelectField
              required
              label={t('createPetFeedPost.gender')}
              value={gender}
              options={genderOptions}
              error={fieldErrors.gender}
              onChange={(value) => {
                clearFieldError('gender');
                setGender(value);
              }}
            />
          </View>
          <View onLayout={(event) => markFieldOffset('ageMonths', event.nativeEvent.layout.y)}>
            <SelectField
              required
              label={t('createPetFeedPost.ageMonths')}
              value={ageMonths}
              options={ageOptions}
              error={fieldErrors.ageMonths}
              onChange={(value) => {
                clearFieldError('ageMonths');
                setAgeMonths(value);
              }}
            />
          </View>
          <View onLayout={(event) => markFieldOffset('location', event.nativeEvent.layout.y)}>
            <SelectField
              required
              label={t('createPetFeedPost.location')}
              value={location}
              options={locationOptions}
              placeholder={t('createPetFeedPost.selectLocation')}
              error={fieldErrors.location}
              onChange={(value) => {
                clearFieldError('location');
                setLocation(value);
              }}
            />
          </View>
          <View onLayout={(event) => markFieldOffset('priceNote', event.nativeEvent.layout.y)}>
            <FieldLabel required>{t('createPetFeedPost.priceNote', { unit: priceUnit })}</FieldLabel>
            <TextInput
              ref={priceInputRef}
              className={`rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${
                fieldErrors.priceNote ? 'border-red-400' : 'border-gray-200'
              }`}
              placeholder={t('createPetFeedPost.pricePlaceholder', { unit: priceUnit })}
              value={priceNote}
              onChangeText={(value) => {
                clearFieldError('priceNote');
                setPriceNote(formatPetFeedPriceInputDisplay(value, i18n.language));
              }}
              keyboardType="number-pad"
            />
            {fieldErrors.priceNote ? <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.priceNote}</Text> : null}
          </View>
        </View>

        <View
          className="mt-4 rounded-2xl border border-gray-200 bg-white p-4"
          onLayout={(event) => {
            mediaSectionYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="mb-3 text-base font-bold text-slate-900">{t('createPetFeedPost.mediaSection')}</Text>
          {isEditingDraft ? (
            <Text className="mb-3 text-sm leading-5 text-slate-500">{t('createPetFeedPost.draftMediaHint')}</Text>
          ) : (
            <Text className="mb-3 text-sm leading-5 text-slate-500">{t('createPetFeedPost.mediaHint')}</Text>
          )}
          <View onLayout={(event) => markFieldOffset('photos', event.nativeEvent.layout.y)}>
            <Pressable
              className={`flex-row items-center justify-center gap-2 rounded-xl border border-dashed py-3 active:opacity-80 ${
                fieldErrors.photos ? 'border-red-400 bg-red-50' : 'border-blue-300 bg-blue-50'
              }`}
              onPress={pickPhotos}
            >
              <Ionicons name="images-outline" size={18} color={fieldErrors.photos ? '#dc2626' : PRIMARY} />
              <Text className={`text-sm font-bold ${fieldErrors.photos ? 'text-red-600' : 'text-blue-700'}`}>
                {t('createPetFeedPost.pickPhotos', { count: photoUris.length, max: MAX_PHOTOS })}
              </Text>
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
            {fieldErrors.photos ? <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.photos}</Text> : null}
          </View>
          <View onLayout={(event) => markFieldOffset('video', event.nativeEvent.layout.y)}>
            <Pressable
              className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed py-3 active:opacity-80 ${
                fieldErrors.video ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'
              }`}
              onPress={pickVideo}
            >
              <Ionicons
                name={videoUri ? 'videocam' : 'videocam-outline'}
                size={18}
                color={fieldErrors.video ? '#dc2626' : videoUri ? PRIMARY : '#64748b'}
              />
              <Text
                className={`text-sm font-bold ${
                  fieldErrors.video ? 'text-red-600' : videoUri ? 'text-blue-700' : 'text-slate-600'
                }`}
              >
                {videoUri ? t('createPetFeedPost.videoSelected') : t('createPetFeedPost.pickVideo')}
              </Text>
            </Pressable>
            {fieldErrors.video ? <Text className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.video}</Text> : null}
            {videoUri ? (
              <Pressable className="mt-2 self-start active:opacity-80" onPress={() => setVideoUri('')}>
                <Text className="text-sm font-bold text-red-600">{t('createPetFeedPost.removeVideo')}</Text>
              </Pressable>
            ) : null}
          </View>
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
          {!isAdmin ? (
            <Pressable
              testID="create-pet-feed-post-save-draft-button"
              className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 active:bg-blue-100"
              onPress={saveDraftFromForm}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color={PRIMARY} /> : <Ionicons name="document-outline" size={18} color={PRIMARY} />}
              <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('createPetFeedPost.saveDraft')}</Text>
            </Pressable>
          ) : null}
          <Pressable testID="create-pet-feed-post-review-button" className={`${isAdmin ? 'mt-4' : 'mt-3'} flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90`} onPress={openReview} disabled={submitting}>
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">{t('createPetFeedPost.review')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ModalScreenShell
        visible={reviewOpen}
        title={t('createPetFeedPost.review')}
        closeLabel={t('common.cancel')}
        closeIconName="close"
        onClose={() => setReviewOpen(false)}
        scrollPaddingBottom={160}
        footer={(
          <View className="px-4 pt-4">
            <Pressable className="mb-3 rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50" onPress={() => setReviewOpen(false)} disabled={submitting}>
              <Text className="text-center text-sm font-bold text-slate-700">{t('createPetFeedPost.edit')}</Text>
            </Pressable>
            {!isAdmin ? (
              <Pressable
                testID="create-pet-feed-post-review-save-draft-button"
                className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 active:bg-blue-100"
                onPress={() => void submit('draft')}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color={PRIMARY} /> : <Ionicons name="document-outline" size={18} color={PRIMARY} />}
                <Text className="text-sm font-bold" style={{ color: PRIMARY }}>{t('createPetFeedPost.saveDraft')}</Text>
              </Pressable>
            ) : null}
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
        )}
      >
        <PetFeedPostCard post={previewPost} showFavorite={false} showContact={false} showReport={false} testID="create-pet-feed-post-preview-card" />
      </ModalScreenShell>
    </View>
  );
}
