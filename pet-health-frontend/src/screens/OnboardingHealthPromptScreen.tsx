import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SERVICES_BACKGROUND,
  SERVICES_HERO_MAI,
  SERVICES_ICON_BREED,
  SERVICES_ICON_HEALTH,
  SERVICES_ICON_VACCINE,
} from '../assets/servicesOnboardingAssets';

const TEAL = '#0F766E';
const CARD_GAP = 12;

type ServiceCardId = 'breed' | 'health' | 'vaccine';

type ServiceCardConfig = {
  id: ServiceCardId;
  icon: ImageSourcePropType;
  titleKey: string;
  descriptionKey: string;
  ctaKey: string;
};

const SERVICE_CARDS: ServiceCardConfig[] = [
  {
    id: 'breed',
    icon: SERVICES_ICON_BREED,
    titleKey: 'onboarding.serviceBreedTitle',
    descriptionKey: 'onboarding.serviceBreedDesc',
    ctaKey: 'onboarding.serviceBreedCta',
  },
  {
    id: 'health',
    icon: SERVICES_ICON_HEALTH,
    titleKey: 'onboarding.serviceHealthTitle',
    descriptionKey: 'onboarding.serviceHealthDesc',
    ctaKey: 'onboarding.serviceHealthCta',
  },
  {
    id: 'vaccine',
    icon: SERVICES_ICON_VACCINE,
    titleKey: 'onboarding.serviceVaccineTitle',
    descriptionKey: 'onboarding.serviceVaccineDesc',
    ctaKey: 'onboarding.serviceVaccineCta',
  },
];

type OnboardingHealthPromptScreenProps = {
  onExploreBreed: () => void;
  onCheckHealth: () => void;
  onManageVaccines: () => void;
  onSkip: () => void;
};

function ServiceCard({
  item,
  width,
  onPress,
}: {
  item: ServiceCardConfig;
  width: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      className="rounded-2xl border border-slate-100 bg-white px-4 py-4"
      style={{
        width,
        marginRight: CARD_GAP,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View className="items-center">
        <Image
          source={item.icon}
          style={{ width: 100, height: 100 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text className="mt-3 text-center text-base font-bold text-slate-900">{t(item.titleKey)}</Text>
      <Text className="mt-2 min-h-[52px] text-center text-sm leading-5 text-slate-600">{t(item.descriptionKey)}</Text>
      <Pressable
        className="mt-4 rounded-xl py-3 active:opacity-90"
        style={{ backgroundColor: TEAL }}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text className="text-center text-sm font-bold text-white">{t(item.ctaKey)}</Text>
      </Pressable>
    </View>
  );
}

/** Shown after each new pet is added — showcase Catties services before home. */
export function OnboardingHealthPromptScreen({
  onExploreBreed,
  onCheckHealth,
  onManageVaccines,
  onSkip,
}: OnboardingHealthPromptScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ServiceCardConfig>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const horizontalPadding = 20;
  const cardWidth = Math.round(windowWidth * 0.62);
  const snapInterval = cardWidth + CARD_GAP;

  const cardActions = useMemo(
    () =>
      ({
        breed: onExploreBreed,
        health: onCheckHealth,
        vaccine: onManageVaccines,
      }) satisfies Record<ServiceCardId, () => void>,
    [onExploreBreed, onCheckHealth, onManageVaccines],
  );

  const onCarouselScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / snapInterval);
      const clamped = Math.max(0, Math.min(index, SERVICE_CARDS.length - 1));
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [snapInterval],
  );

  const renderCard = useCallback(
    ({ item }: { item: ServiceCardConfig }) => (
      <ServiceCard item={item} width={cardWidth} onPress={cardActions[item.id]} />
    ),
    [cardActions, cardWidth],
  );

  return (
    <View testID="onboarding-health-prompt-screen" className="flex-1 bg-slate-100">
      <Image
        source={SERVICES_BACKGROUND}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: 100 + Math.max(insets.bottom, 12),
        }}
      >
        <View className="items-center px-5 pb-2">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-600">
              <Ionicons name="paw" size={18} color="#ffffff" />
            </View>
            <Text className="text-lg font-bold text-slate-900">{t('login.appName')}</Text>
          </View>
        </View>

        <View className="w-full items-center px-2" style={{ backgroundColor: 'transparent' }}>
          <Image
            source={SERVICES_HERO_MAI}
            style={{ width: windowWidth - 24, height: Math.min(280, windowWidth * 0.68) }}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityLabel="Mai with pets"
          />
        </View>

        <View
          className="mx-4 -mt-6 overflow-hidden rounded-t-3xl bg-white px-5 pb-6 pt-5"
          style={{
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-center text-lg font-bold leading-7 text-slate-900">
            {t('onboarding.servicesWelcomeTitle')}
          </Text>
          <Text className="mt-3 text-center text-[15px] leading-[22px] text-slate-600">
            {t('onboarding.servicesWelcomeBody')}
          </Text>

          <FlatList
            ref={listRef}
            data={SERVICE_CARDS}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: snapInterval,
              offset: snapInterval * index,
              index,
            })}
            onScrollToIndexFailed={() => undefined}
            contentContainerStyle={{
              paddingTop: 20,
              paddingHorizontal: horizontalPadding - 4,
              paddingRight: horizontalPadding + 8,
            }}
            style={{ marginHorizontal: -horizontalPadding }}
          />

          <View className="mt-4 flex-row items-center justify-center gap-2">
            {SERVICE_CARDS.map((card, index) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityLabel={t(card.titleKey)}
                onPress={() => {
                  listRef.current?.scrollToIndex({ index, animated: true });
                  setActiveIndex(index);
                }}
                hitSlop={8}
              >
                <View
                  style={{
                    height: 8,
                    width: activeIndex === index ? 22 : 8,
                    borderRadius: 4,
                    backgroundColor: activeIndex === index ? TEAL : '#cbd5e1',
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}
      >
        <Pressable
          testID="onboarding-health-prompt-skip-button"
          className="rounded-xl border-2 bg-white py-3.5 active:bg-slate-50"
          style={{ borderColor: TEAL }}
          onPress={onSkip}
          accessibilityRole="button"
        >
          <Text className="text-center text-base font-bold" style={{ color: TEAL }}>
            {t('onboarding.maybeLater')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
