import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAI_GREETING } from '../assets/maiOnboardingAssets';
import { FormDateField } from '../components/FormDateField';
import { isBirthDateInFuture } from '../utils/petAge';
import { modalBottomInset } from '../utils/modalSafeArea';

type PetFormVariant = 'create' | 'edit';

import { ACTIVE_PET_SPECIES } from '../constants/petSpecies';

export const PET_SPECIES_VALUES = ACTIVE_PET_SPECIES;
export const PET_GENDER_VALUES = ['male', 'female'] as const;

type SelectOption = { value: string; label: string };

type PetFormFieldErrors = {
  petName?: string;
  petBirthDate?: string;
  petGender?: string;
  petSpecies?: string;
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-sm font-semibold text-slate-900">
      {children} <Text className="text-red-500">*</Text>
    </Text>
  );
}

type AddPetScreenProps = {
  variant: PetFormVariant;
  petName: string;
  petSpecies: string;
  petBreed: string;
  petBirthDate: string;
  petGender: string;
  petAvatarUrl: string;
  onChangeName: (value: string) => void;
  onChangeSpecies: (value: string) => void;
  onChangeBreed: (value: string) => void;
  onChangeBirthDate: (value: string) => void;
  onChangeGender: (value: string) => void;
  onPickAvatar: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  /** Shown on edit only — remove pet from account (confirmation in handler). */
  onDeletePet?: () => void;
  /** Overrides default "Add New Pet" / "Edit Pet" title (e.g. first-time onboarding). */
  headerTitle?: string;
  /** Overrides default submit label ("Add Pet" / "Update Pet"). */
  submitButtonLabel?: string;
  /** Optional onboarding helper sentence shown under header. */
  helperMessage?: string;
};

function FormSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  testID,
  required,
  error,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  testID?: string;
  required?: boolean;
  error?: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View className="mb-5">
      {required ? <RequiredLabel>{label}</RequiredLabel> : <Text className="mb-2 text-sm font-semibold text-slate-900">{label}</Text>}
      <Pressable
        testID={testID}
        className={`flex-row items-center justify-between rounded-xl border bg-white px-4 py-3 active:bg-gray-50 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
      >
        <Text className={`text-base ${selectedLabel ? 'text-slate-900' : 'text-gray-400'}`}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </Pressable>
      {error ? <Text className="mt-1.5 text-xs font-medium text-red-600">{error}</Text> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
          <View className="rounded-t-2xl bg-white px-4 pt-2" style={{ paddingBottom: modalBottomInset(insets.bottom, 16) }}>
            <View className="mb-2 self-center rounded-full bg-gray-200 px-10 py-1" />
            {options.map((opt) => (
              <Pressable
                testID={testID ? `${testID}-option-${opt.value}` : undefined}
                key={opt.value}
                className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <Text className="text-center text-base text-slate-900">{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable className="mt-2 py-3" onPress={() => setOpen(false)}>
              <Text className="text-center text-base text-blue-600">{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Add / edit pet — layout aligned with `figma/UI/AddNewPet1.png`. */
export function AddPetScreen({
  variant,
  petName,
  petSpecies,
  petBreed,
  petBirthDate,
  petGender,
  petAvatarUrl,
  onChangeName,
  onChangeSpecies,
  onChangeBreed,
  onChangeBirthDate,
  onChangeGender,
  onPickAvatar,
  onSubmit,
  onCancel,
  onDeletePet,
  headerTitle,
  submitButtonLabel,
  helperMessage,
}: AddPetScreenProps) {
  const { t } = useTranslation();
  const title = headerTitle ?? (variant === 'create' ? t('addPet.addNewPet') : t('addPet.editPet'));
  const submitLabel = submitButtonLabel ?? (variant === 'create' ? t('addPet.addPet') : t('addPet.updatePet'));

  const speciesOptions = useMemo(() => {
    const base: SelectOption[] = PET_SPECIES_VALUES.map((v) => ({
      value: v,
      label: t(`petTypes.${v}`),
    }));
    if (petSpecies && !base.some((o) => o.value === petSpecies)) {
      base.push({ value: petSpecies, label: petSpecies });
    }
    return base;
  }, [petSpecies, t]);

  const genderOptions = useMemo(() => {
    const base: SelectOption[] = PET_GENDER_VALUES.map((v) => ({
      value: v,
      label: t(`gender.${v}`),
    }));
    if (petGender && !base.some((o) => o.value === petGender)) {
      base.push({ value: petGender, label: petGender });
    }
    return base;
  }, [petGender, t]);

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PetFormFieldErrors>({});
  const hasAvatarUri = Boolean(petAvatarUrl?.trim());
  const showAvatarImage = hasAvatarUri && !avatarLoadFailed;
  const showSpeciesSelect = speciesOptions.length > 1;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [petAvatarUrl]);

  function clearFieldError(key: keyof PetFormFieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function submitWithRequiredFields() {
    const nextErrors: PetFormFieldErrors = {};
    if (!petName.trim()) nextErrors.petName = t('addPet.fieldErrors.petNameRequired');
    if (!petBirthDate.trim()) {
      nextErrors.petBirthDate = t('addPet.fieldErrors.birthDateRequired');
    } else if (isBirthDateInFuture(petBirthDate)) {
      nextErrors.petBirthDate = t('addPet.fieldErrors.birthDateFuture');
    }
    if (!petGender.trim()) nextErrors.petGender = t('addPet.fieldErrors.genderRequired');
    if (showSpeciesSelect && !petSpecies.trim()) {
      nextErrors.petSpecies = t('addPet.fieldErrors.petTypeRequired');
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    onSubmit();
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-3">
        <Pressable
          testID="add-pet-back-button"
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-gray-100"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        <View className="h-10 w-10" />
      </View>
      {helperMessage ? (
        <View className="flex-row items-center gap-3 border-b border-gray-200 bg-[#F8FAFF] px-4 py-3">
          <ExpoImage source={MAI_GREETING} className="h-16 w-16 shrink-0 rounded-2xl" contentFit="cover" cachePolicy="memory-disk" accessibilityLabel="Mai" />
          <Text className="flex-1 text-sm font-medium leading-5 text-slate-700">{helperMessage}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View className="mb-6 items-center">
          <Pressable
            testID="add-pet-avatar-button"
            onPress={onPickAvatar}
            className="items-center active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Pick pet avatar from library"
          >
            <View className="h-28 w-28 overflow-hidden rounded-full bg-blue-600 shadow-md">
              {showAvatarImage ? (
                <Image
                  source={{ uri: petAvatarUrl.trim() }}
                  className="h-full w-full"
                  resizeMode="cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="paw" size={52} color="#ffffff" />
                </View>
              )}
            </View>
            <Text className="mt-2 text-center text-sm text-gray-500">{t('addPet.clickAvatar')}</Text>
          </Pressable>
        </View>

        <View className="mb-5">
          <RequiredLabel>{t('addPet.petName')}</RequiredLabel>
          <TextInput
            testID="add-pet-name-input"
            accessibilityLabel="Pet name"
            className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${
              fieldErrors.petName ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder={t('addPet.enterPetName')}
            placeholderTextColor="#9ca3af"
            value={petName}
            onChangeText={(value) => {
              clearFieldError('petName');
              onChangeName(value);
            }}
          />
          {fieldErrors.petName ? (
            <Text testID="add-pet-name-error" className="mt-1.5 text-xs font-medium text-red-600">
              {fieldErrors.petName}
            </Text>
          ) : null}
        </View>

        <FormDateField
          label={t('addPet.birthDate')}
          value={petBirthDate}
          placeholder={t('addPet.birthDatePlaceholder')}
          maximumDate={new Date()}
          testID="add-pet-birth-date-field"
          required
          error={fieldErrors.petBirthDate}
          onChange={(value) => {
            clearFieldError('petBirthDate');
            onChangeBirthDate(value);
          }}
        />

        <FormSelect
          label={t('addPet.gender')}
          value={petGender}
          options={genderOptions}
          onChange={(value) => {
            clearFieldError('petGender');
            onChangeGender(value);
          }}
          placeholder={t('addPet.selectGender')}
          testID="add-pet-gender-select"
          required
          error={fieldErrors.petGender}
        />

        {showSpeciesSelect ? (
          <FormSelect
            label={t('addPet.petType')}
            value={petSpecies}
            options={speciesOptions}
            onChange={(value) => {
              clearFieldError('petSpecies');
              onChangeSpecies(value);
            }}
            placeholder={t('addPet.selectPetType')}
            testID="add-pet-species-select"
            required
            error={fieldErrors.petSpecies}
          />
        ) : (
          <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-slate-900">{t('addPet.petType')}</Text>
            <View className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
              <Text className="text-base font-medium text-slate-900">{speciesOptions[0]?.label ?? t('petTypes.cat')}</Text>
            </View>
          </View>
        )}

        <View className="mb-5">
          <Text className="mb-2 text-sm font-semibold text-slate-900">{t('addPet.breed')}</Text>
          <TextInput
            testID="add-pet-breed-input"
            accessibilityLabel="Pet breed"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder={t('addPet.enterBreed')}
            placeholderTextColor="#9ca3af"
            value={petBreed}
            onChangeText={onChangeBreed}
          />
        </View>

        <Pressable
          testID={variant === 'create' ? 'add-pet-submit-button' : 'edit-pet-submit-button'}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          className="mt-2 rounded-xl bg-blue-600 py-3.5 active:bg-blue-700"
          onPress={submitWithRequiredFields}
        >
          <Text className="text-center text-base font-semibold text-white">{submitLabel}</Text>
        </Pressable>

        {variant === 'edit' && onDeletePet ? (
          <Pressable
            testID="edit-pet-delete-button"
            className="mt-6 py-3 active:opacity-80"
            onPress={onDeletePet}
            accessibilityRole="button"
            accessibilityLabel="Remove pet"
          >
            <Text className="text-center text-base font-medium text-red-600">{t('addPet.removePet')}</Text>
          </Pressable>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
