import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { getBreedRecognitionSlotOrder } from '../constants/petBreedRecognitionSlots';
import type { BreedRecognitionResult, Pet } from '../types';

type BreedRecognitionProgressScreenProps = {
  pet: Pet;
  slotUris: Record<string, string>;
  result: BreedRecognitionResult | null;
  loading: boolean;
  onApplyToProfile: () => void;
  onEditPhotos: () => void;
};

const HERO_IMAGE_HEIGHT = 288;
const SCAN_DISTANCE = HERO_IMAGE_HEIGHT - 2;

export function BreedRecognitionProgressScreen({
  pet,
  slotUris,
  result,
  loading,
  onApplyToProfile,
  onEditPhotos,
}: BreedRecognitionProgressScreenProps) {
  const { t } = useTranslation();
  const scan = useRef(new Animated.Value(0)).current;
  const [activeScanIndex, setActiveScanIndex] = useState(0);
  const orderedSlots = useMemo(() => getBreedRecognitionSlotOrder(pet.species), [pet.species]);

  const selectedSlots = useMemo(
    () =>
      orderedSlots.flatMap((slot) => {
        const uri = slotUris[slot]?.trim();
        return uri ? [{ slot, uri }] : [];
      }),
    [orderedSlots, slotUris],
  );
  const hero = selectedSlots[activeScanIndex] ?? selectedSlots[0];
  const isScanning = loading && !result && selectedSlots.length > 0;

  useEffect(() => {
    setActiveScanIndex(0);
  }, [selectedSlots.length]);

  useEffect(() => {
    let stopped = false;

    function runScan() {
      scan.setValue(0);
      if (!isScanning) return;

      Animated.timing(scan, {
        toValue: 1,
        duration: 1700,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || stopped) return;
        setActiveScanIndex((current) => (selectedSlots.length > 1 ? (current + 1) % selectedSlots.length : current));
        runScan();
      });
    }

    runScan();
    return () => {
      stopped = true;
      scan.stopAnimation();
    };
  }, [isScanning, scan, selectedSlots.length]);

  useEffect(() => {
    if (isScanning) return;
    scan.setValue(0);
  }, [isScanning, scan]);

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_DISTANCE],
  });

  return (
    <View testID="breed-recognition-progress-screen" className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 32 }}
      >
        <View className="items-center">
          <Text className="text-center text-2xl font-bold text-white">
            {result ? t('breedRecognitionProgress.resultReadyTitle') : t('breedRecognitionProgress.title')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-blue-100">
            {result
              ? t('breedRecognitionProgress.resultReadyBody', { name: pet.name })
              : t('breedRecognitionProgress.subtitle', { name: pet.name })}
          </Text>
        </View>

        <View className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/40 bg-slate-900 shadow-lg">
          <View className="relative h-72">
            {hero ? (
              <Image source={{ uri: hero.uri }} className="h-full w-full" contentFit="cover" transition={180} />
            ) : (
              <View className="h-full w-full items-center justify-center bg-slate-800">
                <Text className="text-sm text-slate-300">{t('breedRecognitionProgress.noPreview')}</Text>
              </View>
            )}
            <View className="absolute inset-0 bg-slate-950/20" />
            <View className="absolute inset-x-0 top-0 h-px bg-cyan-200/80" />
            <View className="absolute inset-x-0 bottom-0 h-px bg-cyan-200/80" />
            <View className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1">
              <Text className="text-xs font-semibold text-cyan-100">
                {hero ? t(`breedRecognition.slots.${hero.slot}.title`) : t('breedRecognition.title')}
              </Text>
            </View>

            {[0.22, 0.48, 0.74].map((top, index) => (
              <View
                key={top}
                className="absolute left-0 right-0 border-t border-cyan-100/20"
                style={{ top: `${top * 100}%` }}
              >
                <Text className="ml-3 -mt-2 self-start rounded-full bg-slate-950/50 px-2 text-[10px] font-semibold text-cyan-100">
                  {t(`breedRecognitionProgress.scanLabels.${index}`)}
                </Text>
              </View>
            ))}

            {isScanning ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  zIndex: 30,
                  elevation: 30,
                  transform: [{ translateY: scanTranslateY }],
                }}
              >
                <View style={{ height: 4, backgroundColor: '#22d3ee' }} />
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View className="mt-5 flex-row justify-center gap-2">
          {selectedSlots.slice(0, 5).map((item, index) => (
            <View
              key={item.slot}
              className={`h-12 w-12 overflow-hidden rounded-xl border bg-slate-800 ${
                index === activeScanIndex && isScanning ? 'border-cyan-200' : 'border-cyan-200/40'
              }`}
            >
              <Image source={{ uri: item.uri }} className="h-full w-full" contentFit="cover" transition={120} />
            </View>
          ))}
        </View>

        <View className="mt-8 rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
          <Text className="text-center text-base font-bold text-white">{t('breedRecognitionProgress.stageTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-slate-200">
            {result ? t('breedRecognitionProgress.resultStageBody') : t('breedRecognitionProgress.stageBody')}
          </Text>
        </View>

        {result ? (
          <View testID="breed-recognition-result-card" className="mt-6 rounded-3xl border border-cyan-200/30 bg-white p-4">
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
                    - {a.label} ({Math.round(a.confidence * 100)}%)
                  </Text>
                ))}
              </View>
            ) : null}
            {result.visible_clues.length > 0 ? (
              <View className="mt-3">
                <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.cluesTitle')}</Text>
                {result.visible_clues.map((c, i) => (
                  <Text key={`${c}-${i}`} className="mt-1 text-sm text-slate-600">
                    - {c}
                  </Text>
                ))}
              </View>
            ) : null}
            {result.missing_for_better_id.length > 0 ? (
              <View className="mt-3">
                <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.missingTitle')}</Text>
                {result.missing_for_better_id.map((m, i) => (
                  <Text key={`${m}-${i}`} className="mt-1 text-sm text-slate-600">
                    - {m}
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
              className={`mt-4 rounded-xl border border-slate-200 bg-slate-50 py-3 active:bg-slate-100 ${loading ? 'opacity-50' : ''}`}
              onPress={onApplyToProfile}
              disabled={loading}
            >
              <Text className="text-center text-sm font-bold text-slate-900">{t('breedRecognition.applyToProfile')}</Text>
            </Pressable>
            <Pressable
              testID="breed-recognition-edit-photos-button"
              accessibilityRole="button"
              accessibilityLabel="Edit breed recognition photos"
              className="mt-3 rounded-xl border border-cyan-200/70 bg-cyan-50 py-3 active:bg-cyan-100"
              onPress={onEditPhotos}
            >
              <Text className="text-center text-sm font-bold text-cyan-900">{t('breedRecognition.editPhotos')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
