import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  BREED_RECOGNITION_REQUIRED_SLOTS,
  BREED_RECOGNITION_SLOT_ORDER,
  type BreedRecognitionSlot,
} from '../constants/petBreedRecognitionSlots';
import type { AiCreditAccount, BreedRecognitionResult, Pet } from '../types';

const PRIMARY = '#1E6FE8';
const INFO_BG = '#E8F1FE';
const INFO_TEXT = '#1A56B8';

type PetBreedRecognitionScreenProps = {
  pet: Pet;
  slotUris: Record<string, string>;
  result: BreedRecognitionResult | null;
  loading: boolean;
  aiCredits?: AiCreditAccount | null;
  aiCreditCost?: number;
  onBack: () => void;
  onPickSlot: (slot: BreedRecognitionSlot) => void;
  onClearSlot: (slot: BreedRecognitionSlot) => void;
  onAnalyze: () => void;
  onApplyToProfile: () => void;
};

export function PetBreedRecognitionScreen({
  pet,
  slotUris,
  result,
  loading,
  aiCredits = null,
  aiCreditCost = 1,
  onBack,
  onPickSlot,
  onClearSlot,
  onAnalyze,
  onApplyToProfile,
}: PetBreedRecognitionScreenProps) {
  const { t } = useTranslation();

  const requiredOk = BREED_RECOGNITION_REQUIRED_SLOTS.every((s) => Boolean(slotUris[s]?.trim()));
  const hasInsufficientCredits = Boolean(aiCredits && aiCredits.creditBalance < aiCreditCost);
  const canAnalyze = requiredOk && !loading && !hasInsufficientCredits;

  return (
    <View testID="breed-recognition-screen" className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-gray-200 px-2 py-3">
        <Pressable
          testID="breed-recognition-back-button"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-gray-100"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="min-w-0 flex-1 pr-2 text-lg font-bold text-slate-900" numberOfLines={1}>
          {t('breedRecognition.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
      >
        <Text className="mb-1 text-base font-semibold text-slate-900">{pet.name}</Text>
        <Text className="mb-4 text-sm text-slate-500">{t('breedRecognition.subtitle')}</Text>

        <View className="mb-4 rounded-xl px-4 py-3" style={{ backgroundColor: INFO_BG }}>
          <Text className="text-sm font-bold" style={{ color: INFO_TEXT }}>
            {t('breedRecognition.purposeTitle')}
          </Text>
          <Text className="mt-2 text-sm leading-5" style={{ color: INFO_TEXT }}>
            {t('breedRecognition.purposeBody')}
          </Text>
        </View>

        <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-sm font-bold text-amber-900">{t('breedRecognition.accuracyTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-amber-900">{t('breedRecognition.accuracyBody')}</Text>
        </View>

        <View className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Text className="text-sm font-bold text-slate-800">{t('breedRecognition.requirementsTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-700">{t('breedRecognition.requirementsBody')}</Text>
        </View>

        {aiCredits ? (
          <View className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="wallet-outline" size={18} color={PRIMARY} />
              <Text className="text-sm font-bold text-slate-900">{t('aiCredits.cardTitle')}</Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-slate-700">
              {t('aiCredits.remaining', {
                remaining: aiCredits.creditBalance,
                allowance: aiCredits.monthlyAllowance,
              })}{' '}
              {t('aiCredits.breedCost', { cost: aiCreditCost })}
            </Text>
            {hasInsufficientCredits ? (
              <View>
                <Text className="mt-2 text-sm font-semibold text-amber-900">{t('aiCredits.outOfCredits')}</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {['rewardedAd', 'topUp', 'subscription'].map((key) => (
                    <Text key={key} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                      {t(`aiCredits.prompts.${key}`)}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text className="mb-3 text-base font-bold text-slate-900">{t('breedRecognition.photoSectionTitle')}</Text>

        {BREED_RECOGNITION_SLOT_ORDER.map((slot) => {
          const required = BREED_RECOGNITION_REQUIRED_SLOTS.includes(slot);
          const uri = slotUris[slot]?.trim();
          return (
            <View key={slot} className="mb-4">
              <View className="mb-1 flex-row flex-wrap items-center gap-2">
                <Text className="text-sm font-semibold text-slate-900">{t(`breedRecognition.slots.${slot}.title`)}</Text>
                <Text
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: required ? `${PRIMARY}22` : '#e2e8f0',
                    color: required ? PRIMARY : '#64748b',
                  }}
                >
                  {required ? t('breedRecognition.requiredBadge') : t('breedRecognition.optionalBadge')}
                </Text>
              </View>
              <Text className="mb-2 text-xs leading-5 text-slate-600">{t(`breedRecognition.slots.${slot}.hint`)}</Text>
              <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {uri ? (
                  <View>
                    <Image source={{ uri }} className="h-44 w-full" contentFit="cover" />
                    <View className="flex-row justify-end gap-4 border-t border-gray-200 bg-white px-3 py-2">
                      <Pressable
                        testID={`breed-recognition-change-photo-${slot}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Change ${slot} photo`}
                        onPress={() => onPickSlot(slot)}
                        hitSlop={6}
                      >
                        <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
                          {t('breedRecognition.changePhoto')}
                        </Text>
                      </Pressable>
                      <Pressable
                        testID={`breed-recognition-clear-photo-${slot}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${slot} photo`}
                        onPress={() => onClearSlot(slot)}
                        hitSlop={6}
                      >
                        <Text className="text-sm font-semibold text-slate-500">{t('breedRecognition.removePhoto')}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    testID={`breed-recognition-pick-photo-${slot}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Pick ${slot} photo`}
                    onPress={() => onPickSlot(slot)}
                    className="min-h-[120px] items-center justify-center py-6 active:bg-gray-100"
                  >
                    <Ionicons name="camera-outline" size={32} color="#64748b" />
                    <Text className="mt-2 text-sm font-semibold" style={{ color: PRIMARY }}>
                      {t('breedRecognition.pickPhoto')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <Pressable
          testID="breed-recognition-analyze-button"
          accessibilityRole="button"
          accessibilityLabel="Analyze breed"
          className={`mt-2 flex-row items-center justify-center gap-2 rounded-xl py-4 ${canAnalyze ? 'active:opacity-90' : 'opacity-45'}`}
          style={{ backgroundColor: PRIMARY }}
          onPress={onAnalyze}
          disabled={!canAnalyze}
        >
          {loading ? <ActivityIndicator color="#fff" /> : null}
          <Text className="text-center text-base font-bold text-white">
            {loading ? t('breedRecognition.analyzing') : t('breedRecognition.analyze')}
          </Text>
        </Pressable>
        {!requiredOk ? (
          <Text className="mt-2 text-center text-xs text-slate-500">{t('breedRecognition.needRequiredPhotos')}</Text>
        ) : null}

        {result ? (
          <View className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <Text className="text-base font-bold text-slate-900">{t('breedRecognition.resultTitle')}</Text>
            <Text className="mt-3 text-base leading-6 text-slate-800">{result.primary_hypothesis}</Text>
            <Text className="mt-2 text-sm text-slate-600">
              {t('breedRecognition.confidenceLabel', { pct: Math.round(result.confidence * 100) })}
            </Text>
            {result.alternatives.length > 0 ? (
              <View className="mt-3">
                <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.alternativesTitle')}</Text>
                {result.alternatives.map((a, i) => (
                  <Text key={`${a.label}-${i}`} className="mt-1 text-sm text-slate-700">
                    • {a.label} ({Math.round(a.confidence * 100)}%)
                  </Text>
                ))}
              </View>
            ) : null}
            {result.visible_clues.length > 0 ? (
              <View className="mt-3">
                <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.cluesTitle')}</Text>
                {result.visible_clues.map((c, i) => (
                  <Text key={`${c}-${i}`} className="mt-1 text-sm text-slate-600">
                    • {c}
                  </Text>
                ))}
              </View>
            ) : null}
            {result.missing_for_better_id.length > 0 ? (
              <View className="mt-3">
                <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.missingTitle')}</Text>
                {result.missing_for_better_id.map((m, i) => (
                  <Text key={`${m}-${i}`} className="mt-1 text-sm text-slate-600">
                    • {m}
                  </Text>
                ))}
              </View>
            ) : null}
            {result.notes_for_owner ? (
              <Text className="mt-3 text-sm leading-5 text-slate-700">{result.notes_for_owner}</Text>
            ) : null}
            <Text className="mt-4 text-xs leading-5 text-slate-500">{result.disclaimer}</Text>
            <Pressable
              testID="breed-recognition-apply-profile-button"
              accessibilityRole="button"
              accessibilityLabel="Apply breed result to profile"
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50 py-3 active:bg-slate-100"
              onPress={onApplyToProfile}
            >
              <Text className="text-center text-sm font-bold text-slate-900">{t('breedRecognition.applyToProfile')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
