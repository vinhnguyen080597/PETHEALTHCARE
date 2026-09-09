import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_FARM_AVATAR, DEFAULT_FARM_COVER } from '../assets/farmProfileAssets';
import { ACTIVE_BREEDER_SPECIES_OPTIONS } from '../constants/petSpecies';
import { VIETNAM_PROVINCES } from '../constants/vietnamProvinces';
import { APP_LINKS } from '../config';
import type { BreederProfile, UpsertBreederProfilePayload } from '../types';
import { breederProfileSavePublishesImmediately, showAccountBreederStatusBadge } from '../utils/accountBreederStatusBadge';
import {
  hasAllBreederCommitments,
  setBreederCommitmentsAccepted,
} from '../utils/breederCommitments';
import { readBreederFormMetadata } from '../utils/breederFormMetadata';
import {
  breederSpeciesForSave,
  selectPrimarySpecies,
  splitBreederSpeciesForForm,
} from '../utils/breederSpeciesSelection';
import { FarmCoverCropModal, resolveCoverCropSource } from '../components/form/FarmCoverCropModal';
import { FormSelectField } from '../components/form/FormSelectField';
import { resolveProvinceSelection } from '../utils/vietnamProvinceSelection';
import {
  normalizeRegistrationUnitSelection,
  registrationUnitsForSpecies,
  REGISTRATION_UNIT_OTHER,
  splitRegistrationUnitForForm,
} from '../utils/breederRegistrationUnits';
import {
  validateRegisteredKennelFields,
  type RegisteredKennelFieldErrors,
} from '../utils/breederRegisteredKennelValidation';
import { breederFormChipTone } from '../utils/breederFormChips';
import { farmPhotoPickerAspect, farmPhotoResizeWidth, type FarmPhotoKind } from '../utils/farmPhotos';
import type { CoverCropSource } from '../utils/farmCoverCrop';
import {
  farmImageSource,
  resolveFarmAvatarUrl,
  resolveFarmCoverUrl,
} from '../utils/farmProfileDisplay';

const PRIMARY = '#D97706';

type BreederType = 'registered_kennel' | 'home_breeder' | 'rescue_foster' | 'rehoming' | 'other';

const BREEDER_TYPES: BreederType[] = ['registered_kennel', 'home_breeder', 'rescue_foster', 'rehoming', 'other'];
const SPECIES_OPTIONS = [...ACTIVE_BREEDER_SPECIES_OPTIONS];

/** Web BreederProfileForm parity: label + white input + warm border. */
const LABEL_CLASS = 'text-xs font-medium text-[#6E5A51]';
const INPUT_CLASS = 'mt-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm text-[#2B1E19]';

function inputBorderClass(hasError: boolean) {
  return hasError ? 'border-red-400' : 'border-[#F0E6D8]';
}

type BreederFieldErrors = RegisteredKennelFieldErrors & {
  displayName?: string;
  location?: string;
  species?: string;
};

