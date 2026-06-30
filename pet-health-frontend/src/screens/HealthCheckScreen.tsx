import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';
import { isBreedRecognitionSpecies } from '../constants/petBreedRecognitionSlots';
import { RewardedAdOffer } from '../components/RewardedAdOffer';
import { getSpendableCreditsForFeature, hasCreditsForFeature } from '../utils/aiCredits';
import type { AiCreditAccount, Pet } from '../types';

const PRIMARY = '#1E6FE8';
const INFO_BG = '#E8F1FE';
const INFO_TEXT = '#1A56B8';

type YesNo = 'yes' | 'no';

type HealthCheckScreenProps = {
  pet: Pet;
  photoUris: string[];
  videoUri: string | null;
  weightKg: string;
  vaccinated: YesNo;
  vaccineIds: string[];
  vaccineOther: string;
  neutered: YesNo;
  medicalHistory: string;
  symptomDescription: string;
  onBack: () => void;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  onPickVideo: () => void;
  onClearVideo: () => void;
  onChangeWeight: (value: string) => void;
  onChangeVaccinated: (value: YesNo) => void;
  onChangeVaccineIds: (ids: string[]) => void;
  onChangeVaccineOther: (value: string) => void;
  onChangeNeutered: (value: YesNo) => void;
  onChangeMedicalHistory: (value: string) => void;
  onChangeSymptomDescription: (value: string) => void;
  onStartAnalysis: () => void;
  inlineErrorMessage?: string;
  onDismissInlineError?: () => void;
  analysisCooldownSeconds?: number;
  analyzeDisabled?: boolean;
  aiCredits?: AiCreditAccount | null;
  aiCreditCost?: number;
  rewardedAdCredits?: number;
  onWatchRewardedAd?: () => Promise<boolean>;
  onSubscribePremium?: () => void;
  /** Opens cat breed hint flow (cats only). */
  onOpenBreedRecognition?: () => void;
};

function speciesLabel(species: string, petFallback: string): string {
  if (!species) return petFallback;
  return species.charAt(0).toUpperCase() + species.slice(1).toLowerCase();
}

function RadioRow({
  label,
  selected,
  value,
  onSelect,
  testID,
}: {
  label: string;
  selected: YesNo;
  value: YesNo;
  onSelect: (v: YesNo) => void;
  testID?: string;
}) {
  const active = selected === value;
  return (
    <Pressable
      testID={testID}
      className="mr-6 flex-row items-center gap-2 py-1 active:opacity-80"
      onPress={() => onSelect(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: active ? PRIMARY : '#cbd5e1' }}
      >
        {active ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIMARY }} /> : null}
      </View>
      <Text className="text-base text-slate-800">{label}</Text>
    </Pressable>
  );
}

