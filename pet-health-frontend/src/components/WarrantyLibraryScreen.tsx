import { useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  createWarrantyPolicy,
  uploadWarrantyPolicyFile,
  updateWarrantyPolicy,
} from '../api';
import type { BreederProfile } from '../types';
import type { WarrantyPolicy } from '../utils/warrantyPolicy';
import { mapWarrantyPolicy } from '../utils/warrantyPolicy';
import {
  BUYER_GUIDELINE_OPTIONS,
  CARE_PARVO_DAY_OPTIONS,
  defaultWarrantyFormValues,
  EVIDENCE_OPTIONS,
  EXCLUSION_OPTIONS,
  MEDICAL_FEE_OPTIONS,
  REPORT_HOUR_OPTIONS,
  RESPONSE_HOUR_OPTIONS,
  toggleIdInList,
  VACCINE_SHOT_OPTIONS,
  warrantyFormToApiBody,
  warrantyPolicyToFormValues,
  type WarrantyPolicyFormValues,
} from '../utils/warrantyPolicyForm';
import {
  appendWarrantyVaccinePreset,
  resolveWarrantyFarmSpecies,
  warrantyInfectiousFieldKey,
  warrantyRapidTestEvidenceKey,
  warrantyVaccinePlaceholderKey,
  warrantyVaccinePresetIds,
  warrantyVaccinePresetLabelKey,
} from '../utils/warrantySpeciesCopy';

const FARM_ACCENT = '#D97706';

type WarrantyLibraryScreenProps = {
  token: string;
  primarySpecies?: string[];
  editPolicy?: WarrantyPolicy | null;
  onBack: () => void;
  onSaved: (
    policy: WarrantyPolicy,
    meta?: { trustAwarded?: boolean; profile?: BreederProfile },
  ) => void;
};

const INPUT_CLASS = 'rounded-xl border border-[#F0E6D8] bg-white px-4 py-2.5 text-sm text-[#2B1E19]';
const LABEL_CLASS = 'text-xs font-medium text-[#6E5A51]';

function ChipOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full border px-3 py-1.5 ${
        active ? 'border-[#D97706] bg-[#FFF7ED]' : 'border-[#E8DFD0] bg-[#FDF8F0]'
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-[#B45309]' : 'text-[#5C4A3A]'}`}>{label}</Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className={LABEL_CLASS}>{children}</Text>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-[#F3E2C8] bg-white p-4">
      <Text className="text-xs font-bold uppercase tracking-wide text-[#B45309]">{title}</Text>
      <View className="mt-3">{children}</View>
    </View>
  );
}

function ChecklistRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable className="mb-2 flex-row items-start gap-2" onPress={onPress}>
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
          checked ? 'border-[#D97706] bg-[#D97706]' : 'border-slate-300 bg-white'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <Text className="flex-1 text-sm text-[#5C4A3A]">{label}</Text>
    </Pressable>
  );
}

