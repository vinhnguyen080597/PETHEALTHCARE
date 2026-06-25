import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBreedRecognitionRequiredSlots,
  getBreedRecognitionSlotOrder,
  type BreedRecognitionSlot,
} from '../constants/petBreedRecognitionSlots';
import { MAI_GREETING } from '../assets/maiOnboardingAssets';
import { MAI_GUIDING } from '../assets/maiAssets';
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

type IntroStep = 'mai' | 'references' | 'required-photo';

function referenceLinksForSpecies(species: string) {
  const normalized = species.trim().toLowerCase();
  const links = REFERENCE_LINKS.filter((ref) => (ref.species as readonly string[]).includes(normalized));
  return links.length ? links : REFERENCE_LINKS;
}

function hasAllRequiredSlots(slotUris: Record<string, string>, requiredSlots: readonly BreedRecognitionSlot[]) {
  return requiredSlots.every((slot) => Boolean(slotUris[slot]?.trim()));
}

function firstMissingRequiredIndex(
  slotUris: Record<string, string>,
  requiredSlots: readonly BreedRecognitionSlot[],
) {
  const index = requiredSlots.findIndex((slot) => !slotUris[slot]?.trim());
  return index >= 0 ? index : 0;
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

type SectionAnchor = { y: number; height: number };

function IntroNavButtons({
  showBack,
  onBack,
  onNext,
}: {
  showBack?: boolean;
  onBack?: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className={`mt-4 flex-row items-center gap-2 ${showBack ? 'justify-between' : 'justify-end'}`}>
      {showBack ? (
        <Pressable
          testID="breed-recognition-intro-back-button"
          accessibilityRole="button"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 active:bg-slate-50"
          onPress={onBack}
        >
          <Text className="text-sm font-semibold text-slate-700">{t('breedRecognition.introBack')}</Text>
        </Pressable>
      ) : null}
      <Pressable
        testID="breed-recognition-intro-continue-button"
        accessibilityRole="button"
        className="rounded-lg px-5 py-2 active:opacity-90"
        style={{ backgroundColor: PRIMARY }}
        onPress={onNext}
      >
        <Text className="text-sm font-semibold text-white">{t('breedRecognition.introNext')}</Text>
      </Pressable>
    </View>
  );
}

type BreedRecognitionSlotCardProps = {
  slot: BreedRecognitionSlot;
  required: boolean;
  uri?: string;
  pickTestId: string;
  changeTestId: string;
  clearTestId: string;
  onPick: () => void;
  onClear: () => void;
};

function BreedRecognitionSlotCard({
  slot,
  required,
  uri,
  pickTestId,
  changeTestId,
  clearTestId,
  onPick,
  onClear,
}: BreedRecognitionSlotCardProps) {
  const { t } = useTranslation();
  const trimmedUri = uri?.trim();

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-3">
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
        {trimmedUri ? (
          <Pressable
            testID={clearTestId}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${slot} photo`}
            className="rounded-full bg-slate-100 px-3 py-1.5"
            onPress={onClear}
          >
            <Text className="text-xs font-semibold text-slate-600">{t('breedRecognition.removePhoto')}</Text>
          </Pressable>
        ) : null}
      </View>

      {trimmedUri ? (
        <Pressable
          testID={changeTestId}
          accessibilityRole="button"
          accessibilityLabel={`Change ${slot} photo`}
          className="overflow-hidden rounded-xl border border-gray-200 active:opacity-90"
          onPress={onPick}
        >
          <Image source={{ uri: trimmedUri }} style={styles.slotPreviewImage} contentFit="cover" recyclingKey={trimmedUri} />
          <View className="bg-white px-3 py-2">
            <Text className="text-center text-sm font-semibold" style={{ color: PRIMARY }}>
              {t('breedRecognition.changePhoto')}
            </Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          testID={pickTestId}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${slot} photo`}
          onPress={onPick}
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
}

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
  const insets = useSafeAreaInsets();
  const slotOrder = getBreedRecognitionSlotOrder(pet.species);
  const requiredSlots = getBreedRecognitionRequiredSlots(pet.species);
  const referenceLinks = referenceLinksForSpecies(pet.species);

  const [introComplete, setIntroComplete] = useState(() => hasAllRequiredSlots(slotUris, requiredSlots));
  const [introStep, setIntroStep] = useState<IntroStep>('mai');
  const [requiredPhotoIndex, setRequiredPhotoIndex] = useState(() =>
    firstMissingRequiredIndex(slotUris, requiredSlots),
  );
  const [maiAnchor, setMaiAnchor] = useState<SectionAnchor | null>(null);
  const [referencesAnchor, setReferencesAnchor] = useState<SectionAnchor | null>(null);
  const [maiContentY, setMaiContentY] = useState(0);
  const [referencesContentY, setReferencesContentY] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const maiSectionRef = useRef<View>(null);
  const referencesSectionRef = useRef<View>(null);

  const missingRequiredSlots = requiredSlots.filter((s) => !slotUris[s]?.trim());
  const requiredOk = missingRequiredSlots.length === 0;
  const missingRequiredText = missingRequiredSlots.map((slot) => t(`breedRecognition.slots.${slot}.title`)).join(', ');
  const hasInsufficientCredits = Boolean(aiCredits && aiCredits.creditBalance < aiCreditCost);
  const canAnalyze = requiredOk && !loading && !hasInsufficientCredits;
  const currentRequiredSlot = requiredSlots[requiredPhotoIndex] ?? requiredSlots[0];
  const activeAnchor =
    introStep === 'mai' ? maiAnchor : introStep === 'references' || introStep === 'required-photo' ? referencesAnchor : null;
  const anchoredPopupTop =
    activeAnchor != null
      ? Math.max(insets.top + 8, activeAnchor.y - 4)
      : introStep === 'mai'
        ? insets.top + 72
        : insets.top + 200;

  const remeasureAnchors = useCallback(() => {
    maiSectionRef.current?.measureInWindow((_x, y, _w, height) => {
      setMaiAnchor({ y, height });
    });
    referencesSectionRef.current?.measureInWindow((_x, y, _w, height) => {
      setReferencesAnchor({ y, height });
    });
  }, []);

  useEffect(() => {
    if (introComplete) return;
    const frame = requestAnimationFrame(() => {
      remeasureAnchors();
    });
    return () => cancelAnimationFrame(frame);
  }, [introComplete, introStep, remeasureAnchors]);

  function handleScrollContentLayout(_event: LayoutChangeEvent) {
    remeasureAnchors();
  }

  useEffect(() => {
    if (introComplete || introStep !== 'required-photo') return;
    if (!slotUris[currentRequiredSlot]?.trim()) return;

    const nextMissing = requiredSlots.findIndex((slot) => !slotUris[slot]?.trim());
    if (nextMissing >= 0) {
      setRequiredPhotoIndex(nextMissing);
      return;
    }
    setIntroComplete(true);
  }, [slotUris, introComplete, introStep, currentRequiredSlot, requiredSlots]);

  function advanceIntroStep() {
    if (introStep === 'mai') {
      setIntroStep('references');
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, referencesContentY - 12), animated: true });
        remeasureAnchors();
      });
      return;
    }
    if (introStep === 'references') {
      setRequiredPhotoIndex(firstMissingRequiredIndex(slotUris, requiredSlots));
      setIntroStep('required-photo');
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, referencesContentY - 12), animated: true });
        remeasureAnchors();
      });
      return;
    }
    if (hasAllRequiredSlots(slotUris, requiredSlots)) {
      setIntroComplete(true);
    }
  }

  function retreatIntroStep() {
    if (introStep === 'references') {
      setIntroStep('mai');
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, maiContentY - 12), animated: true });
        remeasureAnchors();
      });
    }
  }

  function renderIntroModalContent() {
    if (introStep === 'mai') {
      return (
        <>
          <View className="flex-row items-end gap-3">
            <View className="h-36 w-28 shrink-0 overflow-hidden">
              <Image
                source={MAI_GUIDING}
                style={styles.maiIntroImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                accessibilityLabel="Mai"
              />
            </View>
            <View className="min-w-0 flex-1 pb-1">
              <Text className="text-base font-bold text-slate-900">{t('breedRecognition.noteTitle')}</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600">{t('breedRecognition.noteBody')}</Text>
            </View>
          </View>
          <IntroNavButtons onNext={advanceIntroStep} />
        </>
      );
    }

    if (introStep === 'references') {
      return (
        <>
          <Text className="text-base font-bold text-slate-900">{t('breedRecognition.referencesTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">{t('breedRecognition.referencesBody')}</Text>
          <View className="mt-4 gap-2">
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
          <IntroNavButtons showBack onBack={retreatIntroStep} onNext={advanceIntroStep} />
        </>
      );
    }

    const uploadedCount = requiredSlots.filter((slot) => Boolean(slotUris[slot]?.trim())).length;

    return (
      <>
        <Text className="text-base font-bold text-slate-900">{t('breedRecognition.photoSectionTitle')}</Text>
        <Text className="mt-2 text-sm text-slate-600">
          {t('breedRecognition.introRequiredPhotoProgress', {
            current: Math.min(uploadedCount + 1, requiredSlots.length),
            total: requiredSlots.length,
          })}
        </Text>
        <View className="mt-4">
          <BreedRecognitionSlotCard
            slot={currentRequiredSlot}
            required
            uri={slotUris[currentRequiredSlot]}
            pickTestId={`breed-recognition-intro-pick-photo-${currentRequiredSlot}`}
            changeTestId={`breed-recognition-intro-change-photo-${currentRequiredSlot}`}
            clearTestId={`breed-recognition-intro-clear-photo-${currentRequiredSlot}`}
            onPick={() => onPickSlot(currentRequiredSlot)}
            onClear={() => onClearSlot(currentRequiredSlot)}
          />
        </View>
      </>
    );
  }

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
        ref={scrollViewRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 }}
        onLayout={handleScrollContentLayout}
        onContentSizeChange={remeasureAnchors}
        onScroll={remeasureAnchors}
        scrollEventThrottle={16}
      >
        {aiCredits && hasInsufficientCredits ? (
          <View className="mb-4 rounded-xl border border-amber-200 bg-white px-4 py-3">
            <Text className="text-sm font-semibold text-amber-900">{t('aiCredits.outOfCredits')}</Text>
          </View>
        ) : null}

        <View
          ref={maiSectionRef}
          testID="breed-recognition-mai-section"
          onLayout={(event) => {
            setMaiContentY(event.nativeEvent.layout.y);
            remeasureAnchors();
          }}
          className="mb-4 flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
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

        <View
          ref={referencesSectionRef}
          testID="breed-recognition-references-section"
          onLayout={(event) => {
            setReferencesContentY(event.nativeEvent.layout.y);
            remeasureAnchors();
          }}
          className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        >
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

        <Text className="mb-3 text-base font-bold text-slate-900">{t('breedRecognition.photoSectionTitle')}</Text>
        <View className="gap-3">
          {slotOrder.map((slot) => {
            const required = requiredSlots.includes(slot);
            return (
              <BreedRecognitionSlotCard
                key={slot}
                slot={slot}
                required={required}
                uri={slotUris[slot]}
                pickTestId={`breed-recognition-pick-photo-${slot}`}
                changeTestId={`breed-recognition-change-photo-${slot}`}
                clearTestId={`breed-recognition-clear-photo-${slot}`}
                onPick={() => onPickSlot(slot)}
                onClear={() => onClearSlot(slot)}
              />
            );
          })}
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
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
          className={`mt-2 flex-row items-center justify-center gap-2 rounded-xl py-4 ${canAnalyze && introComplete ? 'active:opacity-90' : 'opacity-45'}`}
          style={{ backgroundColor: PRIMARY }}
          onPress={onAnalyze}
          disabled={!canAnalyze || !introComplete}
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

      <Modal visible={!introComplete} transparent animationType="fade" onRequestClose={() => undefined}>
        <View testID="breed-recognition-intro-modal" className="flex-1 bg-black/40">
          <View
            className="absolute left-5 right-5"
            style={{
              top: anchoredPopupTop,
              maxHeight: introStep === 'required-photo' ? '42%' : '78%',
            }}
          >
            <View className="rounded-2xl bg-white p-4 shadow-2xl" style={styles.introAnchoredCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {renderIntroModalContent()}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  slotPreviewImage: {
    width: '100%',
    height: 112,
  },
  maiIntroImage: {
    width: 112,
    height: 144,
  },
  introAnchoredCard: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
