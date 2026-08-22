import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';

import {
  SERVICES_BACKGROUND,
  SERVICES_HERO_MAI,
  SERVICES_ICON_BREED,
  SERVICES_ICON_HEALTH,
  SERVICES_ICON_VACCINE,
} from '../assets/servicesOnboardingAssets';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { BRAND } from '../theme/brand';
import { buttonContainerStyle, buttonLabelStyle } from '../theme/buttonStyles';

const PANEL_HORIZONTAL_INSET = 16 * 2 + 20 * 2;

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
    id: 'vaccine',
    icon: SERVICES_ICON_VACCINE,
    titleKey: 'onboarding.serviceVaccineTitle',
    descriptionKey: 'onboarding.serviceVaccineDesc',
    ctaKey: 'onboarding.serviceVaccineCta',
  },
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
];

type OnboardingHealthPromptScreenProps = {
  petName: string;
  showBreedService?: boolean;
  showHealthService?: boolean;
  onBack: () => void;
  onExploreBreed: () => void;
  onCheckHealth: () => void;
  onManageVaccines: () => void;
};

function ServiceCard({
  item,
  iconWidth,
  iconHeight,
  compact,
  onPress,
}: {
  item: ServiceCardConfig;
  iconWidth: number;
  iconHeight: number;
  compact: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      className="rounded-2xl px-4 py-3"
      style={{
        backgroundColor: BRAND.card,
        borderWidth: 1,
        borderColor: BRAND.borderCard,
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
          style={{ width: iconWidth, height: iconHeight }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text
        className={`text-center font-bold ${compact ? 'mt-2 text-sm' : 'mt-3 text-base'}`}
        style={{ color: BRAND.textPrimary }}
      >
        {t(item.titleKey)}
      </Text>
      <Text
        className={`mt-1.5 text-center leading-5 ${compact ? 'text-xs' : 'text-sm'}`}
        style={{ color: BRAND.textSecondary }}
      >
        {t(item.descriptionKey)}
      </Text>
      <Pressable
        testID={`onboarding-service-${item.id}-button`}
        className={`rounded-xl bg-orange-500 active:opacity-95 ${compact ? 'mt-3 py-2.5' : 'mt-4 py-3'}`}
        style={({ pressed }) => buttonContainerStyle('primary', pressed)}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text className={`text-center font-bold ${compact ? 'text-xs' : 'text-sm'}`} style={buttonLabelStyle('primary')}>
          {t(item.ctaKey)}
        </Text>
      </Pressable>
    </View>
  );
}

/** Pet care services hub after add pet — warm orange brand tokens. */
export function OnboardingHealthPromptScreen({
  petName,
  showBreedService = true,
  showHealthService = true,
  onBack,
  onExploreBreed,
  onCheckHealth,
  onManageVaccines,
}: OnboardingHealthPromptScreenProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleCards = useMemo(
    () =>
      SERVICE_CARDS.filter((item) => {
        if (item.id === 'breed') return showBreedService;
        if (item.id === 'health') return showHealthService;
        return true;
      }),
    [showBreedService, showHealthService],
  );

  const compact = windowHeight < 760;
  const contentWidth = Math.min(windowWidth, 760);
  const cardWidth = Math.max(240, contentWidth - PANEL_HORIZONTAL_INSET);
  const iconWidth = compact ? 104 : 130;
  const iconHeight = compact ? 88 : 112;
  const heroHeight = Math.min(
    compact ? 168 : 220,
    Math.round(contentWidth * (compact ? 0.5 : 0.58)),
    Math.round(windowHeight * (compact ? 0.22 : 0.28)),
  );

  const cardActions = useMemo(
    () =>
      ({
        breed: onExploreBreed,
        health: onCheckHealth,
        vaccine: onManageVaccines,
      }) satisfies Record<ServiceCardId, () => void>,
    [onExploreBreed, onCheckHealth, onManageVaccines],
  );

  const activeCard = visibleCards[Math.min(activeIndex, Math.max(visibleCards.length - 1, 0))];
  const headerTitle = t('onboarding.careServicesTitle', { name: petName.trim() || t('home.petFallback') });

  return (
    <View testID="onboarding-health-prompt-screen" className="flex-1" style={{ backgroundColor: BRAND.appBackground }}>
      <SubScreenHeader title={headerTitle} onBack={onBack} backTestID="onboarding-health-prompt-back-button" />

      <View className="flex-1">
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <View className="w-full items-center px-2">
            <Image
              source={SERVICES_HERO_MAI}
              style={{ width: contentWidth - 24, height: heroHeight }}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityLabel="Mai with pets"
            />
          </View>

          <View
            className="mx-4 -mt-5 rounded-3xl px-5 pb-5 pt-4"
            style={{
              backgroundColor: BRAND.card,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text
              className={`mb-3 text-center leading-[22px] ${compact ? 'text-sm' : 'text-[15px]'}`}
              style={{ color: BRAND.textSecondary }}
            >
              {t('onboarding.servicesWelcomeBody')}
            </Text>

            <View style={{ width: cardWidth, alignSelf: 'center' }}>
              {activeCard ? (
                <ServiceCard
                  item={activeCard}
                  iconWidth={iconWidth}
                  iconHeight={iconHeight}
                  compact={compact}
                  onPress={cardActions[activeCard.id]}
                />
              ) : null}
            </View>

            <View className="mt-3 flex-row items-center justify-center gap-2">
              {visibleCards.map((card, index) => (
                <Pressable
                  key={card.id}
                  testID={`onboarding-service-tab-${card.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t(card.titleKey)}
                  accessibilityState={{ selected: activeIndex === index }}
                  onPress={() => setActiveIndex(index)}
                  hitSlop={8}
                >
                  <View
                    style={{
                      height: 8,
                      width: activeIndex === index ? 22 : 8,
                      borderRadius: 4,
                      backgroundColor: activeIndex === index ? BRAND.btnPrimary : BRAND.borderCard,
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
