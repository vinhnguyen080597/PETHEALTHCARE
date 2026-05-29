import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, Text, View } from 'react-native';
import { getBreedRecognitionSlotOrder } from '../constants/petBreedRecognitionSlots';
import type { Pet } from '../types';

type BreedRecognitionProgressScreenProps = {
  pet: Pet;
  slotUris: Record<string, string>;
  loading: boolean;
};

const HERO_IMAGE_HEIGHT = 288;
const SCAN_DISTANCE = HERO_IMAGE_HEIGHT - 2;

export function BreedRecognitionProgressScreen({
  pet,
  slotUris,
  loading,
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
  const isScanning = loading && selectedSlots.length > 0;

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
        duration: 5000,
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
          <Text className="text-center text-2xl font-bold text-white">{t('breedRecognitionProgress.title')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-blue-100">
            {t('breedRecognitionProgress.subtitle', { name: pet.name })}
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
            {t('breedRecognitionProgress.stageBody')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
