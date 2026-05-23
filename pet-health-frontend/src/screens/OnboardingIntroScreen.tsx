import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAI_AND_PETS } from '../assets/maiOnboardingAssets';

const PRIMARY = '#1E6FE8';
const BUBBLE_BG = '#F0F7FF';
const BUBBLE_BORDER = '#BFDBFE';

type OnboardingIntroScreenProps = {
  onGo: () => void;
};

const titleShadow = {
  textShadowColor: 'rgba(255,255,255,0.95)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
};

/** First-login welcome before creating the first pet profile. */
export function OnboardingIntroScreen({ onGo }: OnboardingIntroScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const bubbleScrollMaxHeight = Math.round(windowHeight * 0.44);

  return (
    <View testID="onboarding-intro-screen" className="flex-1 bg-white">
      <Image
        source={MAI_AND_PETS}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel="Mai and pets"
      />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          paddingTop: 8,
          paddingHorizontal: 20,
        }}
      >
        <Text className="mb-2 text-center text-lg font-bold text-slate-900" style={titleShadow}>
          {t('onboarding.introTitle')}
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: bubbleScrollMaxHeight }}
        >
          <View className="items-center">
            <View
              className="w-full max-w-md rounded-3xl border px-5 py-4"
              style={{ backgroundColor: BUBBLE_BG, borderColor: BUBBLE_BORDER }}
            >
              <Text className="text-center text-[15px] font-bold leading-[23px] text-slate-900">
                {t('onboarding.introBubbleWelcome')}
              </Text>
              <View className="mx-auto my-3 h-px w-16 bg-blue-200" />
              <Text className="text-center text-[15px] font-medium leading-[23px] text-slate-800">
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
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 14),
          backgroundColor: 'rgba(255,255,255,0.88)',
        }}
      >
        <Pressable
          testID="onboarding-intro-go-button"
          accessibilityRole="button"
          accessibilityLabel="Start pet onboarding"
          className="rounded-xl py-4 active:opacity-90"
          style={{ backgroundColor: PRIMARY }}
          onPress={onGo}
        >
          <Text className="text-center text-base font-bold text-white">{t('onboarding.go')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
