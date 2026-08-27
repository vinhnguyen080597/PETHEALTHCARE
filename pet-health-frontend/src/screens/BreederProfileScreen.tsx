import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACTIVE_BREEDER_SPECIES_OPTIONS } from '../constants/petSpecies';
import { APP_LINKS } from '../config';
import type { BreederProfile, UpsertBreederProfilePayload } from '../types';
import { showAccountBreederStatusBadge } from '../utils/accountBreederStatusBadge.ts';
import {
  hasAllBreederCommitments,
  setBreederCommitmentsAccepted,
} from '../utils/breederCommitments.ts';
import { readBreederFormMetadata } from '../utils/breederFormMetadata.ts';
import {
  breederSpeciesForSave,
  selectPrimarySpecies,
  splitBreederSpeciesForForm,
} from '../utils/breederSpeciesSelection';
import { ProvinceSelectField } from '../components/form/ProvinceSelectField';
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
} from '../utils/breederRegisteredKennelValidation.ts';
import { breederFormChipTone, type BreederFormChipVariant } from '../utils/breederFormChips.ts';

const PRIMARY = '#D97706';

type BreederType = 'registered_kennel' | 'home_breeder' | 'rescue_foster' | 'rehoming' | 'other';

const BREEDER_TYPES: BreederType[] = ['registered_kennel', 'home_breeder', 'rescue_foster', 'rehoming', 'other'];
const SPECIES_OPTIONS = [...ACTIVE_BREEDER_SPECIES_OPTIONS];

