import { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAI_NOTE } from '../assets/maiAssets';

type MaiScheduleSavingModalProps = {
  visible: boolean;
  petName: string;
};

function BouncingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function animateDot(dot: Animated.Value, delayMs: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(dot, { toValue: -7, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(Math.max(0, 560 - delayMs)),
        ]),
      );
    }

    const animations = [animateDot(dot1, 0), animateDot(dot2, 160), animateDot(dot3, 320)];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dot1, dot2, dot3]);

  return (
    <View className="mt-5 flex-row items-center justify-center gap-2">
      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View
          key={index}
          style={{ transform: [{ translateY: dot }] }}
          className="h-2.5 w-2.5 rounded-full bg-blue-600"
        />
      ))}
    </View>
  );
}

export function MaiScheduleSavingModal({ visible, petName }: MaiScheduleSavingModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View testID="mai-schedule-saving-modal" className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-sm items-center rounded-3xl bg-white px-6 pb-7 pt-6">
          <Text className="text-center text-base font-semibold leading-6 text-slate-800">
            {t('coreCare.maiSavingScheduleMessage', { name: petName })}
          </Text>
          <BouncingDots />
          <Image
            source={MAI_NOTE}
            resizeMode="contain"
            accessibilityLabel="Mai"
            className="mt-4"
            style={{ width: 160, height: 160 }}
          />
        </View>
      </View>
    </Modal>
  );
}
