import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import {
  getBreedRecognitionRequiredSlots,
  getBreedRecognitionSlotOrder,
  type BreedRecognitionSlot,
} from '../constants/petBreedRecognitionSlots';
import { MAI_GREETING } from '../assets/maiOnboardingAssets';
import type { AiCreditAccount, Pet } from '../types';

const PRIMARY = '#1E6FE8';

const REFERENCE_LINKS = [
  {
    key: 'wcf',
    species: ['cat'],
    url: 'https://wcf.de/en/breeding-rules/',
  },
  {
    key: 'tica',
    species: ['cat'],
    url: 'https://tica.org/how-do-i-register-my-cat/',
  },
  {
    key: 'akcPal',
    species: ['dog'],
    url: 'https://www.akc.org/register/information/purebred-alternative-listing-pal/',
  },
] as const;

function referenceLinksForSpecies(species: string) {
  const normalized = species.trim().toLowerCase();
  const links = REFERENCE_LINKS.filter((ref) => (ref.species as readonly string[]).includes(normalized));
  return links.length ? links : REFERENCE_LINKS;
}

type PetBreedRecognitionScreenProps = {
  pet: Pet;
  slotUris: Record<string, string>;
  loading: boolean;
  aiCredits?: AiCreditAccount | null;
  aiCreditCost?: number;
  onBack: () => void;
  onPickSlot: (slot: BreedRecognitionSlot) => void;
  onClearSlot: (slot: BreedRecognitionSlot) => void;
  onAnalyze: () => void;
};

export function PetBreedRecognitionScreen({
  pet,
  slotUris,
  loading,
  aiCredits = null,
  aiCreditCost = 1,
  onBack,
  onPickSlot,
  onClearSlot,
  onAnalyze,
}: PetBreedRecognitionScreenProps) {
  const { t } = useTranslation();
  const slotOrder = getBreedRecognitionSlotOrder(pet.species);
  const requiredSlots = getBreedRecognitionRequiredSlots(pet.species);
  const referenceLinks = referenceLinksForSpecies(pet.species);

  const missingRequiredSlots = requiredSlots.filter((s) => !slotUris[s]?.trim());
  const requiredOk = missingRequiredSlots.length === 0;
  const missingRequiredText = missingRequiredSlots.map((slot) => t(`breedRecognition.slots.${slot}.title`)).join(', ');
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
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 150 }}
      >
        <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Image
            source={MAI_GREETING}
            className="h-14 w-14 rounded-2xl"
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel="Mai"
          />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-amber-950">{t('breedRecognition.noteTitle')}</Text>
            <Text className="mt-1 text-sm leading-5 text-amber-900">{t('breedRecognition.noteBody')}</Text>
          </View>
        </View>

        <View className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Text className="text-sm font-bold text-slate-900">{t('breedRecognition.referencesTitle')}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-600">{t('breedRecognition.referencesBody')}</Text>
          <View className="mt-3 gap-2">
            {referenceLinks.map((ref) => (
              <Pressable
                key={ref.key}
                accessibilityRole="link"
                accessibilityLabel={t(`breedRecognition.references.${ref.key}.label`)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 active:bg-slate-100"
                onPress={() => {
                  void Linking.openURL(ref.url);
                }}
              >
                <Text className="text-xs font-bold" style={{ color: PRIMARY }}>
                  {t(`breedRecognition.references.${ref.key}.label`)}
                </Text>
                <Text className="mt-1 text-xs leading-4 text-slate-600">
                  {t(`breedRecognition.references.${ref.key}.summary`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {aiCredits && hasInsufficientCredits ? (
          <View className="mb-4 rounded-xl border border-amber-200 bg-white px-4 py-3">
            <Text className="text-sm font-semibold text-amber-900">{t('aiCredits.outOfCredits')}</Text>
          </View>
        ) : null}

        <Text className="mb-3 text-base font-bold text-slate-900">{t('breedRecognition.photoSectionTitle')}</Text>

        <View className="gap-3">
          {slotOrder.map((slot) => {
            const required = requiredSlots.includes(slot);
            const uri = slotUris[slot]?.trim();
            return (
              <View key={slot} className="rounded-2xl border border-gray-200 bg-white p-3">
                <View className="mb-2 flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-sm font-bold text-slate-900">{t(`breedRecognition.slots.${slot}.title`)}</Text>
                      <Text
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: required ? `${PRIMARY}18` : '#eef2f7',
                          color: required ? PRIMARY : '#64748b',
                        }}
                      >
                        {required ? t('breedRecognition.requiredBadge') : t('breedRecognition.optionalBadge')}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs leading-5 text-slate-500">{t(`breedRecognition.slots.${slot}.hint`)}</Text>
                  </View>
                  {uri ? (
                    <Pressable
                      testID={`breed-recognition-clear-photo-${slot}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${slot} photo`}
                      className="rounded-full bg-slate-100 px-3 py-1.5"
                      onPress={() => onClearSlot(slot)}
                    >
                      <Text className="text-xs font-semibold text-slate-600">{t('breedRecognition.removePhoto')}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {uri ? (
                  <Pressable
                    testID={`breed-recognition-change-photo-${slot}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${slot} photo`}
                    className="overflow-hidden rounded-xl border border-gray-200 active:opacity-90"
                    onPress={() => onPickSlot(slot)}
                  >
                    <Image source={{ uri }} className="h-28 w-full" contentFit="cover" />
                    <View className="bg-white px-3 py-2">
                      <Text className="text-center text-sm font-semibold" style={{ color: PRIMARY }}>
                        {t('breedRecognition.changePhoto')}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    testID={`breed-recognition-pick-photo-${slot}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Pick ${slot} photo`}
                    onPress={() => onPickSlot(slot)}
                    className="min-h-[88px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-slate-50 active:bg-gray-100"
                  >
                    <Ionicons name="camera-outline" size={28} color="#64748b" />
                    <Text className="mt-1 text-sm font-semibold" style={{ color: PRIMARY }}>
                      {t('breedRecognition.pickPhoto')}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>

      <View className="border-t border-gray-200 bg-white px-5 pb-5 pt-3">
        {aiCredits ? (
          <Text className="mb-2 text-center text-xs text-slate-500">
            {t('breedRecognition.creditLine', {
              remaining: aiCredits.creditBalance,
              cost: aiCreditCost,
            })}
          </Text>
        ) : null}
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
          <Text className="mt-2 text-center text-xs text-slate-500">
            {missingRequiredText
              ? t('breedRecognition.needRequiredPhotosWithList', { photos: missingRequiredText })
              : t('breedRecognition.needRequiredPhotos')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
