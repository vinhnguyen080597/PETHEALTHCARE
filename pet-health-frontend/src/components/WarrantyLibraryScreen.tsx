import { useMemo, useState } from 'react';
import {
  Alert,
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
  updateWarrantyPolicy,
} from '../api';
import type { BreederProfile } from '../types';
import type { WarrantyPolicy } from '../utils/warrantyPolicy';
import { mapWarrantyPolicy } from '../utils/warrantyPolicy';
import {
  BUYER_GUIDELINE_OPTIONS,
  CARE_PARVO_DAY_OPTIONS,
  CONGENITAL_DAY_OPTIONS,
  defaultWarrantyFormValues,
  EVIDENCE_OPTIONS,
  EXCLUSION_OPTIONS,
  MEDICAL_FEE_OPTIONS,
  REPORT_HOUR_OPTIONS,
  RESPIRATORY_DAY_OPTIONS,
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
  warrantyRespiratoryFieldKey,
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
        active ? 'border-[#D97706] bg-[#FFF7ED]' : 'border-slate-200 bg-white'
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-[#B45309]' : 'text-slate-700'}`}>{label}</Text>
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
  const [values, setValues] = useState<WarrantyPolicyFormValues>(() =>
    editPolicy ? warrantyPolicyToFormValues(editPolicy) : defaultWarrantyFormValues(),
  );
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const isEdit = Boolean(editPolicy?.id);
  const presets = useMemo(() => warrantyVaccinePresetIds(species), [species]);

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
        trustAwarded: !isEdit ? Boolean(result.trust_awarded) : undefined,
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
        <Text className="mb-3 text-sm leading-5 text-[#6E5A51]">{t('warranty.library.subtitle')}</Text>
        {!isEdit ? (
          <Text className="mb-4 text-xs leading-4 text-[#B45309]">{t('warranty.library.trustHint')}</Text>
        ) : null}

        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">
          {t('warranty.library.name')} <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className={`mb-1 rounded-xl border bg-white px-3 py-3 text-sm text-[#2B1E19] ${
            titleError ? 'border-red-400' : 'border-slate-200'
          }`}
          value={values.title}
          onChangeText={(title) => {
            setTitleError('');
            patch({ title });
          }}
          placeholder={t('warranty.library.name')}
          placeholderTextColor="#94A3B8"
        />
        {titleError ? <Text className="mb-3 text-xs font-semibold text-red-600">{titleError}</Text> : <View className="mb-3" />}

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">1. {t('warranty.pillar.handover')}</Text>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.vaccineShots')}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {VACCINE_SHOT_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={String(n)}
              active={values.vaccineShotsCount === n}
              onPress={() => patch({ vaccineShotsCount: n })}
            />
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.vaccineTypes')}</Text>
        <TextInput
          className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#2B1E19]"
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
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.deworming')}</Text>
        <TextInput
          className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#2B1E19]"
          value={values.dewormingNote}
          onChangeText={(dewormingNote) => patch({ dewormingNote })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
        />
        <Pressable
          className="mb-4 flex-row items-center gap-2"
          onPress={() => patch({ hasHealthBook: !values.hasHealthBook })}
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              values.hasHealthBook ? 'border-[#D97706] bg-[#D97706]' : 'border-slate-300 bg-white'
            }`}
          >
            {values.hasHealthBook ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text className="text-sm text-[#2B1E19]">{t('warranty.field.healthBook')}</Text>
        </Pressable>

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">2. {t('warranty.pillar.coverage')}</Text>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t(warrantyInfectiousFieldKey(species))}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {CARE_PARVO_DAY_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}d`}
              active={values.careParvoCoverageDays === n}
              onPress={() => patch({ careParvoCoverageDays: n })}
            />
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t(warrantyRespiratoryFieldKey(species))}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {RESPIRATORY_DAY_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}d`}
              active={values.respiratorySkinCoverageDays === n}
              onPress={() => patch({ respiratorySkinCoverageDays: n })}
            />
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.congenital')}</Text>
        <View className="mb-4 flex-row flex-wrap">
          {CONGENITAL_DAY_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}d`}
              active={values.congenitalCoverageDays === n}
              onPress={() => patch({ congenitalCoverageDays: n })}
            />
          ))}
        </View>

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">3. {t('warranty.pillar.buyer')}</Text>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.reportHours')}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {REPORT_HOUR_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}h`}
              active={values.reportWithinHours === n}
              onPress={() => patch({ reportWithinHours: n })}
            />
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.vet')}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {(['licensed', 'farm_designated', 'either'] as const).map((id) => (
            <ChipOption
              key={id}
              label={t(`warranty.vet.${id}`)}
              active={values.vetRequirement === id}
              onPress={() => patch({ vetRequirement: id })}
            />
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.guidelines')}</Text>
        <View className="mb-4">
          {BUYER_GUIDELINE_OPTIONS.map((id) => (
            <Pressable
              key={id}
              className="mb-2 flex-row items-start gap-2"
              onPress={() => patch({ buyerGuidelines: toggleIdInList(values.buyerGuidelines, id) })}
            >
              <Text className="text-[#D97706]">{values.buyerGuidelines.includes(id) ? '☑' : '☐'}</Text>
              <Text className="flex-1 text-sm text-[#2B1E19]">{t(`warranty.guideline.${id}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">4. {t('warranty.pillar.exclusions')}</Text>
        <View className="mb-4">
          {EXCLUSION_OPTIONS.map((id) => (
            <Pressable
              key={id}
              className="mb-2 flex-row items-start gap-2"
              onPress={() => patch({ exclusions: toggleIdInList(values.exclusions, id) })}
            >
              <Text className="text-[#D97706]">{values.exclusions.includes(id) ? '☑' : '☐'}</Text>
              <Text className="flex-1 text-sm text-[#2B1E19]">{t(`warranty.exclusion.${id}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">5. {t('warranty.pillar.remedies')}</Text>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.medicalFee')}</Text>
        <View className="mb-3 flex-row flex-wrap">
          {MEDICAL_FEE_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}%`}
              active={values.medicalFeeSupportPercent === n}
              onPress={() => patch({ medicalFeeSupportPercent: n })}
            />
          ))}
        </View>
        <Pressable
          className="mb-3 flex-row items-center gap-2"
          onPress={() => patch({ allowEquivalentSwap: !values.allowEquivalentSwap })}
        >
          <Text className="text-[#D97706]">{values.allowEquivalentSwap ? '☑' : '☐'}</Text>
          <Text className="flex-1 text-sm text-[#2B1E19]">{t('warranty.field.swap')}</Text>
        </Pressable>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.shipping')}</Text>
        <View className="mb-4 flex-row flex-wrap">
          {(['buyer', 'breeder', 'split'] as const).map((id) => (
            <ChipOption
              key={id}
              label={t(`warranty.shipping.${id}`)}
              active={values.shippingParty === id}
              onPress={() => patch({ shippingParty: id })}
            />
          ))}
        </View>

        <Text className="mb-2 text-xs font-extrabold uppercase text-[#2B1E19]">6. {t('warranty.pillar.claim')}</Text>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.evidence')}</Text>
        <View className="mb-3">
          {EVIDENCE_OPTIONS.map((id) => {
            const key = id === 'rapid_test_photo' ? warrantyRapidTestEvidenceKey(species) : `warranty.evidence.${id}`;
            return (
              <Pressable
                key={id}
                className="mb-2 flex-row items-start gap-2"
                onPress={() => patch({ evidenceRequired: toggleIdInList(values.evidenceRequired, id) })}
              >
                <Text className="text-[#D97706]">{values.evidenceRequired.includes(id) ? '☑' : '☐'}</Text>
                <Text className="flex-1 text-sm text-[#2B1E19]">{t(key)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mb-1 text-xs font-semibold text-[#6E5A51]">{t('warranty.field.responseHours')}</Text>
        <View className="mb-5 flex-row flex-wrap">
          {RESPONSE_HOUR_OPTIONS.map((n) => (
            <ChipOption
              key={n}
              label={`${n}h`}
              active={values.breederResponseHours === n}
              onPress={() => patch({ breederResponseHours: n })}
            />
          ))}
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
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
            {saving
              ? t('common.loading')
              : t(isEdit ? 'warranty.library.update' : 'warranty.library.save')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
