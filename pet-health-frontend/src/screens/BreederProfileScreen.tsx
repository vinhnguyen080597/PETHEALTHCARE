import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACTIVE_BREEDER_SPECIES_OPTIONS } from '../constants/petSpecies';
import { APP_LINKS } from '../config';
import type { BreederProfile, UpsertBreederProfilePayload } from '../types';
import {
  breederSpeciesForSave,
  selectPrimarySpecies,
  splitBreederSpeciesForForm,
} from '../utils/breederSpeciesSelection';
import { ProvinceSelectField } from '../components/form/ProvinceSelectField';
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

const PRIMARY = '#1E6FE8';

type BreederType = 'registered_kennel' | 'home_breeder' | 'rescue_foster' | 'rehoming' | 'other';

const BREEDER_TYPES: BreederType[] = ['registered_kennel', 'home_breeder', 'rescue_foster', 'rehoming', 'other'];
const SPECIES_OPTIONS = [...ACTIVE_BREEDER_SPECIES_OPTIONS];
const COMMITMENT_OPTIONS = [
  'accurate_information',
  'app_only_verification',
] as const;

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

function metadataArray(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function BreederProfileScreen({ profile, onBack, onSaveProfile }: BreederProfileScreenProps) {
  const { t } = useTranslation();
  const metadata = profile?.metadata ?? {};
  const scrollRef = useRef<ScrollView>(null);
  const registrationSectionYRef = useRef(0);
  const displayNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [location, setLocation] = useState(
    resolveProvinceSelection(profile?.location ?? ''),
  );
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
  const [facebook] = useState(String(profile?.contact?.facebook ?? ''));
  const [zalo] = useState(String(profile?.contact?.zalo ?? ''));
  const [phone, setPhone] = useState(String(profile?.contact?.phone ?? ''));
  const [breederType, setBreederType] = useState<BreederType>((metadataString(metadata, 'breederType') as BreederType) || 'home_breeder');
  const [registeredAt, setRegisteredAt] = useState(metadataString(metadata, 'registeredAt'));
  const [registrationUnit, setRegistrationUnit] = useState(initialRegistration.registrationUnit);
  const [registrationUnitOther, setRegistrationUnitOther] = useState(
    initialRegistration.registrationUnitOther,
  );
  const [registeredKennelName, setRegisteredKennelName] = useState(metadataString(metadata, 'registeredKennelName'));
  const [commitments, setCommitments] = useState<string[]>(metadataArray(metadata, 'transparencyCommitments'));
  const [submitting, setSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registeredKennelErrors, setRegisteredKennelErrors] =
    useState<RegisteredKennelFieldErrors>({});
  const [submitDialog, setSubmitDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const allCommitmentsAccepted = COMMITMENT_OPTIONS.every((item) => commitments.includes(item));

  useEffect(() => {
    const nextMetadata = profile?.metadata ?? {};
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
    setPhone(String(profile?.contact?.phone ?? ''));
    setBreederType((metadataString(nextMetadata, 'breederType') as BreederType) || 'home_breeder');
    setRegisteredAt(metadataString(nextMetadata, 'registeredAt'));
    setRegistrationUnit(nextRegistration.registrationUnit);
    setRegistrationUnitOther(nextRegistration.registrationUnitOther);
    setRegisteredKennelName(metadataString(nextMetadata, 'registeredKennelName'));
    setCommitments(metadataArray(nextMetadata, 'transparencyCommitments'));
    setRegistrationError('');
    setRegisteredKennelErrors({});
  }, [profile]);

  function validateRegistrationInfo() {
    if (!displayName.trim()) return t('breederProfile.errors.displayNameRequired');
    if (!location.trim()) return t('breederProfile.errors.locationRequired');
    if (!phone.trim()) return t('breederProfile.errors.phoneRequired');
    return '';
  }

  function focusFirstMissingRegistrationField() {
    if (!displayName.trim()) {
      displayNameRef.current?.focus();
      return;
    }
    if (!location.trim()) {
      scrollToRegistrationFields();
      return;
    }
    if (!phone.trim()) {
      phoneRef.current?.focus();
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
  const missingPhone = !phone.trim();
  const showRegistrationInvalid = Boolean(registrationError);

  return (
    <View testID="breeder-profile-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="breeder-profile-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('breederProfile.title')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl p-4" style={{ backgroundColor: PRIMARY }}>
          <View className="flex-row gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Ionicons name="sparkles-outline" size={21} color="#fff" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-white">{t('breederProfile.maiTitle')}</Text>
              <Text className="mt-1 text-sm leading-5 text-blue-50">{t('breederProfile.maiBody')}</Text>
            </View>
          </View>
        </View>

        <View
          className="mt-5 rounded-2xl border border-gray-200 bg-white p-4"
          onLayout={(event) => {
            registrationSectionYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.profileInfo')}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">{t('breederProfile.profileInfoRequiredHint')}</Text>
          {profile?.verification_status ? (
            <Text className="mt-2 text-sm font-semibold text-slate-600">{t(`account.breederRequestStatus.${profile.verification_status}`)}</Text>
          ) : null}
          {profile?.verification_status === 'rejected' &&
          (metadataString(metadata, 'rejection_reason') ||
            metadataString(metadata, 'admin_action') ||
            metadataString(metadata, 'admin_note')) ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <Text className="text-sm font-bold text-red-900">{t('breederProfile.rejectionBannerTitle')}</Text>
              {metadataString(metadata, 'rejection_reason') ? (
                <Text className="mt-2 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionReason')}: </Text>
                  {metadataString(metadata, 'rejection_reason')}
                </Text>
              ) : null}
              {metadataString(metadata, 'admin_action') ? (
                <Text className="mt-1.5 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionAction')}: </Text>
                  {metadataString(metadata, 'admin_action')}
                </Text>
              ) : null}
              {metadataString(metadata, 'admin_note') ? (
                <Text className="mt-1.5 text-sm leading-5 text-red-900">
                  <Text className="font-semibold">{t('breederProfile.rejectionNote')}: </Text>
                  {metadataString(metadata, 'admin_note')}
                </Text>
              ) : null}
            </View>
          ) : null}
          <TextInput
            ref={displayNameRef}
            className={`mt-3 rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${showRegistrationInvalid && missingDisplayName ? 'border-red-400' : 'border-gray-200'}`}
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
          <TextInput
            ref={phoneRef}
            className={`mt-3 rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${showRegistrationInvalid && missingPhone ? 'border-red-400' : 'border-gray-200'}`}
            placeholder={`${t('breederProfile.phone')} *`}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (registrationError) setRegistrationError('');
            }}
          />
          {registrationError ? (
            <Text className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">{registrationError}</Text>
          ) : null}
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.scaleAndSpecies')}</Text>
          <Text className="mt-3 text-xs font-bold uppercase text-slate-500">{t('breederProfile.primarySpecies')}</Text>
          {SPECIES_OPTIONS.length > 1 ? (
            <View className="mt-2 flex-row flex-wrap gap-2">
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
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="mt-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <Text className="text-sm font-semibold text-slate-800">{t('breederProfile.speciesOptions.cat')}</Text>
            </View>
          )}
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.mainBreeds')} value={mainBreeds} onChangeText={setMainBreeds} />
        </View>

        {primarySpecies ? (
          <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('breederProfile.applicationType')}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {BREEDER_TYPES.map((item) => (
                <OptionChip key={item} label={t(`breederProfile.breederTypes.${item}`)} active={breederType === item} onPress={() => {
                  setBreederType(item);
                  setRegisteredKennelErrors({});
                }} />
              ))}
            </View>
            {breederType === 'registered_kennel' ? (
              <View className="mt-3 gap-3">
                <Text className="text-xs font-bold uppercase text-slate-500">
                  {t('breederProfile.registrationUnit')} <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {registrationUnitsForSpecies(primarySpecies).map((item) => (
                    <OptionChip
                      key={item}
                      label={t(`breederProfile.registrationUnits.${item}`)}
                      active={registrationUnit === item}
                      onPress={() => {
                        setRegistrationUnit(item);
                        setRegisteredKennelErrors((prev) => {
                          const next = { ...prev };
                          delete next.registrationUnit;
                          delete next.registrationUnitOther;
                          return next;
                        });
                      }}
                    />
                  ))}
                </View>
                {registeredKennelErrors.registrationUnit ? (
                  <Text className="text-sm text-red-600">{registeredKennelErrors.registrationUnit}</Text>
                ) : null}
                {registrationUnit === REGISTRATION_UNIT_OTHER ? (
                  <>
                    <TextInput
                      className={`rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${registeredKennelErrors.registrationUnitOther ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder={t('breederProfile.registrationUnitOtherPlaceholder')}
                      value={registrationUnitOther}
                      onChangeText={(value) => {
                        setRegistrationUnitOther(value);
                        setRegisteredKennelErrors((prev) => {
                          if (!prev.registrationUnitOther) return prev;
                          const next = { ...prev };
                          delete next.registrationUnitOther;
                          return next;
                        });
                      }}
                    />
                    {registeredKennelErrors.registrationUnitOther ? (
                      <Text className="-mt-2 text-sm text-red-600">{registeredKennelErrors.registrationUnitOther}</Text>
                    ) : null}
                  </>
                ) : null}
                <Text className="text-xs font-bold uppercase text-slate-500">
                  {t('breederProfile.registeredKennelName')} <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${registeredKennelErrors.registeredKennelName ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder={t('breederProfile.registeredKennelName')}
                  value={registeredKennelName}
                  onChangeText={(value) => {
                    setRegisteredKennelName(value);
                    setRegisteredKennelErrors((prev) => {
                      if (!prev.registeredKennelName) return prev;
                      const next = { ...prev };
                      delete next.registeredKennelName;
                      return next;
                    });
                  }}
                />
                {registeredKennelErrors.registeredKennelName ? (
                  <Text className="-mt-2 text-sm text-red-600">{registeredKennelErrors.registeredKennelName}</Text>
                ) : null}
                <Text className="text-xs font-bold uppercase text-slate-500">
                  {t('breederProfile.registeredAt')} <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`rounded-xl border bg-slate-50 px-3 py-3 text-slate-900 ${registeredKennelErrors.registeredAt ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder={t('breederProfile.registeredAt')}
                  value={registeredAt}
                  onChangeText={(value) => {
                    setRegisteredAt(value);
                    setRegisteredKennelErrors((prev) => {
                      if (!prev.registeredAt) return prev;
                      const next = { ...prev };
                      delete next.registeredAt;
                      return next;
                    });
                  }}
                />
                {registeredKennelErrors.registeredAt ? (
                  <Text className="-mt-2 text-sm text-red-600">{registeredKennelErrors.registeredAt}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.bio')}</Text>
          <TextInput
            className="mt-3 min-h-[88px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('breederProfile.bio')}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.commitmentsTitle')}</Text>
          <View className="mt-3 gap-2">
            <CheckboxRow
              checked={allCommitmentsAccepted}
              onPress={() =>
                setCommitments((current) =>
                  allCommitmentsAccepted
                    ? current.filter((item) => !(COMMITMENT_OPTIONS as readonly string[]).includes(item))
                    : Array.from(new Set([...current, ...COMMITMENT_OPTIONS])),
                )
              }
              label={
                <Text className="text-sm leading-5 text-slate-700">
                  {t('breederProfile.commitments.combinedBefore')}
                  <Text
                    className="font-semibold text-blue-700"
                    onPress={() => void Linking.openURL(APP_LINKS.termsOfService)}
                  >
                    {t('breederProfile.commitments.termsLink')}
                  </Text>
                  {t('breederProfile.commitments.and')}
                  <Text
                    className="font-semibold text-blue-700"
                    onPress={() => void Linking.openURL(APP_LINKS.marketplaceGuidelines)}
                  >
                    {t('breederProfile.commitments.guidelinesLink')}
                  </Text>
                  {t('breederProfile.commitments.combinedAfter')}
                </Text>
              }
            />
          </View>
          {allCommitmentsAccepted ? (
            <Pressable testID="breeder-profile-save-button" className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={submit} disabled={submitting}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">{t('breederProfile.save')}</Text>
            </Pressable>
          ) : (
            <Text className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
              {t('breederProfile.commitmentsRequired')}
            </Text>
          )}
        </View>
      </ScrollView>
      <Modal visible={Boolean(submitDialog)} transparent animationType="fade" onRequestClose={() => setSubmitDialog(null)}>
        <View className="flex-1 items-center justify-center bg-slate-950/45 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-white p-5">
            <View className={`h-12 w-12 items-center justify-center rounded-full ${submitDialog?.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <Ionicons
                name={submitDialog?.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={26}
                color={submitDialog?.type === 'success' ? '#059669' : '#dc2626'}
              />
            </View>
            <Text className="mt-4 text-lg font-bold text-slate-900">{submitDialog?.title}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">{submitDialog?.message}</Text>
            {submitDialog?.type === 'success' ? (
              <Pressable
                className="mt-5 rounded-xl bg-blue-600 py-3 active:opacity-90"
                onPress={() => {
                  setSubmitDialog(null);
                  onBack();
                }}
              >
                <Text className="text-center text-sm font-bold text-white">{t('common.ok')}</Text>
              </Pressable>
            ) : (
              <View className="mt-5 flex-row gap-3">
                <Pressable className="flex-1 rounded-xl border border-slate-200 bg-white py-3 active:bg-slate-50" onPress={() => setSubmitDialog(null)}>
                  <Text className="text-center text-sm font-bold text-slate-700">{t('breederProfile.checkAndEdit')}</Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-xl bg-blue-600 py-3 active:opacity-90"
                  onPress={() => {
                    setSubmitDialog(null);
                    void submit();
                  }}
                >
                  <Text className="text-center text-sm font-bold text-white">{t('breederProfile.retry')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OptionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`rounded-full border px-3 py-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-slate-50'}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{label}</Text>
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
      className="flex-row items-start gap-3 rounded-xl bg-slate-50 p-3"
      onPress={onPress}
    >
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View className="min-w-0 flex-1">{typeof label === 'string' ? <Text className="text-sm leading-5 text-slate-700">{label}</Text> : label}</View>
    </Pressable>
  );
}
