import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WarrantyPolicy } from '../utils/warrantyPolicy';
import { formatDewormingDateLabel } from '../utils/warrantyPolicyForm';
import {
  formatVaccineShotLabel,
  warrantyCoverageRows,
  warrantyHandoverCards,
  warrantySummaryChips,
} from '../utils/warrantyPolicyView';
import {
  resolveWarrantyFarmSpecies,
  warrantyInfectiousSummaryKey,
  warrantyRapidTestEvidenceKey,
  type WarrantyFarmSpecies,
} from '../utils/warrantySpeciesCopy';

type WarrantyPolicyViewerProps = {
  visible: boolean;
  policy: WarrantyPolicy | null;
  primarySpecies?: string[];
  onClose: () => void;
};

function fillN(template: string, n: number | string) {
  return template.replace(/\{\{?n\}?\}/g, String(n)).replace('{n}', String(n));
}

export function WarrantyPolicyViewer({
  visible,
  policy,
  primarySpecies = [],
  onClose,
}: WarrantyPolicyViewerProps) {
  const { t } = useTranslation();
  if (!policy) return null;
  const species: WarrantyFarmSpecies = resolveWarrantyFarmSpecies({ primarySpecies });
  const chips = warrantySummaryChips(policy);
  const handover = warrantyHandoverCards(policy);
  const coverage = warrantyCoverageRows(policy, species);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <View className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
          <View className="mb-3 self-center rounded-full bg-gray-200 px-10 py-1" />
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-extrabold text-[#2B1E19]">🛡️ {policy.title}</Text>
              <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#D97706]">
                {t('warranty.viewer.healthTitle')}
              </Text>
            </View>
            <Pressable accessibilityRole="button" className="rounded-lg px-2 py-1" onPress={onClose}>
              <Text className="text-sm font-semibold text-slate-500">{t('warranty.close')}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {chips.length > 0 ? (
              <View className="mb-4 flex-row flex-wrap gap-2">
                {chips.map((chip) => {
                  let label = '';
                  if (chip.id === 'vaccine') {
                    label = formatVaccineShotLabel(t('warranty.value.shots'), chip.shots, chip.vaccineTypes);
                  } else if (chip.id === 'careParvo') {
                    label = fillN(t(warrantyInfectiousSummaryKey(species)), chip.days);
                  } else {
                    label = fillN(t('warranty.viewer.summaryMedicalFee'), chip.percent);
                  }
                  return (
                    <View
                      key={chip.id}
                      className="rounded-full border border-[#F3E2C8] bg-[#FFF8EF] px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-[#2B1E19]">
                        {chip.icon} {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              📦 {t('warranty.pillar.handover')}
            </Text>
            <View className="mb-4 gap-2">
              {handover.map((card) => {
                let label = '';
                let value = '';
                if (card.id === 'vaccine') {
                  label = t('warranty.field.vaccineShots');
                  value = formatVaccineShotLabel(
                    t('warranty.value.shots'),
                    Number(policy.vaccineShotsCount) || 0,
                    policy.vaccineTypes,
                  );
                } else if (card.id === 'deworming') {
                  label = t('warranty.field.deworming');
                  value = formatDewormingDateLabel(String(policy.dewormingNote || ''));
                } else {
                  label = t('warranty.field.healthBook');
                  value = policy.hasHealthBook ? t('warranty.value.yes') : t('warranty.value.no');
                }
                return (
                  <View key={card.id} className="rounded-xl border border-[#F3E2C8] bg-[#FFFBF5] px-3 py-2.5">
                    <Text className="text-xs font-semibold text-[#6E5A51]">
                      {card.icon} {label}
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-[#2B1E19]">{value}</Text>
                  </View>
                );
              })}
            </View>

            <Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              ⏱️ {t('warranty.pillar.coverage')}
            </Text>
            <View className="mb-4 gap-2">
              {coverage.map((row) => (
                <View
                  key={row.id}
                  className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <Text className="min-w-0 flex-1 text-sm text-[#5C4A3A]">{t(row.fieldKey)}</Text>
                  <Text className="ml-2 text-xs font-bold text-[#D97706]">
                    {fillN(t('warranty.value.days'), row.days)}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              👤 {t('warranty.pillar.buyer')}
            </Text>
            <Text className="mb-1 text-sm text-[#5C4A3A]">
              {t('warranty.field.reportHours')}:{' '}
              <Text className="font-bold">{fillN(t('warranty.value.hours'), policy.reportWithinHours || 0)}</Text>
            </Text>
            <Text className="mb-2 text-sm text-[#5C4A3A]">
              {t('warranty.field.vet')}:{' '}
              <Text className="font-bold">{t(`warranty.vet.${policy.vetRequirement || 'licensed'}`)}</Text>
            </Text>
            {(policy.buyerGuidelines || []).map((id) => (
              <Text key={id} className="mb-1 text-sm text-[#5C4A3A]">
                ✓ {t(`warranty.guideline.${id}`)}
              </Text>
            ))}

            <Text className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              ✕ {t('warranty.pillar.exclusions')}
            </Text>
            {(policy.exclusions || []).map((id) => (
              <Text key={id} className="mb-1 text-sm text-[#5C4A3A]">
                ✕ {t(`warranty.exclusion.${id}`)}
              </Text>
            ))}

            <Text className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              💰 {t('warranty.pillar.remedies')}
            </Text>
            <Text className="mb-1 text-sm text-[#5C4A3A]">
              {t('warranty.field.medicalFee')}:{' '}
              <Text className="font-bold">{policy.medicalFeeSupportPercent ?? 0}%</Text>
            </Text>
            <Text className="mb-1 text-sm text-[#5C4A3A]">
              {t('warranty.field.swap')}:{' '}
              <Text className="font-bold">
                {policy.allowEquivalentSwap ? t('warranty.value.yes') : t('warranty.value.no')}
              </Text>
            </Text>
            <Text className="mb-1 text-sm text-[#5C4A3A]">
              {t('warranty.field.shipping')}:{' '}
              <Text className="font-bold">{t(`warranty.shipping.${policy.shippingParty || 'split'}`)}</Text>
            </Text>

            <Text className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-[#2B1E19]">
              📋 {t('warranty.pillar.claim')}
            </Text>
            <Text className="mb-2 text-sm text-[#5C4A3A]">
              {t('warranty.field.responseHours')}:{' '}
              <Text className="font-bold">
                {fillN(t('warranty.value.hours'), policy.breederResponseHours || 0)}
              </Text>
            </Text>
            {(policy.evidenceRequired || []).map((id) => {
              const key =
                id === 'rapid_test_photo' ? warrantyRapidTestEvidenceKey(species) : `warranty.evidence.${id}`;
              return (
                <Text key={id} className="mb-1 text-sm text-[#5C4A3A]">
                  ✓ {t(key)}
                </Text>
              );
            })}
            <View className="h-6" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