type BreederProfileScreenProps = {
  profile: BreederProfile | null;
  onBack: () => void;
  onSaveProfile: (payload: UpsertBreederProfilePayload) => Promise<void>;
  onUploadPhoto: (kind: FarmPhotoKind, imageUri: string) => Promise<string>;
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function isBreederType(value: string): value is BreederType {
  return (BREEDER_TYPES as readonly string[]).includes(value);
}

export function BreederProfileScreen({ profile, onBack, onSaveProfile, onUploadPhoto }: BreederProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const metadata = profile?.metadata ?? {};
  const formMeta = readBreederFormMetadata(metadata);
  const isEdit = Boolean(profile?.id);
  const scrollRef = useRef<ScrollView>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [location, setLocation] = useState(resolveProvinceSelection(profile?.location ?? ''));
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [primarySpecies, setPrimarySpecies] = useState<string>(
    splitBreederSpeciesForForm(profile?.primary_species ?? []),
  );
  const initialRegistration = splitRegistrationUnitForForm({
    unit: profile?.registration_unit,
    other: profile?.registration_unit_other,
    species: splitBreederSpeciesForForm(profile?.primary_species ?? []),
    legacyMetadataUnit:
      metadataString(metadata, 'registrationUnit') ||
      metadataString(metadata, 'registration_unit'),
  });
  const [mainBreeds, setMainBreeds] = useState((profile?.main_breeds ?? []).join(', '));
  const phone = String(profile?.contact?.phone ?? '');
  const facebook = String(profile?.contact?.facebook ?? '');
  const zalo = String(profile?.contact?.zalo ?? '');
  const [breederType, setBreederType] = useState<BreederType>(
    isBreederType(formMeta.breederType) ? formMeta.breederType : 'home_breeder',
  );
  const [registeredAt, setRegisteredAt] = useState(formMeta.registeredAt);
  const [registrationUnit, setRegistrationUnit] = useState(initialRegistration.registrationUnit);
  const [registrationUnitOther, setRegistrationUnitOther] = useState(
    initialRegistration.registrationUnitOther,
  );
  const [registeredKennelName, setRegisteredKennelName] = useState(formMeta.registeredKennelName);
  const [commitments, setCommitments] = useState<string[]>(formMeta.transparencyCommitments);
  const [avatarUrl, setAvatarUrl] = useState(profile ? resolveFarmAvatarUrl(profile) : null);
  const [coverUrl, setCoverUrl] = useState(profile ? resolveFarmCoverUrl(profile) : null);
  const [photoBusy, setPhotoBusy] = useState<FarmPhotoKind | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [coverCropSource, setCoverCropSource] = useState<CoverCropSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BreederFieldErrors>({});
  const [commitmentsError, setCommitmentsError] = useState('');
  const [submitDialog, setSubmitDialog] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const allCommitmentsAccepted = hasAllBreederCommitments(commitments);
  const screenTitle = useMemo(
    () => t(isEdit ? 'breederProfile.editTitle' : 'breederProfile.createTitle'),
    [isEdit, t],
  );
  const registrationUnitOptions = useMemo(
    () => registrationUnitsForSpecies(primarySpecies),
    [primarySpecies],
  );
  const status = profile?.verification_status ?? '';
  const showStatusBadge =
    Boolean(status) && status !== 'unverified' && showAccountBreederStatusBadge(status);

  useEffect(() => {
    const nextMetadata = profile?.metadata ?? {};
    const nextFormMeta = readBreederFormMetadata(nextMetadata);
    const nextPrimary = splitBreederSpeciesForForm(profile?.primary_species ?? []);
    const nextRegistration = splitRegistrationUnitForForm({
      unit: profile?.registration_unit,
      other: profile?.registration_unit_other,
      species: nextPrimary,
      legacyMetadataUnit:
        metadataString(nextMetadata, 'registrationUnit') ||
        metadataString(nextMetadata, 'registration_unit'),
    });
    setDisplayName(profile?.display_name ?? '');
    setLocation(resolveProvinceSelection(profile?.location ?? ''));
    setBio(profile?.bio ?? '');
    setPrimarySpecies(nextPrimary);
    setMainBreeds((profile?.main_breeds ?? []).join(', '));
    setBreederType(
      isBreederType(nextFormMeta.breederType) ? nextFormMeta.breederType : 'home_breeder',
    );
    setRegisteredAt(nextFormMeta.registeredAt);
    setRegistrationUnit(nextRegistration.registrationUnit);
    setRegistrationUnitOther(nextRegistration.registrationUnitOther);
    setRegisteredKennelName(nextFormMeta.registeredKennelName);
    setCommitments(nextFormMeta.transparencyCommitments);
    setAvatarUrl(profile ? resolveFarmAvatarUrl(profile) : null);
    setCoverUrl(profile ? resolveFarmCoverUrl(profile) : null);
    setPhotoError('');
    setFieldErrors({});
    setCommitmentsError('');
  }, [profile]);

  async function uploadPickedPhoto(kind: FarmPhotoKind, imageUri: string) {
    setPhotoBusy(kind);
    setPhotoError('');
    try {
      const resized =
        kind === 'cover'
          ? { uri: imageUri }
          : await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: farmPhotoResizeWidth(kind) } }],
              { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
            );
      const publicUrl = await onUploadPhoto(kind, resized.uri);
      if (kind === 'avatar') setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);
    } catch (error: unknown) {
      setPhotoError(error instanceof Error ? error.message : t('breederProfile.uploadFailed'));
    } finally {
      setPhotoBusy(null);
    }
  }

  async function pickAndUploadPhoto(kind: FarmPhotoKind) {
    if (photoBusy || submitting) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('alerts.permissionGallery.title'), t('alerts.permissionGallery.message'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: kind === 'avatar',
      aspect: kind === 'avatar' ? farmPhotoPickerAspect('avatar') : undefined,
      quality: kind === 'avatar' ? 0.85 : 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    if (kind === 'cover') {
      try {
        setCoverCropSource(await resolveCoverCropSource(result.assets[0]));
      } catch {
        setPhotoError(t('breederProfile.coverCropFailed'));
      }
      return;
    }

    await uploadPickedPhoto(kind, result.assets[0].uri);
  }

  function clearFieldError(key: keyof BreederFieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit() {
    const nextErrors: BreederFieldErrors = {};
    if (!displayName.trim()) {
      nextErrors.displayName = t('breederProfile.errors.displayNameRequired');
    }
    if (!location.trim()) {
      nextErrors.location = t('breederProfile.errors.locationRequired');
    }
    if (!primarySpecies.trim()) {
      nextErrors.species = t('breederProfile.errors.speciesRequired');
    }
    Object.assign(
      nextErrors,
      validateRegisteredKennelFields(
        {
          breederType,
          registrationUnit,
          registrationUnitOther,
          registeredKennelName,
          registeredAt,
        },
        {
          registrationUnitRequired: t('breederProfile.errors.registrationUnitRequired'),
          registrationUnitOtherRequired: t('breederProfile.errors.registrationUnitOtherRequired'),
          registeredKennelNameRequired: t('breederProfile.errors.registeredKennelNameRequired'),
          registeredAtRequired: t('breederProfile.errors.registeredAtRequired'),
        },
      ),
    );
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setCommitmentsError('');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});

    if (!hasAllBreederCommitments(commitments)) {
      setCommitmentsError(t('breederProfile.commitmentsRequired'));
      return;
    }
    setCommitmentsError('');

    const publishesImmediately = breederProfileSavePublishesImmediately(status);
    setSubmitting(true);
    try {
      const speciesPayload = breederSpeciesForSave(primarySpecies);
      const registrationPayload =
        breederType === 'registered_kennel'
          ? normalizeRegistrationUnitSelection({
              species: primarySpecies,
              unit: registrationUnit,
              other: registrationUnitOther,
            })
          : { registrationUnit: '', registrationUnitOther: '' };
      await onSaveProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        avatarUrl: avatarUrl || undefined,
        contact: { facebook: facebook.trim(), zalo: zalo.trim(), phone: phone.trim() },
        primarySpecies: speciesPayload.primarySpecies,
        registrationUnit: registrationPayload.registrationUnit,
        registrationUnitOther: registrationPayload.registrationUnitOther,
        mainBreeds: splitList(mainBreeds),
        metadata: {
          ...metadata,
          breederType,
          registeredAt: breederType === 'registered_kennel' ? registeredAt.trim() : '',
          registeredKennelName:
            breederType === 'registered_kennel' ? registeredKennelName.trim() : '',
          transparencyCommitments: commitments,
          ...(coverUrl
            ? { cover_url: coverUrl, coverUrl, coverImageUrl: coverUrl }
            : {}),
        },
      });
      setSubmitDialog({
        type: 'success',
        title: t(publishesImmediately ? 'breederProfile.updateSuccessTitle' : 'breederProfile.submitSuccessTitle'),
        message: t(publishesImmediately ? 'breederProfile.updated' : 'breederProfile.saved'),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.unknownError');
      setSubmitDialog({
        type: 'error',
        title: t('breederProfile.saveFailed'),
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const rejectionReason = formMeta.rejectionReason;
  const rejectionAction = formMeta.adminAction;
  const rejectionNote = formMeta.adminNote;

  return (
    <SafeAreaView testID="breeder-profile-screen" style={{ flex: 1, minHeight: 0 }} edges={['top', 'bottom', 'left', 'right']} className="bg-[#FDFBF7]">
      <View className="flex-row items-center border-b border-[#F3E2C8] bg-white px-2 py-2">
        <Pressable testID="breeder-profile-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#2B1E19" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-[#2B1E19]" numberOfLines={1}>
          {screenTitle}
        </Text>
        <View className="w-14" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: Math.max(96, insets.bottom + 72),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <Text className="text-sm leading-5 text-[#5C4A3A]">{t('breederProfile.subtitle')}</Text>

          {showStatusBadge ? (
            <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <Text className="text-xs font-semibold text-amber-900">
                {t(`account.breederRequestStatus.${status}`)}
              </Text>
            </View>
          ) : null}

          {status === 'rejected' && (rejectionReason || rejectionAction || rejectionNote) ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <Text className="text-sm font-bold text-red-900">{t('breederProfile.rejectionBannerTitle')}</Text>
              {rejectionReason ? (
                <Text className="mt-2 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionReason')}: </Text>
                  {rejectionReason}
                </Text>
              ) : null}
              {rejectionAction ? (
                <Text className="mt-1.5 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionAction')}: </Text>
                  {rejectionAction}
                </Text>
              ) : null}
              {rejectionNote ? (
                <Text className="mt-1.5 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionNote')}: </Text>
                  {rejectionNote}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View className="mt-6 rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] p-4">
            <Text className="text-sm font-semibold text-[#2B1E19]">{t('breederProfile.photos')}</Text>
            <Text className="mt-1 text-xs leading-4 text-[#6E5A51]">{t('breederProfile.photosHint')}</Text>

            <View className="mt-4">
              <FieldLabel label={t('breederProfile.cover')} />
              <View className="relative mt-1.5 h-36 overflow-hidden rounded-xl border border-[#F0E6D8] bg-white">
                <Image
                  source={farmImageSource(coverUrl, DEFAULT_FARM_COVER)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                {photoBusy === 'cover' ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/45">
                    <ActivityIndicator color="#fff" />
                    <Text className="mt-2 text-xs font-medium text-white">
                      {t('breederProfile.uploadingPhoto')}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('breederProfile.changePhoto')}
                  disabled={submitting || photoBusy !== null}
                  onPress={() => void pickAndUploadPhoto('cover')}
                  className="absolute bottom-3 right-3 rounded-full border border-amber-200 bg-white/95 px-3 py-1.5"
                  style={{ opacity: submitting || photoBusy !== null ? 0.6 : 1 }}
                >
                  <Text className="text-xs font-semibold text-[#B45309]">{t('breederProfile.changePhoto')}</Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-4 flex-row items-end">
              <View>
                <FieldLabel label={t('breederProfile.avatar')} />
                <View className="relative mt-1.5 h-24 w-24 overflow-hidden rounded-full border-[3px] border-white bg-white">
                  <Image
                    source={farmImageSource(avatarUrl, DEFAULT_FARM_AVATAR)}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  {photoBusy === 'avatar' ? (
                    <View className="absolute inset-0 items-center justify-center rounded-full bg-black/50">
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('breederProfile.changePhoto')}
                disabled={submitting || photoBusy !== null}
                onPress={() => void pickAndUploadPhoto('avatar')}
                className="ml-4 rounded-full border border-amber-200 bg-white px-3 py-1.5"
                style={{ opacity: submitting || photoBusy !== null ? 0.6 : 1 }}
              >
                <Text className="text-xs font-semibold text-[#B45309]">{t('breederProfile.changePhoto')}</Text>
              </Pressable>
            </View>
          </View>

          {photoError ? (
            <View className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <Text className="text-sm leading-5 text-red-600">{photoError}</Text>
            </View>
          ) : null}

          <View className="mt-5">
            <FieldLabel label={t('breederProfile.displayName')} required />
            <TextInput
              testID="breeder-profile-display-name-input"
              className={`${INPUT_CLASS} ${inputBorderClass(Boolean(fieldErrors.displayName))}`}
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                clearFieldError('displayName');
              }}
            />
            <FieldError message={fieldErrors.displayName} />
          </View>

          <View className="mt-2">
            <FormSelectField
              testID="breeder-profile-location-select"
              label={t('breederProfile.location')}
              value={location}
              required
              placeholder={t('breederProfile.locationPlaceholder')}
              error={fieldErrors.location}
              options={VIETNAM_PROVINCES.map((province) => ({ value: province, label: province }))}
              onChange={(value) => {
                setLocation(resolveProvinceSelection(value));
                clearFieldError('location');
              }}
            />
          </View>

          <View className="mt-5">
            <FieldLabel label={t('breederProfile.primarySpecies')} required />
            {SPECIES_OPTIONS.length > 1 ? (
              <View className="mt-1.5 flex-row flex-wrap gap-2">
                {SPECIES_OPTIONS.map((item) => (
                  <OptionChip
                    key={item}
                    label={t(`breederProfile.speciesOptions.${item}`)}
                    active={primarySpecies === item}
                    onPress={() => {
                      setPrimarySpecies(selectPrimarySpecies(primarySpecies, item));
                      const nextOptions = registrationUnitsForSpecies(item);
                      if (
                        registrationUnit &&
                        !nextOptions.includes(registrationUnit as (typeof nextOptions)[number])
                      ) {
                        setRegistrationUnit('');
                        setRegistrationUnitOther('');
                      }
                      clearFieldError('species');
                    }}
                  />
                ))}
              </View>
            ) : (
              <View className="mt-1.5 self-start rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
                <Text className="text-sm font-semibold text-[#2B1E19]">
                  {t('breederProfile.speciesOptions.cat')}
                </Text>
              </View>
            )}
            <FieldError message={fieldErrors.species} />
          </View>

          {primarySpecies ? (
            <View className="mt-2">
              <FormSelectField
                testID="breeder-profile-type-select"
                label={t('breederProfile.applicationType')}
                value={breederType}
                options={BREEDER_TYPES.map((item) => ({
                  value: item,
                  label: t(`breederProfile.breederTypes.${item}`),
                }))}
                onChange={(value) => {
                  const nextType = value as BreederType;
                  setBreederType(nextType);
                  if (nextType !== 'registered_kennel') {
                    setRegistrationUnit('');
                    setRegistrationUnitOther('');
                  }
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.registrationUnit;
                    delete next.registrationUnitOther;
                    delete next.registeredKennelName;
                    delete next.registeredAt;
                    return next;
                  });
                }}
              />
            </View>
          ) : null}

          {primarySpecies && breederType === 'registered_kennel' ? (
            <View className="mt-2">
              <FormSelectField
                testID="breeder-profile-registration-unit-select"
                label={t('breederProfile.registrationUnit')}
                value={registrationUnit}
                required
                placeholder={t('breederProfile.registrationUnitPlaceholder')}
                error={fieldErrors.registrationUnit}
                options={registrationUnitOptions.map((item) => ({
                  value: item,
                  label: t(`breederProfile.registrationUnits.${item}`),
                }))}
                onChange={(value) => {
                  setRegistrationUnit(value);
                  if (value !== REGISTRATION_UNIT_OTHER) {
                    setRegistrationUnitOther('');
                  }
                  clearFieldError('registrationUnit');
                  clearFieldError('registrationUnitOther');
                }}
              />
              {registrationUnit === REGISTRATION_UNIT_OTHER ? (
                <View className="mt-2">
                  <TextInput
                    className={`rounded-xl border bg-white px-4 py-2.5 text-sm text-[#2B1E19] ${inputBorderClass(Boolean(fieldErrors.registrationUnitOther))}`}
                    placeholder={t('breederProfile.registrationUnitOtherPlaceholder')}
                    value={registrationUnitOther}
                    onChangeText={(value) => {
                      setRegistrationUnitOther(value);
                      clearFieldError('registrationUnitOther');
                    }}
                  />
                  <FieldError message={fieldErrors.registrationUnitOther} />
                </View>
              ) : null}

              <View className="mt-3">
                <FieldLabel label={t('breederProfile.registeredKennelName')} required />
                <TextInput
                  className={`${INPUT_CLASS} ${inputBorderClass(Boolean(fieldErrors.registeredKennelName))}`}
                  value={registeredKennelName}
                  onChangeText={(value) => {
                    setRegisteredKennelName(value);
                    clearFieldError('registeredKennelName');
                  }}
                />
                <FieldError message={fieldErrors.registeredKennelName} />
              </View>

              <View className="mt-3">
                <FieldLabel label={t('breederProfile.registeredAt')} required />
                <TextInput
                  className={`${INPUT_CLASS} ${inputBorderClass(Boolean(fieldErrors.registeredAt))}`}
                  placeholder={t('breederProfile.registeredAtPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={registeredAt}
                  onChangeText={(value) => {
                    setRegisteredAt(value.replace(/[^\d]/g, '').slice(0, 4));
                    clearFieldError('registeredAt');
                  }}
                />
                <FieldError message={fieldErrors.registeredAt} />
              </View>
            </View>
          ) : null}

          <View className="mt-5">
            <FieldLabel label={t('breederProfile.mainBreeds')} />
            <TextInput
              className={`${INPUT_CLASS} border-[#F0E6D8]`}
              placeholder={t('breederProfile.mainBreedsHint')}
              value={mainBreeds}
              onChangeText={setMainBreeds}
            />
          </View>

          <View className="mt-5">
            <FieldLabel label={t('breederProfile.bio')} />
            <TextInput
              className={`${INPUT_CLASS} min-h-[88px] border-[#F0E6D8]`}
              multiline
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
            />
          </View>

          <View className="mt-5">
            <FieldLabel label={t('breederProfile.commitmentsTitle')} />
            <CheckboxRow
              checked={allCommitmentsAccepted}
              onPress={() => {
                setCommitments(setBreederCommitmentsAccepted(commitments, !allCommitmentsAccepted));
                setCommitmentsError('');
              }}
              label={
                <Text className="text-sm leading-5 text-[#2B1E19]">
                  {t('breederProfile.commitments.combinedBefore')}
                  <Text
                    className="font-semibold text-[#D97706] underline"
                    onPress={() => void Linking.openURL(APP_LINKS.termsOfService)}
                  >
                    {t('breederProfile.commitments.termsLink')}
                  </Text>
                  {t('breederProfile.commitments.and')}
                  <Text
                    className="font-semibold text-[#D97706] underline"
                    onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
                  >
                    {t('breederProfile.commitments.guidelinesLink')}
                  </Text>
                  {t('breederProfile.commitments.combinedAfter')}
                </Text>
              }
            />
          </View>

          {commitmentsError ? (
            <View className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <Text className="text-sm leading-5 text-red-600">{commitmentsError}</Text>
            </View>
          ) : null}

          <Pressable
            testID="breeder-profile-save-button"
            className="mt-6 items-center justify-center rounded-full py-3 active:opacity-90"
            style={{ backgroundColor: submitting || photoBusy ? '#FDBA74' : PRIMARY }}
            onPress={() => void submit()}
            disabled={submitting || photoBusy !== null}
          >
            <Text className="text-sm font-semibold text-white">
              {submitting ? t('common.loading') : t(breederProfileSavePublishesImmediately(status) ? 'breederProfile.update' : 'breederProfile.save')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={Boolean(submitDialog)}
        transparent
        animationType="fade"
        onRequestClose={() => setSubmitDialog(null)}
      >
        <View className="flex-1 items-center justify-center bg-slate-950/45 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white p-5">
            <View
              className={`h-12 w-12 items-center justify-center rounded-full ${submitDialog?.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}
            >
              <Ionicons
                name={
                  submitDialog?.type === 'success'
                    ? 'checkmark-circle-outline'
                    : 'alert-circle-outline'
                }
                size={26}
                color={submitDialog?.type === 'success' ? '#059669' : '#dc2626'}
              />
            </View>
            <Text className="mt-4 text-lg font-bold text-[#2B1E19]">{submitDialog?.title}</Text>
            <Text className="mt-2 text-sm leading-5 text-[#6E5A51]">{submitDialog?.message}</Text>
            {submitDialog?.type === 'success' ? (
              <Pressable
                className="mt-5 rounded-xl py-3 active:opacity-90"
                style={{ backgroundColor: PRIMARY }}
                onPress={() => {
                  setSubmitDialog(null);
                  onBack();
                }}
              >
                <Text className="text-center text-sm font-bold text-white">{t('common.ok')}</Text>
              </Pressable>
            ) : (
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  className="flex-1 rounded-xl border border-[#F3E2C8] bg-white py-3 active:bg-[#FFF8EF]"
                  onPress={() => setSubmitDialog(null)}
                >
                  <Text className="text-center text-sm font-bold text-[#2B1E19]">
                    {t('breederProfile.checkAndEdit')}
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-xl py-3 active:opacity-90"
                  style={{ backgroundColor: PRIMARY }}
                  onPress={() => {
                    setSubmitDialog(null);
                    void submit();
                  }}
                >
                  <Text className="text-center text-sm font-bold text-white">
                    {t('breederProfile.retry')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <FarmCoverCropModal
        source={coverCropSource}
        onCancel={() => setCoverCropSource(null)}
        onConfirm={(croppedUri) => {
          setCoverCropSource(null);
          void uploadPickedPhoto('cover', croppedUri);
        }}
      />
    </SafeAreaView>
  );
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <Text className={LABEL_CLASS}>
      {label}
      {required ? <Text className="font-semibold text-red-500"> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1.5 text-xs font-medium text-red-600">{message}</Text>;
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const tone = breederFormChipTone(active, 'filled');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-1.5 ${tone.container}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-semibold ${tone.text}`}>{label}</Text>
    </Pressable>
  );
}

function CheckboxRow({
  label,
  checked,
  onPress,
}: {
  label: ReactNode;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="mt-1.5 flex-row items-start gap-2"
      onPress={onPress}
    >
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${checked ? 'border-[#D97706] bg-[#D97706]' : 'border-slate-300 bg-white'}`}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View className="min-w-0 flex-1">
        {typeof label === 'string' ? (
          <Text className="text-sm leading-5 text-[#2B1E19]">{label}</Text>
        ) : (
          label
        )}
      </View>
    </Pressable>
  );
}
