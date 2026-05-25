import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MAI_GREETING } from '../assets/maiOnboardingAssets';

type PetFormVariant = 'create' | 'edit';

export const PET_SPECIES_VALUES = ['dog', 'cat'] as const;
export const PET_GENDER_VALUES = ['male', 'female'] as const;

type SelectOption = { value: string; label: string };

type AddPetScreenProps = {
  variant: PetFormVariant;
  petName: string;
  petSpecies: string;
  petBreed: string;
  petAge: string;
  petGender: string;
  petAvatarUrl: string;
  onChangeName: (value: string) => void;
  onChangeSpecies: (value: string) => void;
  onChangeBreed: (value: string) => void;
  onChangeAge: (value: string) => void;
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
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-slate-900">{label}</Text>
      <Pressable
        testID={testID}
        className="flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} picker`}
      >
        <Text className={`text-base ${selectedLabel ? 'text-slate-900' : 'text-gray-400'}`}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
          <View className="rounded-t-2xl bg-white px-4 pb-8 pt-2">
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
  petAge,
  petGender,
  petAvatarUrl,
  onChangeName,
  onChangeSpecies,
  onChangeBreed,
  onChangeAge,
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

  const hasAvatarUri = Boolean(petAvatarUrl?.trim());

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
          <Image source={MAI_GREETING} className="h-16 w-16 shrink-0 rounded-2xl" contentFit="cover" cachePolicy="memory-disk" accessibilityLabel="Mai" />
          <Text className="flex-1 text-sm font-medium leading-5 text-slate-700">{helperMessage}</Text>
        </View>
      ) : null}

      <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="mb-6 items-center">
          <Pressable
            testID="add-pet-avatar-button"
            onPress={onPickAvatar}
            className="items-center active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Pick pet avatar from library"
          >
            <View className="h-28 w-28 overflow-hidden rounded-full bg-blue-600 shadow-md">
              {hasAvatarUri ? (
                <Image source={{ uri: petAvatarUrl.trim() }} className="h-full w-full" contentFit="cover" />
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
          <Text className="mb-2 text-sm font-semibold text-slate-900">{t('addPet.petName')}</Text>
          <TextInput
            testID="add-pet-name-input"
            accessibilityLabel="Pet name"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder={t('addPet.enterPetName')}
            placeholderTextColor="#9ca3af"
            value={petName}
            onChangeText={onChangeName}
          />
        </View>

        <FormSelect
          label={t('addPet.petType')}
          value={petSpecies}
          options={speciesOptions}
          onChange={onChangeSpecies}
          placeholder={t('addPet.selectPetType')}
          testID="add-pet-species-select"
        />

        <FormSelect
          label={t('addPet.gender')}
          value={petGender}
          options={genderOptions}
          onChange={onChangeGender}
          placeholder={t('addPet.selectGender')}
          testID="add-pet-gender-select"
        />

        <View className="mb-5">
          <Text className="mb-2 text-sm font-semibold text-slate-900">{t('addPet.ageYears')}</Text>
          <TextInput
            testID="add-pet-age-input"
            accessibilityLabel="Pet age"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder={t('addPet.agePlaceholder')}
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={petAge}
            onChangeText={onChangeAge}
          />
        </View>

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
          onPress={onSubmit}
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
    </View>
  );
}
