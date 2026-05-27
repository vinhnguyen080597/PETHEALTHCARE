import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { getBreedRecognitionSlotOrder } from '../constants/petBreedRecognitionSlots';
import type { BreedRecognitionResult, Pet } from '../types';

type BreedRecognitionResultScreenProps = {
  pet: Pet;
  result: BreedRecognitionResult;
  slotUris: Record<string, string>;
  loading: boolean;
  onBack: () => void;
  onEditPhotos: () => void;
  onApplyToProfile: () => void;
};

const PRIMARY = '#1E6FE8';

function pct(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function levelIcon(level?: 'low' | 'medium' | 'high') {
  if (level === 'low') return 'leaf-outline';
  if (level === 'high') return 'flash-outline';
  return 'pulse-outline';
}

export function BreedRecognitionResultScreen({
  pet,
  result,
  slotUris,
  loading,
  onBack,
  onEditPhotos,
  onApplyToProfile,
}: BreedRecognitionResultScreenProps) {
  const { t } = useTranslation();
  const orderedSlots = useMemo(() => getBreedRecognitionSlotOrder(pet.species), [pet.species]);
  const selectedPhotos = useMemo(
    () =>
      orderedSlots.flatMap((slot) => {
        const uri = slotUris[slot]?.trim();
        return uri ? [{ slot, uri }] : [];
      }),
    [orderedSlots, slotUris],
  );

  const heroPhoto = selectedPhotos[0];
  const primary = result.primary;
  const breedName = primary?.breed_name?.trim() || result.primary_hypothesis;
  const confidence = primary?.confidence ?? result.confidence;
  const profile = result.breed_profile;
  const evidence =
    result.visual_evidence && result.visual_evidence.length > 0
      ? result.visual_evidence
      : result.visible_clues.map((observation) => ({ trait: '', observation, source_slot: '' }));
  const careCards = result.care_overview ?? [];

  const quickFacts = [
    { key: 'origin', icon: 'earth-outline', label: t('breedRecognitionResult.origin'), value: profile?.origin },
    { key: 'size', icon: 'resize-outline', label: t('breedRecognitionResult.size'), value: profile?.size },
    { key: 'coat', icon: 'color-palette-outline', label: t('breedRecognitionResult.coat'), value: profile?.coat },
    {
      key: 'activity',
      icon: levelIcon(profile?.activity_level),
      label: t('breedRecognitionResult.activityLevel'),
      value: profile?.activity_level ? t(`breedRecognitionResult.levels.${profile.activity_level}`) : '',
    },
    {
      key: 'grooming',
      icon: levelIcon(profile?.grooming_needs),
      label: t('breedRecognitionResult.groomingNeeds'),
      value: profile?.grooming_needs ? t(`breedRecognitionResult.levels.${profile.grooming_needs}`) : '',
    },
  ].filter((item) => item.value?.trim());

  return (
    <View testID="breed-recognition-result-screen" className="flex-1 bg-slate-50">
      <View className="flex-row items-center border-b border-slate-200 bg-white px-2 py-3">
        <Pressable
          testID="breed-recognition-result-back-button"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-slate-100"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="min-w-0 flex-1 pr-2 text-lg font-bold text-slate-900" numberOfLines={1}>
          {t('breedRecognitionResult.title')}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 132 }}>
        <View className="bg-slate-950 px-5 pb-6 pt-5">
          <View className="overflow-hidden rounded-3xl border border-cyan-300/30 bg-slate-900">
            {heroPhoto ? (
              <Image source={{ uri: heroPhoto.uri }} className="h-60 w-full" contentFit="cover" transition={180} />
            ) : (
              <View className="h-60 w-full items-center justify-center bg-slate-800">
                <Ionicons name="paw-outline" size={42} color="#bae6fd" />
              </View>
            )}
            <View className="absolute inset-0 bg-slate-950/25" />
            <View className="absolute bottom-4 left-4 right-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
                {t('breedRecognitionResult.heroEyebrow')}
              </Text>
              <Text className="mt-1 text-2xl font-bold text-white">{breedName}</Text>
              {primary?.phenotype_label ? (
                <Text className="mt-1 text-sm text-cyan-100">{primary.phenotype_label}</Text>
              ) : null}
            </View>
          </View>

          <View className="mt-4 rounded-2xl bg-white/10 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-100">{t('breedRecognitionResult.confidence')}</Text>
              <Text className="text-lg font-bold text-white">{pct(confidence)}%</Text>
            </View>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <View className="h-full rounded-full bg-cyan-300" style={{ width: `${pct(confidence)}%` }} />
            </View>
            <Text className="mt-3 text-sm leading-5 text-slate-200">
              {primary?.summary?.trim() || result.notes_for_owner || result.primary_hypothesis}
            </Text>
          </View>
        </View>

        <View className="px-5 py-5">
          {quickFacts.length > 0 ? (
            <View>
              <Text className="mb-3 text-base font-bold text-slate-900">{t('breedRecognitionResult.quickFacts')}</Text>
              <View className="flex-row flex-wrap gap-3">
                {quickFacts.map((item) => (
                  <View key={item.key} className="w-[47%] rounded-2xl border border-slate-200 bg-white p-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={19} color={PRIMARY} />
                    </View>
                    <Text className="mt-3 text-xs font-semibold uppercase text-slate-500">{item.label}</Text>
                    <Text className="mt-1 text-sm font-bold leading-5 text-slate-900">{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {profile?.temperament?.length ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognitionResult.temperament')}</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {profile.temperament.map((trait, index) => (
                  <Text key={`${trait}-${index}`} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {trait}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {evidence.length > 0 ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognitionResult.whyMaiSuggests')}</Text>
              <View className="mt-3 gap-3">
                {evidence.map((item, index) => (
                  <View key={`${item.observation}-${index}`} className="flex-row gap-3">
                    <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-cyan-50">
                      <Ionicons name="sparkles-outline" size={16} color="#0891b2" />
                    </View>
                    <View className="min-w-0 flex-1">
                      {item.trait ? <Text className="text-sm font-bold text-slate-800">{item.trait}</Text> : null}
                      <Text className="text-sm leading-5 text-slate-600">{item.observation}</Text>
                      {item.source_slot ? (
                        <Text className="mt-1 text-xs font-semibold text-cyan-700">
                          {t('breedRecognitionResult.observedFrom', {
                            slot: t(`breedRecognition.slots.${item.source_slot}.title`, { defaultValue: item.source_slot }),
                          })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {result.alternatives.length > 0 ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognition.alternativesTitle')}</Text>
              <View className="mt-3 gap-3">
                {result.alternatives.map((alt, index) => (
                  <View key={`${alt.label}-${index}`}>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{alt.label}</Text>
                      <Text className="text-sm font-bold text-slate-900">{pct(alt.confidence)}%</Text>
                    </View>
                    <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <View className="h-full rounded-full bg-blue-400" style={{ width: `${pct(alt.confidence)}%` }} />
                    </View>
                    {alt.reason ? <Text className="mt-1 text-xs leading-4 text-slate-500">{alt.reason}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {careCards.length > 0 || result.notes_for_owner ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognitionResult.profileAndCare')}</Text>
              <View className="mt-3 gap-3">
                {careCards.map((card, index) => (
                  <View key={`${card.title}-${index}`} className="rounded-xl bg-slate-50 p-3">
                    <Text className="text-sm font-bold text-slate-800">{card.title}</Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-600">{card.body}</Text>
                  </View>
                ))}
                {result.notes_for_owner ? (
                  <Text className="text-sm leading-5 text-slate-700">{result.notes_for_owner}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {result.missing_for_better_id.length > 0 ? (
            <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Text className="text-base font-bold text-amber-950">{t('breedRecognition.missingTitle')}</Text>
              <View className="mt-3 gap-2">
                {result.missing_for_better_id.map((item, index) => (
                  <View key={`${item}-${index}`} className="flex-row gap-2">
                    <Ionicons name="add-circle-outline" size={17} color="#92400e" />
                    <Text className="min-w-0 flex-1 text-sm leading-5 text-amber-900">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {result.sources?.length ? (
            <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognitionResult.sources')}</Text>
              <View className="mt-3 gap-2">
                {result.sources.map((source, index) => (
                  <Pressable
                    key={`${source.url}-${index}`}
                    accessibilityRole="link"
                    className="flex-row items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 active:bg-slate-100"
                    onPress={() => {
                      void Linking.openURL(source.url);
                    }}
                  >
                    <Text className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{source.title}</Text>
                    <Ionicons name="open-outline" size={16} color="#64748b" />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <Text className="mt-5 text-xs leading-5 text-slate-500">{result.disclaimer}</Text>
        </View>
      </ScrollView>

      <View className="border-t border-slate-200 bg-white px-5 pb-5 pt-3">
        <Pressable
          testID="breed-recognition-apply-profile-button"
          accessibilityRole="button"
          accessibilityLabel="Apply breed result to profile"
          className={`rounded-xl py-4 active:opacity-90 ${loading ? 'opacity-50' : ''}`}
          style={{ backgroundColor: PRIMARY }}
          onPress={onApplyToProfile}
          disabled={loading}
        >
          <Text className="text-center text-base font-bold text-white">{t('breedRecognition.applyToProfile')}</Text>
        </Pressable>
        <Pressable
          testID="breed-recognition-edit-photos-button"
          accessibilityRole="button"
          accessibilityLabel="Edit breed recognition photos"
          className="mt-3 rounded-xl border border-slate-200 bg-slate-50 py-3 active:bg-slate-100"
          onPress={onEditPhotos}
        >
          <Text className="text-center text-sm font-bold text-slate-800">{t('breedRecognition.editPhotos')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