type BreederProfileScreenProps = {
  profile: BreederProfile | null;
  onBack: () => void;
  onSaveProfile: (payload: UpsertBreederProfilePayload) => Promise<void>;
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

export function BreederProfileScreen({ profile, onBack, onSaveProfile }: BreederProfileScreenProps) {
  const { t } = useTranslation();
  const metadata = profile?.metadata ?? {};
  const formMeta = readBreederFormMetadata(metadata);
  const isEdit = Boolean(profile?.id);
  const scrollRef = useRef<ScrollView>(null);
  const registrationSectionYRef = useRef(0);
  const displayNameRef = useRef<TextInput>(null);
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
  const [submitting, setSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [commitmentsError, setCommitmentsError] = useState('');
  const [registeredKennelErrors, setRegisteredKennelErrors] =
    useState<RegisteredKennelFieldErrors>({});
  const [submitDialog, setSubmitDialog] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const allCommitmentsAccepted = hasAllBreederCommitments(commitments);
  const screenTitle = useMemo(
    () => t(isEdit ? 'farm.owner.editProfile' : 'breederProfile.createTitle'),
    [isEdit, t],
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
    setRegistrationError('');
    setCommitmentsError('');
    setRegisteredKennelErrors({});
  }, [profile]);

  function validateRegistrationInfo() {
    if (!displayName.trim()) return t('breederProfile.errors.displayNameRequired');
    if (!location.trim()) return t('breederProfile.errors.locationRequired');
    return '';
  }

  function focusFirstMissingRegistrationField() {
    if (!displayName.trim()) {
      displayNameRef.current?.focus();
      return;
    }
    if (!location.trim()) {
      scrollToRegistrationFields();
    }
  }

  function scrollToRegistrationFields() {
    scrollRef.current?.scrollTo({
      y: Math.max(0, registrationSectionYRef.current - 12),
      animated: true,
    });
    requestAnimationFrame(() => {
      focusFirstMissingRegistrationField();
    });
  }

  async function submit() {
    const registrationMessage = validateRegistrationInfo();
    setRegistrationError(registrationMessage);
    setCommitmentsError('');
    if (registrationMessage) {
      scrollToRegistrationFields();
      return;
    }
    if (!primarySpecies.trim()) {
      setSubmitDialog({
        type: 'error',
        title: t('breederProfile.saveFailed'),
        message: t('breederProfile.errors.speciesRequired'),
      });
      return;
    }
    const kennelErrors = validateRegisteredKennelFields(
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
    );
    if (Object.keys(kennelErrors).length > 0) {
      setRegisteredKennelErrors(kennelErrors);
      return;
    }
    setRegisteredKennelErrors({});

    if (!hasAllBreederCommitments(commitments)) {
      setCommitmentsError(t('breederProfile.commitmentsRequired'));
      return;
    }

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
        },
      });
      setSubmitDialog({
        type: 'success',
        title: t('breederProfile.submitSuccessTitle'),
        message: t('breederProfile.saved'),
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

  const missingDisplayName = !displayName.trim();
  const missingLocation = !location.trim();
  const showRegistrationInvalid = Boolean(registrationError);
  const rejectionReason = formMeta.rejectionReason;
  const rejectionAction = formMeta.adminAction;
  const rejectionNote = formMeta.adminNote;

  return (
    <View testID="breeder-profile-screen" style={{ flex: 1, minHeight: 0 }} className="bg-[#FDFBF7]">
      <View className="flex-row items-center border-b border-[#F3E2C8] bg-white px-2 py-2">
        <Pressable testID="breeder-profile-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#2B1E19" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-[#2B1E19]" numberOfLines={1}>
          {screenTitle}
        </Text>
        <View className="w-14" />
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
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

        {!isEdit ? (
          <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: PRIMARY }}>
            <View className="flex-row gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <Ionicons name="sparkles-outline" size={21} color="#fff" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-bold text-white">{t('breederProfile.maiTitle')}</Text>
                <Text className="mt-1 text-sm leading-5 text-amber-50">{t('breederProfile.maiBody')}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View
          className="mt-5 rounded-2xl border border-[#F0E6D8] bg-white p-4"
          onLayout={(event) => {
            registrationSectionYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="text-base font-bold text-[#2B1E19]">{t('breederProfile.profileInfo')}</Text>
          <Text className="mt-1 text-xs leading-5 text-[#6E5A51]">{t('breederProfile.profileInfoRequiredHint')}</Text>
          <TextInput
            ref={displayNameRef}
            className={`mt-3 rounded-xl border bg-[#FDFBF7] px-3 py-3 text-[#2B1E19] ${showRegistrationInvalid && missingDisplayName ? 'border-red-400' : 'border-[#F0E6D8]'}`}
            placeholder={`${t('breederProfile.displayName')} *`}
            value={displayName}
            onChangeText={(value) => {
              setDisplayName(value);
              if (registrationError) setRegistrationError('');
            }}
          />
          <ProvinceSelectField
            label={t('breederProfile.location')}
            value={location}
            onChange={(value) => {
              setLocation(value);
              if (registrationError) setRegistrationError('');
            }}
            required
            error={showRegistrationInvalid && missingLocation ? registrationError : undefined}
            placeholder={t('breederProfile.locationPlaceholder')}
            onOpen={scrollToRegistrationFields}
          />
          {registrationError ? (
            <Text className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
              {registrationError}
            </Text>
          ) : null}
        </View>

        <View className="mt-5 rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <Text className="text-base font-bold text-[#2B1E19]">{t('breederProfile.scaleAndSpecies')}</Text>
          <Text className="mt-3 text-xs font-bold uppercase text-[#6E5A51]">
            {t('breederProfile.primarySpecies')} *
          </Text>
          {SPECIES_OPTIONS.length > 1 ? (
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SPECIES_OPTIONS.map((item) => (
                <OptionChip
                  key={item}
                  variant="filled"
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
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="mt-2 self-start rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
              <Text className="text-sm font-semibold text-[#2B1E19]">
                {t('breederProfile.speciesOptions.cat')}
              </Text>
            </View>
          )}
          <TextInput
            className="mt-3 rounded-xl border border-[#F0E6D8] bg-[#FDFBF7] px-3 py-3 text-[#2B1E19]"
            placeholder={t('breederProfile.mainBreeds')}
            value={mainBreeds}
            onChangeText={setMainBreeds}
          />
          <Text className="mt-1.5 text-xs leading-4 text-[#6E5A51]">{t('breederProfile.mainBreedsHint')}</Text>
        </View>

                {primarySpecies ? (
          <View className="mt-5 rounded-2xl border border-[#F0E6D8] bg-white p-4">
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
                setRegisteredKennelErrors({});
                if (nextType !== 'registered_kennel') {
                  setRegistrationUnit('');
                  setRegistrationUnitOther('');
                }
              }}
            />
            {breederType === 'registered_kennel' ? (
              <View className="mt-1 gap-1">
                <FormSelectField
                  testID="breeder-profile-registration-unit-select"
                  label={t('breederProfile.registrationUnit')}
                  value={registrationUnit}
                  required
                  placeholder={t('breederProfile.registrationUnitPlaceholder')}
                  error={registeredKennelErrors.registrationUnit}
                  options={registrationUnitsForSpecies(primarySpecies).map((item) => ({
                    value: item,
                    label: t(`breederProfile.registrationUnits.${item}`),
                  }))}
                  onChange={(value) => {
                    setRegistrationUnit(value);
                    if (value !== REGISTRATION_UNIT_OTHER) {
                      setRegistrationUnitOther('');
                    }
                    setRegisteredKennelErrors((prev) => {
                      const nextErr = { ...prev };
                      delete nextErr.registrationUnit;
                      delete nextErr.registrationUnitOther;
                      return nextErr;
                    });
                  }}
                />
                {registrationUnit === REGISTRATION_UNIT_OTHER ? (
                  <>
                    <TextInput
                      className={`mt-2 rounded-xl border bg-white px-4 py-2.5 text-sm text-[#2B1E19] ${registeredKennelErrors.registrationUnitOther ? 'border-red-400' : 'border-[#F0E6D8]'}`}
                      placeholder={t('breederProfile.registrationUnitOtherPlaceholder')}
                      value={registrationUnitOther}
                      onChangeText={(value) => {
                        setRegistrationUnitOther(value);
                        setRegisteredKennelErrors((prev) => {
                          const nextErr = { ...prev };
                          delete nextErr.registrationUnitOther;
                          return nextErr;
                        });
                      }}
                    />
                    {registeredKennelErrors.registrationUnitOther ? (
                      <Text className="mt-1.5 text-xs font-medium text-red-600">
                        {registeredKennelErrors.registrationUnitOther}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                <View className="mt-3">
                  <Text className="text-xs font-medium text-[#6E5A51]">
                    {t('breederProfile.registeredKennelName')}
                    <Text className="font-semibold text-red-500"> *</Text>
                  </Text>
                  <TextInput
                    className={`mt-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm text-[#2B1E19] ${registeredKennelErrors.registeredKennelName ? 'border-red-400' : 'border-[#F0E6D8]'}`}
                    placeholder={t('breederProfile.registeredKennelName')}
                    value={registeredKennelName}
                    onChangeText={(value) => {
                      setRegisteredKennelName(value);
                      setRegisteredKennelErrors((prev) => {
                        const nextErr = { ...prev };
                        delete nextErr.registeredKennelName;
                        return nextErr;
                      });
                    }}
                  />
                  {registeredKennelErrors.registeredKennelName ? (
                    <Text className="mt-1.5 text-xs font-medium text-red-600">
                      {registeredKennelErrors.registeredKennelName}
                    </Text>
                  ) : null}
                </View>
                <View className="mt-3">
                  <Text className="text-xs font-medium text-[#6E5A51]">
                    {t('breederProfile.registeredAt')}
                    <Text className="font-semibold text-red-500"> *</Text>
                  </Text>
                  <TextInput
                    className={`mt-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm text-[#2B1E19] ${registeredKennelErrors.registeredAt ? 'border-red-400' : 'border-[#F0E6D8]'}`}
                    placeholder={t('breederProfile.registeredAtPlaceholder')}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={registeredAt}
                    onChangeText={(value) => {
                      setRegisteredAt(value.replace(/[^\d]/g, '').slice(0, 4));
                      setRegisteredKennelErrors((prev) => {
                        const nextErr = { ...prev };
                        delete nextErr.registeredAt;
                        return nextErr;
                      });
                    }}
                  />
                  {registeredKennelErrors.registeredAt ? (
                    <Text className="mt-1.5 text-xs font-medium text-red-600">
                      {registeredKennelErrors.registeredAt}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

<View className="mt-5 rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <Text className="text-base font-bold text-[#2B1E19]">{t('breederProfile.bio')}</Text>
          <TextInput
            className="mt-3 min-h-[96px] rounded-xl border border-[#F0E6D8] bg-[#FDFBF7] px-3 py-3 text-[#2B1E19]"
            multiline
            textAlignVertical="top"
            placeholder={t('breederProfile.bio')}
            value={bio}
            onChangeText={setBio}
          />
        </View>

        <View className="mt-5 rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <Text className="text-base font-bold text-[#2B1E19]">{t('breederProfile.commitmentsTitle')}</Text>
          <View className="mt-3">
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
                    className="font-semibold text-[#B45309]"
                    onPress={() => void Linking.openURL(APP_LINKS.termsOfService)}
                  >
                    {t('breederProfile.commitments.termsLink')}
                  </Text>
                  {t('breederProfile.commitments.and')}
                  <Text
                    className="font-semibold text-[#B45309]"
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
            <Text className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
              {commitmentsError}
            </Text>
          ) : null}
          <Pressable
            testID="breeder-profile-save-button"
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-90"
            style={{ backgroundColor: submitting ? '#FDBA74' : PRIMARY }}
            onPress={() => void submit()}
            disabled={submitting}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text className="text-sm font-bold text-white">
              {submitting ? t('common.loading') : t('breederProfile.save')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
    </View>
  );
}

function OptionChip({
  label,
  active,
  onPress,
  variant = 'outline',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  variant?: BreederFormChipVariant;
}) {
  const tone = breederFormChipTone(active, variant);
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
      className="flex-row items-start gap-3 rounded-xl bg-[#FDFBF7] p-3"
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