export function WarrantyLibraryScreen({
  token,
  primarySpecies = [],
  editPolicy = null,
  onBack,
  onSaved,
}: WarrantyLibraryScreenProps) {
  const { t } = useTranslation();
  const species = resolveWarrantyFarmSpecies({ primarySpecies });
  const isUploadedFileEdit = Boolean(editPolicy?.fileUrl);
  const [values, setValues] = useState<WarrantyPolicyFormValues>(() =>
    editPolicy ? warrantyPolicyToFormValues(editPolicy) : defaultWarrantyFormValues(),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titleError, setTitleError] = useState('');
  const isEdit = Boolean(editPolicy?.id);
  const [entryMode, setEntryMode] = useState<'none' | 'form'>(() => (isEdit ? 'form' : 'none'));
  const presets = useMemo(() => warrantyVaccinePresetIds(species), [species]);
  const careParvoPreset = CARE_PARVO_DAY_OPTIONS.includes(values.careParvoCoverageDays as 7 | 14 | 30)
    ? String(values.careParvoCoverageDays)
    : 'other';

  function patch(next: Partial<WarrantyPolicyFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  async function save() {
    if (!values.title.trim()) {
      setTitleError(t('warranty.library.formRequired'));
      return;
    }
    setTitleError('');
    setSaving(true);
    try {
      const body = warrantyFormToApiBody(values);
      const result = isEdit
        ? await updateWarrantyPolicy(token, editPolicy!.id, body)
        : await createWarrantyPolicy(token, body);
      const policy = mapWarrantyPolicy(result.data);
      if (!policy) throw new Error(t('common.unknownError'));
      onSaved(policy, {
        trustAwarded: !isEdit && 'trust_awarded' in result ? Boolean(result.trust_awarded) : undefined,
        profile: result.profile,
      });
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.unknownError'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function pickAndUploadPolicy() {
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uploadResult = await uploadWarrantyPolicyFile(token, {
        title: asset.name?.replace(/\.[^.]+$/, '') || '',
        fileUri: asset.uri,
        fileName: asset.name || `warranty-policy-${Date.now()}`,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
      if (!uploadResult.data) throw new Error(t('common.unknownError'));
      Alert.alert(t('common.ok'), t('account.breederDetails.saved'));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.unknownError'),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <View testID="warranty-library-screen" className="flex-1 bg-[#FDFBF7]">
      <View className="flex-row items-center border-b border-[#F3E2C8] bg-white px-2 py-2">
        <Pressable className="w-14 rounded-lg p-2" onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-extrabold text-[#2B1E19]" numberOfLines={1}>
          {t(isEdit ? 'warranty.library.edit' : 'warranty.library.title')}
        </Text>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-[#F3E2C8] bg-white p-5">
          <Text className="text-lg font-bold text-[#2B1E19]">{t('warranty.library.title')}</Text>
          {!isEdit ? (
            <>
              <Text className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {t('warranty.library.trustHint')}
              </Text>
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  testID="warranty-library-upload-button"
                  disabled={uploading}
                  onPress={() => void pickAndUploadPolicy()}
                  className="flex-1 items-center rounded-xl border border-[#F3E2C8] bg-[#FDF8F0] px-4 py-3"
                >
                  <Text className="text-sm font-bold text-[#8A5A16]">
                    {uploading ? t('common.loading') : t('warranty.library.upload')}
                  </Text>
                </Pressable>
                <Pressable
                  testID="warranty-library-create-button"
                  onPress={() => setEntryMode('form')}
                  className="flex-1 items-center rounded-xl px-4 py-3"
                  style={{ backgroundColor: FARM_ACCENT }}
                >
                  <Text className="text-sm font-bold text-white">
                    {t('warranty.library.createNew')}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>

        {isEdit || entryMode === 'form' ? (
        <View className="mt-5 rounded-2xl border border-[#F3E2C8] bg-white p-5">
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <Text className="text-sm font-semibold text-[#2B1E19]">
              {t(isEdit ? 'warranty.library.edit' : 'warranty.library.title')}
            </Text>
          </View>

          {isEdit || entryMode === 'form' ? (
            <>
              {isUploadedFileEdit ? (
                <View className="rounded-xl border border-[#F3E2C8] bg-[#FFFBF5] p-4">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#B45309]">
                    {t('warranty.viewer.uploadedTitle')}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-[#6E5A51]">
                    {t('warranty.viewer.uploadedBody')}
                  </Text>
                  <Pressable
                    className="mt-4 items-center rounded-xl bg-[#D97706] px-4 py-3"
                    onPress={() => {
                      if (editPolicy?.fileUrl) void Linking.openURL(editPolicy.fileUrl);
                    }}
                  >
                    <Text className="text-sm font-bold text-white">{t('warranty.viewer.openFile')}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
              <FieldLabel>
                {t('warranty.library.name')} <Text className="text-red-500">*</Text>
              </FieldLabel>
              <TextInput
                className={`mt-1.5 ${INPUT_CLASS} ${titleError ? 'border-red-400' : ''}`}
                value={values.title}
                onChangeText={(title) => {
                  setTitleError('');
                  patch({ title });
                }}
                placeholder={t('warranty.library.name')}
                placeholderTextColor="#94A3B8"
              />
              {titleError ? <Text className="mt-1.5 text-xs font-semibold text-red-600">{titleError}</Text> : null}

              <View className="mt-5 gap-4">
            <SectionCard title={`1. ${t('warranty.pillar.handover')}`}>
              <FieldLabel>{t('warranty.field.vaccineShots')}</FieldLabel>
              <View className="mt-1.5 mb-3 flex-row flex-wrap">
                {VACCINE_SHOT_OPTIONS.map((n) => (
                  <ChipOption
                    key={n}
                    label={String(n)}
                    active={values.vaccineShotsCount === n}
                    onPress={() => patch({ vaccineShotsCount: n })}
                  />
                ))}
              </View>

              <FieldLabel>{t('warranty.field.vaccineTypes')}</FieldLabel>
              <TextInput
                className={`mt-1.5 mb-2 ${INPUT_CLASS}`}
                value={values.vaccineTypes}
                onChangeText={(vaccineTypes) => patch({ vaccineTypes })}
                placeholder={t(warrantyVaccinePlaceholderKey(species))}
                placeholderTextColor="#94A3B8"
              />
              <View className="mb-3 flex-row flex-wrap">
                {presets.map((id) => (
                  <ChipOption
                    key={id}
                    label={t(warrantyVaccinePresetLabelKey(id))}
                    active={values.vaccineTypes.toLowerCase().includes(t(warrantyVaccinePresetLabelKey(id)).toLowerCase())}
                    onPress={() =>
                      patch({
                        vaccineTypes: appendWarrantyVaccinePreset(
                          values.vaccineTypes,
                          t(warrantyVaccinePresetLabelKey(id)),
                        ),
                      })
                    }
                  />
                ))}
              </View>

              <FieldLabel>{t('warranty.field.deworming')}</FieldLabel>
              <TextInput
                className={`mt-1.5 mb-3 ${INPUT_CLASS}`}
                value={values.dewormingNote}
                onChangeText={(dewormingNote) => patch({ dewormingNote })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />

              <ChecklistRow
                label={t('warranty.field.healthBook')}
                checked={values.hasHealthBook}
                onPress={() => patch({ hasHealthBook: !values.hasHealthBook })}
              />
            </SectionCard>

            <SectionCard title={`2. ${t('warranty.pillar.coverage')}`}>
              <FieldLabel>{t(warrantyInfectiousFieldKey(species))}</FieldLabel>
              <View className="mt-1.5 mb-3 flex-row flex-wrap">
                {CARE_PARVO_DAY_OPTIONS.map((n) => (
                  <ChipOption
                    key={n}
                    label={`${n}d`}
                    active={values.careParvoCoverageDays === n}
                    onPress={() => patch({ careParvoCoverageDays: n })}
                  />
                ))}
                <ChipOption
                  label={t('warranty.value.other')}
                  active={careParvoPreset === 'other'}
                  onPress={() =>
                    patch({
                      careParvoCoverageDays: CARE_PARVO_DAY_OPTIONS.includes(values.careParvoCoverageDays as 7 | 14 | 30)
                        ? 45
                        : values.careParvoCoverageDays > 0
                          ? values.careParvoCoverageDays
                          : 45,
                    })
                  }
                />
              </View>
              {careParvoPreset === 'other' ? (
                <View className="relative">
                  <TextInput
                    className={`${INPUT_CLASS} pr-16`}
                    value={String(values.careParvoCoverageDays || '')}
                    onChangeText={(text) =>
                      patch({ careParvoCoverageDays: Math.max(1, Number(text.replace(/[^\d]/g, '')) || 1) })
                    }
                    placeholder="45"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                  />
                  <View className="absolute bottom-0 right-4 top-0 justify-center">
                    <Text className="text-sm font-medium text-[#6E5A51]">
                      {t('warranty.value.dayUnit')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title={`3. ${t('warranty.pillar.buyer')}`}>
              <FieldLabel>{t('warranty.field.reportHours')}</FieldLabel>
              <View className="mt-1.5 mb-3 flex-row flex-wrap">
                {REPORT_HOUR_OPTIONS.map((n) => (
                  <ChipOption
                    key={n}
                    label={`${n}h`}
                    active={values.reportWithinHours === n}
                    onPress={() => patch({ reportWithinHours: n })}
                  />
                ))}
              </View>

              <FieldLabel>{t('warranty.field.vet')}</FieldLabel>
              <View className="mt-1.5 mb-3 flex-row flex-wrap">
                {(['licensed', 'farm_designated', 'either'] as const).map((id) => (
                  <ChipOption
                    key={id}
                    label={t(`warranty.vet.${id}`)}
                    active={values.vetRequirement === id}
                    onPress={() => patch({ vetRequirement: id })}
                  />
                ))}
              </View>

              <FieldLabel>{t('warranty.field.guidelines')}</FieldLabel>
              <View className="mt-2">
                {BUYER_GUIDELINE_OPTIONS.map((id) => (
                  <ChecklistRow
                    key={id}
                    label={t(`warranty.guideline.${id}`)}
                    checked={values.buyerGuidelines.includes(id)}
                    onPress={() => patch({ buyerGuidelines: toggleIdInList(values.buyerGuidelines, id) })}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard title={`4. ${t('warranty.pillar.exclusions')}`}>
              <View>
                {EXCLUSION_OPTIONS.map((id) => (
                  <ChecklistRow
                    key={id}
                    label={t(`warranty.exclusion.${id}`)}
                    checked={values.exclusions.includes(id)}
                    onPress={() => patch({ exclusions: toggleIdInList(values.exclusions, id) })}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard title={`5. ${t('warranty.pillar.remedies')}`}>
              <FieldLabel>{t('warranty.field.medicalFee')}</FieldLabel>
              <View className="mt-1.5 mb-3 flex-row flex-wrap">
                {MEDICAL_FEE_OPTIONS.map((n) => (
                  <ChipOption
                    key={n}
                    label={`${n}%`}
                    active={values.medicalFeeSupportPercent === n}
                    onPress={() => patch({ medicalFeeSupportPercent: n })}
                  />
                ))}
              </View>

              <ChecklistRow
                label={t('warranty.field.swap')}
                checked={values.allowEquivalentSwap}
                onPress={() => patch({ allowEquivalentSwap: !values.allowEquivalentSwap })}
              />

              <View className="mt-1">
                <FieldLabel>{t('warranty.field.shipping')}</FieldLabel>
                <View className="mt-1.5 flex-row flex-wrap">
                  {(['buyer', 'breeder', 'split'] as const).map((id) => (
                    <ChipOption
                      key={id}
                      label={t(`warranty.shipping.${id}`)}
                      active={values.shippingParty === id}
                      onPress={() => patch({ shippingParty: id })}
                    />
                  ))}
                </View>
              </View>
            </SectionCard>

            <SectionCard title={`6. ${t('warranty.pillar.claim')}`}>
              <FieldLabel>{t('warranty.field.evidence')}</FieldLabel>
              <View className="mt-2 mb-3">
                {EVIDENCE_OPTIONS.map((id) => {
                  const key = id === 'rapid_test_photo' ? warrantyRapidTestEvidenceKey(species) : `warranty.evidence.${id}`;
                  return (
                    <ChecklistRow
                      key={id}
                      label={t(key)}
                      checked={values.evidenceRequired.includes(id)}
                      onPress={() => patch({ evidenceRequired: toggleIdInList(values.evidenceRequired, id) })}
                    />
                  );
                })}
              </View>

              <FieldLabel>{t('warranty.field.responseHours')}</FieldLabel>
              <View className="mt-1.5 flex-row flex-wrap">
                {RESPONSE_HOUR_OPTIONS.map((n) => (
                  <ChipOption
                    key={n}
                    label={`${n}h`}
                    active={values.breederResponseHours === n}
                    onPress={() => patch({ breederResponseHours: n })}
                  />
                ))}
              </View>
            </SectionCard>
              </View>

              <Pressable
                testID="warranty-library-save-button"
                disabled={saving}
                onPress={() => void save()}
                style={{
                  backgroundColor: saving ? '#FDBA74' : FARM_ACCENT,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 20,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {saving
                    ? t('common.loading')
                    : t(isEdit ? 'warranty.library.update' : 'warranty.library.save')}
                </Text>
              </Pressable>
                </>
              )}
            </>
          ) : null}
        </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
