import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACTIVE_BREEDER_SPECIES_OPTIONS } from '../constants/petSpecies';
import type { BreederProfile, UpsertBreederProfilePayload } from '../types';

const PRIMARY = '#1E6FE8';

type BreederType = 'registered_kennel' | 'home_breeder' | 'rescue_foster' | 'rehoming' | 'other';
type ScaleRange = '1_3' | '4_10' | '11_20' | '20_plus';
type BreedingPetRange = 'none' | '1_3' | '4_10' | '10_plus';

const BREEDER_TYPES: BreederType[] = ['registered_kennel', 'home_breeder', 'rescue_foster', 'rehoming', 'other'];
const SPECIES_OPTIONS = [...ACTIVE_BREEDER_SPECIES_OPTIONS];
const SCALE_OPTIONS: ScaleRange[] = ['1_3', '4_10', '11_20', '20_plus'];
const BREEDING_PET_OPTIONS: BreedingPetRange[] = ['none', '1_3', '4_10', '10_plus'];
const CARE_CHECKLIST_OPTIONS = [
  'vaccination_schedule',
  'deworming_schedule',
  'vet_records',
  'environment_media',
  'in_person_meet',
] as const;
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
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [primarySpecies, setPrimarySpecies] = useState<string[]>(
    profile?.primary_species?.length ? profile.primary_species : [...ACTIVE_BREEDER_SPECIES_OPTIONS],
  );
  const [mainBreeds, setMainBreeds] = useState((profile?.main_breeds ?? []).join(', '));
  const [careEnvironment, setCareEnvironment] = useState(profile?.care_environment ?? '');
  const [facebook, setFacebook] = useState(String(profile?.contact?.facebook ?? ''));
  const [zalo, setZalo] = useState(String(profile?.contact?.zalo ?? ''));
  const [phone, setPhone] = useState(String(profile?.contact?.phone ?? ''));
  const [breederType, setBreederType] = useState<BreederType>((metadataString(metadata, 'breederType') as BreederType) || 'home_breeder');
  const [registeredAt, setRegisteredAt] = useState(metadataString(metadata, 'registeredAt'));
  const [registeredKennelName, setRegisteredKennelName] = useState(metadataString(metadata, 'registeredKennelName'));
  const [scaleRange, setScaleRange] = useState<ScaleRange>((metadataString(metadata, 'scaleRange') as ScaleRange) || '1_3');
  const [breedingPetRange, setBreedingPetRange] = useState<BreedingPetRange>((metadataString(metadata, 'breedingPetRange') as BreedingPetRange) || 'none');
  const [careChecklist, setCareChecklist] = useState<string[]>(metadataArray(metadata, 'careChecklist'));
  const [commitments, setCommitments] = useState<string[]>(metadataArray(metadata, 'transparencyCommitments'));
  const [submitting, setSubmitting] = useState(false);
  const [submitDialog, setSubmitDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const allCommitmentsAccepted = COMMITMENT_OPTIONS.every((item) => commitments.includes(item));

  useEffect(() => {
    const nextMetadata = profile?.metadata ?? {};
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setPrimarySpecies(profile?.primary_species?.length ? profile.primary_species : [...ACTIVE_BREEDER_SPECIES_OPTIONS]);
    setMainBreeds((profile?.main_breeds ?? []).join(', '));
    setCareEnvironment(profile?.care_environment ?? '');
    setFacebook(String(profile?.contact?.facebook ?? ''));
    setZalo(String(profile?.contact?.zalo ?? ''));
    setPhone(String(profile?.contact?.phone ?? ''));
    setBreederType((metadataString(nextMetadata, 'breederType') as BreederType) || 'home_breeder');
    setRegisteredAt(metadataString(nextMetadata, 'registeredAt'));
    setRegisteredKennelName(metadataString(nextMetadata, 'registeredKennelName'));
    setScaleRange((metadataString(nextMetadata, 'scaleRange') as ScaleRange) || '1_3');
    setBreedingPetRange((metadataString(nextMetadata, 'breedingPetRange') as BreedingPetRange) || 'none');
    setCareChecklist(metadataArray(nextMetadata, 'careChecklist'));
    setCommitments(metadataArray(nextMetadata, 'transparencyCommitments'));
  }, [profile]);

  async function submit() {
    setSubmitting(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        contact: { facebook: facebook.trim(), zalo: zalo.trim(), phone: phone.trim() },
        primarySpecies: primarySpecies.length ? primarySpecies : [...ACTIVE_BREEDER_SPECIES_OPTIONS],
        mainBreeds: splitList(mainBreeds),
        careEnvironment: careEnvironment.trim(),
        metadata: {
          ...metadata,
          breederType,
          registeredAt: registeredAt.trim(),
          registeredKennelName: registeredKennelName.trim(),
          scaleRange,
          breedingPetRange,
          careChecklist,
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

  return (
    <View testID="breeder-profile-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <Pressable testID="breeder-profile-back-button" className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('breederProfile.title')}</Text>
        <View className="w-14" />
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
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

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.profileInfo')}</Text>
          {profile?.verification_status ? (
            <Text className="mt-2 text-sm font-semibold text-slate-600">{t(`account.breederRequestStatus.${profile.verification_status}`)}</Text>
          ) : null}
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.displayName')} value={displayName} onChangeText={setDisplayName} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.location')} value={location} onChangeText={setLocation} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Facebook URL" autoCapitalize="none" value={facebook} onChangeText={setFacebook} />
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder="Zalo / phone" keyboardType="phone-pad" value={zalo} onChangeText={setZalo} />
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.applicationType')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {BREEDER_TYPES.map((item) => (
              <OptionChip key={item} label={t(`breederProfile.breederTypes.${item}`)} active={breederType === item} onPress={() => setBreederType(item)} />
            ))}
          </View>
          {breederType === 'registered_kennel' ? (
            <View className="mt-3">
              <TextInput className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.registeredAt')} value={registeredAt} onChangeText={setRegisteredAt} />
              <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.registeredKennelName')} value={registeredKennelName} onChangeText={setRegisteredKennelName} />
            </View>
          ) : null}
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.scaleAndSpecies')}</Text>
          <Text className="mt-3 text-xs font-bold uppercase text-slate-500">{t('breederProfile.primarySpecies')}</Text>
          {SPECIES_OPTIONS.length > 1 ? (
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SPECIES_OPTIONS.map((item) => (
                <OptionChip key={item} label={t(`breederProfile.speciesOptions.${item}`)} active={primarySpecies.includes(item)} onPress={() => setPrimarySpecies((current) => toggleArrayValue(current, item))} />
              ))}
            </View>
          ) : (
            <View className="mt-2 self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <Text className="text-sm font-semibold text-slate-800">{t('breederProfile.speciesOptions.cat')}</Text>
            </View>
          )}
          <TextInput className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.mainBreeds')} value={mainBreeds} onChangeText={setMainBreeds} />
          <Text className="mt-3 text-xs font-bold uppercase text-slate-500">{t('breederProfile.scaleRange')}</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {SCALE_OPTIONS.map((item) => (
              <OptionChip key={item} label={t(`breederProfile.scaleOptions.${item}`)} active={scaleRange === item} onPress={() => setScaleRange(item)} />
            ))}
          </View>
          <Text className="mt-3 text-xs font-bold uppercase text-slate-500">{t('breederProfile.breedingPetRange')}</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {BREEDING_PET_OPTIONS.map((item) => (
              <OptionChip key={item} label={t(`breederProfile.breedingPetOptions.${item}`)} active={breedingPetRange === item} onPress={() => setBreedingPetRange(item)} />
            ))}
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.careAndTrust')}</Text>
          <TextInput className="mt-3 min-h-[86px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.bio')} multiline textAlignVertical="top" value={bio} onChangeText={setBio} />
          <TextInput className="mt-3 min-h-[86px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900" placeholder={t('breederProfile.careEnvironment')} multiline textAlignVertical="top" value={careEnvironment} onChangeText={setCareEnvironment} />
          <View className="mt-3 gap-2">
            {CARE_CHECKLIST_OPTIONS.map((item) => (
              <CheckboxRow key={item} label={t(`breederProfile.careChecklist.${item}`)} checked={careChecklist.includes(item)} onPress={() => setCareChecklist((current) => toggleArrayValue(current, item))} />
            ))}
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('breederProfile.commitmentsTitle')}</Text>
          <View className="mt-3 gap-2">
            {COMMITMENT_OPTIONS.map((item) => (
              <CheckboxRow key={item} label={t(`breederProfile.commitments.${item}`)} checked={commitments.includes(item)} onPress={() => setCommitments((current) => toggleArrayValue(current, item))} />
            ))}
          </View>
          {allCommitmentsAccepted ? (
            <Pressable testID="breeder-profile-save-button" className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
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

function CheckboxRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
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
      <Text className="min-w-0 flex-1 text-sm leading-5 text-slate-700">{label}</Text>
    </Pressable>
  );
}