function VaccineCheckboxRow({
  checked,
  onToggle,
  label,
  detail,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  detail: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      className="flex-row items-start gap-3 border-b border-slate-100 py-3 active:bg-slate-50"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        className="mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2"
        style={{
          borderColor: checked ? PRIMARY : '#cbd5e1',
          backgroundColor: checked ? `${PRIMARY}22` : 'transparent',
        }}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={PRIMARY} /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-slate-900">{label}</Text>
        {detail.trim() ? <Text className="mt-1 text-sm leading-5 text-slate-600">{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Health check intake — `figma/UI/HealthCheck1.png` + `HealthCheck2.png`. */
export function HealthCheckScreen({
  pet,
  photoUris,
  videoUri,
  weightKg,
  vaccinated,
  vaccineIds,
  vaccineOther,
  neutered,
  medicalHistory,
  symptomDescription,
  onBack,
  onAddPhotos,
  onRemovePhoto,
  onPickVideo,
  onClearVideo,
  onChangeWeight,
  onChangeVaccinated,
  onChangeVaccineIds,
  onChangeVaccineOther,
  onChangeNeutered,
  onChangeMedicalHistory,
  onChangeSymptomDescription,
  onStartAnalysis,
  inlineErrorMessage = '',
  onDismissInlineError,
  analysisCooldownSeconds = 0,
  analyzeDisabled = false,
  aiCredits = null,
  aiCreditCost = 1,
  rewardedAdCredits = 1,
  onWatchRewardedAd,
  onSubscribePremium,
  onOpenBreedRecognition,
}: HealthCheckScreenProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);

  const vaccineOptionIds = useMemo(() => vaccineIdsForPetSpecies(pet.species), [pet.species]);

  const vaccineSummary = useMemo(() => {
    if (!vaccineOptionIds || vaccineIds.length === 0) return '';
    return vaccineIds.map((id) => t(`healthCheck.vaccines.${id}.label`)).join(', ');
  }, [vaccineOptionIds, vaccineIds, t]);

  const modalScrollMaxHeight = Math.min(Math.round(windowHeight * 0.55), 440);

  const subtitle = [speciesLabel(pet.species, t('healthCheck.petFallback')), pet.breed?.trim() || null]
    .filter(Boolean)
    .join(' • ');
  const hasInsufficientCredits = Boolean(aiCredits && !hasCreditsForFeature(aiCredits, 'health_analysis', aiCreditCost));
  const healthCredits = getSpendableCreditsForFeature(aiCredits, 'health_analysis');
  const canStart = photoUris.length > 0 && !analyzeDisabled && analysisCooldownSeconds <= 0 && !hasInsufficientCredits;
  const photoCountHint =
    photoUris.length === 1
      ? t('healthCheck.photoCountOne', { count: photoUris.length })
      : t('healthCheck.photoCountMany', { count: photoUris.length });

  function toggleVaccineId(id: string) {
    const next = vaccineIds.includes(id) ? vaccineIds.filter((x) => x !== id) : [...vaccineIds, id];
    onChangeVaccineIds(next);
  }

  return (
    <View testID="health-check-screen" className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-gray-200 px-2 py-3">
        <Pressable
          testID="health-check-back-button"
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-gray-100"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
            {t('healthCheck.title', { name: pet.name })}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        >
        <View className="mb-5 rounded-xl px-4 py-3" style={{ backgroundColor: INFO_BG }}>
          <Text className="text-sm leading-5" style={{ color: INFO_TEXT }}>
            {t('healthCheck.infoBanner')}
          </Text>
        </View>
        <View className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <View className="flex-row items-start gap-3">
            <Ionicons name="warning-outline" size={20} color="#b91c1c" style={{ marginTop: 2 }} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-red-900">{t('healthCheck.urgentWarningTitle')}</Text>
              <Text className="mt-1 text-sm leading-5 text-red-800">{t('healthCheck.urgentWarningBody')}</Text>
            </View>
          </View>
        </View>
        {aiCredits ? (
          hasInsufficientCredits && (onWatchRewardedAd || onSubscribePremium) ? (
            <View className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <RewardedAdOffer
                feature="health_analysis"
                layout="compact"
                creditsPerAd={rewardedAdCredits}
                testID="health-check-rewarded-ad-offer"
                onWatch={onWatchRewardedAd}
                onSubscribe={onSubscribePremium}
              />
            </View>
          ) : (
            <View className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="wallet-outline" size={18} color={PRIMARY} />
                <Text className="text-sm font-bold text-slate-900">{t('aiCredits.cardTitle')}</Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-slate-700">
                {healthCredits.trial > 0
                  ? t('aiCredits.trialHealthRemaining', { count: healthCredits.trial })
                  : t('aiCredits.noTrialHealthRemaining')}
                {healthCredits.shared > 0
                  ? ` ${t('aiCredits.sharedCreditsRemaining', { count: healthCredits.shared })}`
                  : ''}{' '}
                {t('aiCredits.healthCheckCost', { cost: aiCreditCost })}
              </Text>
            </View>
          )
        ) : null}
        {isBreedRecognitionSpecies(pet.species) && onOpenBreedRecognition ? (
          <Pressable
            testID="health-check-open-breed-recognition-button"
            onPress={onOpenBreedRecognition}
            className="mb-5 flex-row items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 active:bg-blue-50"
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={20} color={PRIMARY} />
            <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{t('breedRecognition.healthCheckLink')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </Pressable>
        ) : null}
        {inlineErrorMessage ? (
          <View className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <View className="flex-row items-start gap-3">
              <Ionicons name="alert-circle-outline" size={20} color="#b45309" style={{ marginTop: 2 }} />
              <View className="min-w-0 flex-1">
                <Text className="text-sm leading-5 text-amber-900">{inlineErrorMessage}</Text>
                {onDismissInlineError ? (
                  <Pressable className="mt-2 self-start rounded-md bg-amber-100 px-3 py-1.5" onPress={onDismissInlineError}>
                    <Text className="text-xs font-semibold text-amber-900">{t('common.ok')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <Text className="mb-2 text-base font-bold text-slate-900">
          {t('healthCheck.photos')} <Text className="text-red-500">{t('healthCheck.required')}</Text>
        </Text>
        <Pressable
          testID="health-check-add-photos-button"
          accessibilityRole="button"
          accessibilityLabel="Add health check photos"
          onPress={onAddPhotos}
          className="mb-6 min-h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-6 active:bg-gray-100"
        >
          {photoUris.length === 0 ? (
            <>
              <Ionicons name="images-outline" size={40} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">{t('healthCheck.uploadPhotos')}</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">{t('healthCheck.upTo6')}</Text>
            </>
          ) : (
            <View className="w-full">
              <Text className="mb-3 text-center text-sm font-medium text-slate-600">{photoCountHint}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {photoUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} className="relative">
                    <Image source={{ uri }} className="h-20 w-20 rounded-lg" resizeMode="cover" />
                    <Pressable
                      testID={`health-check-remove-photo-${index}`}
                      className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-slate-900/80"
                      onPress={() => onRemovePhoto(index)}
                      hitSlop={8}
                      accessibilityLabel="Remove photo"
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Pressable>

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.videoOptional')}</Text>
        <View className="mb-6 min-h-[100px] overflow-hidden rounded-xl border border-gray-300 bg-white px-4 py-5">
          {videoUri ? (
            <View className="items-center">
              <Ionicons name="videocam" size={32} color={PRIMARY} />
              <Text className="mt-2 text-center text-sm font-medium text-slate-800">{t('healthCheck.videoSelected')}</Text>
              <View className="mt-3 flex-row gap-4">
                <Pressable testID="health-check-change-video-button" onPress={onPickVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
                    {t('healthCheck.changeVideo')}
                  </Text>
                </Pressable>
                <Pressable testID="health-check-clear-video-button" onPress={onClearVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold text-slate-500">{t('healthCheck.remove')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              testID="health-check-pick-video-button"
              accessibilityRole="button"
              accessibilityLabel="Pick health check video"
              onPress={onPickVideo}
              className="min-h-[88px] items-center justify-center active:bg-gray-50"
            >
              <Ionicons name="videocam-outline" size={36} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">{t('healthCheck.uploadVideo')}</Text>
            </Pressable>
          )}
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.weightKg')}</Text>
        <TextInput
          testID="health-check-weight-input"
          accessibilityLabel="Weight in kilograms"
          className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.enterWeight')}
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={onChangeWeight}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.vaccination')}</Text>
        <View className="mb-3 flex-row">
          <RadioRow testID="health-check-vaccinated-yes" label={t('common.yes')} selected={vaccinated} value="yes" onSelect={onChangeVaccinated} />
          <RadioRow testID="health-check-vaccinated-no" label={t('common.no')} selected={vaccinated} value="no" onSelect={onChangeVaccinated} />
        </View>
        {vaccinated === 'yes' ? (
          vaccineOptionIds ? (
            <View className="mb-6">
              <Text className="mb-2 text-sm font-semibold text-slate-700">{t('healthCheck.vaccineTypeLabel')}</Text>
              <Pressable
                testID="health-check-vaccine-select-button"
                onPress={() => setVaccineModalOpen(true)}
                className="flex-row items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 active:bg-slate-50"
                accessibilityRole="button"
                accessibilityLabel={t('healthCheck.vaccineSelectPlaceholder')}
              >
                <Text
                  className={`min-w-0 flex-1 text-base ${vaccineSummary ? 'text-slate-900' : 'text-slate-400'}`}
                  numberOfLines={3}
                >
                  {vaccineSummary || t('healthCheck.vaccineSelectPlaceholder')}
                </Text>
                <Ionicons name="chevron-down" size={22} color="#64748b" />
              </Pressable>
              <Modal visible={vaccineModalOpen} animationType="slide" transparent onRequestClose={() => setVaccineModalOpen(false)}>
                <View className="flex-1 justify-end bg-black/50">
                  <Pressable className="flex-1" onPress={() => setVaccineModalOpen(false)} accessibilityLabel="Close" />
                  <View className="rounded-t-2xl bg-white px-4 pb-5 pt-4">
                    <Text className="mb-1 text-lg font-bold text-slate-900">{t('healthCheck.vaccineModalTitle')}</Text>
                    <ScrollView style={{ maxHeight: modalScrollMaxHeight }} keyboardShouldPersistTaps="handled">
                      {vaccineOptionIds.map((id) => (
                        <VaccineCheckboxRow
                          testID={`health-check-vaccine-option-${id}`}
                          key={id}
                          checked={vaccineIds.includes(id)}
                          onToggle={() => toggleVaccineId(id)}
                          label={t(`healthCheck.vaccines.${id}.label`)}
                          detail={t(`healthCheck.vaccines.${id}.detail`)}
                        />
                      ))}
                    </ScrollView>
                    <Pressable
                      testID="health-check-vaccine-done-button"
                      className="mt-3 rounded-xl py-3.5 active:opacity-90"
                      style={{ backgroundColor: PRIMARY }}
                      onPress={() => setVaccineModalOpen(false)}
                    >
                      <Text className="text-center text-base font-bold text-white">{t('healthCheck.vaccineDone')}</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </View>
          ) : (
            <TextInput
              testID="health-check-vaccine-other-input"
              accessibilityLabel="Other vaccine details"
              className="mb-6 min-h-[88px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
              placeholder={t('healthCheck.vaccineOtherPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={vaccineOther}
              onChangeText={onChangeVaccineOther}
              multiline
              textAlignVertical="top"
            />
          )
        ) : (
          <View className="mb-6" />
        )}

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.neutering')}</Text>
        <View className="mb-6 flex-row">
          <RadioRow testID="health-check-neutered-yes" label={t('common.yes')} selected={neutered} value="yes" onSelect={onChangeNeutered} />
          <RadioRow testID="health-check-neutered-no" label={t('common.no')} selected={neutered} value="no" onSelect={onChangeNeutered} />
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.medicalHistory')}</Text>
        <TextInput
          testID="health-check-medical-history-input"
          accessibilityLabel="Medical history"
          className="mb-6 min-h-[100px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.medicalHistoryPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          value={medicalHistory}
          onChangeText={onChangeMedicalHistory}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.symptoms')}</Text>
        <TextInput
          testID="health-check-symptoms-input"
          accessibilityLabel="Symptoms"
          className="mb-2 min-h-[120px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.symptomsPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          value={symptomDescription}
          onChangeText={onChangeSymptomDescription}
        />

        <Pressable
          testID="health-check-start-analysis-button"
          accessibilityRole="button"
          accessibilityLabel="Start health analysis"
          className={`mt-4 rounded-xl py-4 ${canStart ? 'active:opacity-90' : 'opacity-50'}`}
          style={{ backgroundColor: canStart ? PRIMARY : '#94a3b8' }}
          onPress={onStartAnalysis}
          disabled={!canStart}
        >
          <Text className="text-center text-base font-bold text-white">{t('healthCheck.startAnalysis')}</Text>
        </Pressable>
        {!canStart ? (
          <Text className="mt-2 text-center text-sm text-red-500">
            {!photoUris.length
              ? t('healthCheck.photoRequiredError')
              : analysisCooldownSeconds > 0
                ? t('healthCheck.cooldownHint', { seconds: analysisCooldownSeconds })
                : t('healthCheck.analysisBusyHint')}
          </Text>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
