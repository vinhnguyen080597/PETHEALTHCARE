import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAI_AND_PETS } from '../assets/maiOnboardingAssets';
import { BRAND } from '../theme/brand';

const BUBBLE_BG = '#FFF7ED';
const BUBBLE_BORDER = '#FED7AA';

type OnboardingIntroScreenProps = {
  onGo: () => void;
};

/** First-login welcome before the user chooses their own next step. */
export function OnboardingIntroScreen({ onGo }: OnboardingIntroScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 760;

  return (
    <View testID="onboarding-intro-screen" className="flex-1 bg-white">
      <Image
        source={MAI_AND_PETS}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel="Mai and pets"
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(insets.top, 12) + (compact ? 28 : 40),
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View className="items-center">
          <View
            className={`w-full max-w-md rounded-3xl border ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
            style={{ backgroundColor: BUBBLE_BG, borderColor: BUBBLE_BORDER }}
          >
            <Text
              className={`text-center font-bold leading-[23px] text-slate-900 ${compact ? 'text-sm' : 'text-[15px]'}`}
            >
              {t('onboarding.introBubbleWelcome')}
            </Text>
            <View className="mx-auto my-3 h-px w-16" style={{ backgroundColor: '#FDBA74' }} />
            <Text
              className={`text-center font-medium leading-[23px] text-slate-800 ${compact ? 'text-sm' : 'text-[15px]'}`}
            >
              {t('onboarding.introBubbleMission')}
            </Text>
          </View>
          <View className="items-center" style={{ marginTop: -1 }}>
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 12,
                borderRightWidth: 12,
                borderTopWidth: 14,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: BUBBLE_BG,
              }}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 14),
          backgroundColor: 'rgba(255,255,255,0.88)',
        }}
      >
        <Pressable
          testID="onboarding-intro-go-button"
          accessibilityRole="button"
          accessibilityLabel="Go to home"
          className={`rounded-xl active:opacity-90 ${compact ? 'py-3.5' : 'py-4'}`}
          style={{ backgroundColor: BRAND.primary }}
          onPress={onGo}
        >
          <Text className="text-center text-base font-bold text-white">{t('onboarding.go')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
