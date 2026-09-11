import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { BRAND } from '../theme/brand';
import { LISTING_SIMILAR_THUMB_SIZE } from './PetFeedDetailSiblingListingsBar';
import {
  CHAT_ICON_RIPPLE_DURATION_MS,
  CHAT_ICON_RIPPLE_MAX_SCALE,
  chatIconRippleRingDelayMs,
  chatIconRippleRingIndexes,
} from '../utils/chatIconRipple';

type ListingDetailFooterCtaProps = {
  testID: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  iconOnly?: boolean;
  /** Restart the 2s intro ripple when this changes (listing id). */
  rippleKey?: string;
};

function ChatIconRippleRing({
  delayMs,
  size,
  playKey,
}: {
  delayMs: number;
  size: number;
  playKey: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(true);

  useEffect(() => {
    progress.setValue(0);
    setActive(true);
    const animation = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(progress, {
        toValue: 1,
        duration: CHAT_ICON_RIPPLE_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setActive(false);
    });
    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [delayMs, playKey, progress]);

  if (!active) return null;

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, CHAT_ICON_RIPPLE_MAX_SCALE],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.5, 0.28, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: BRAND.btnPrimary,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export function ListingDetailFooterCta({
  testID,
  accessibilityLabel,
  icon,
  label,
  onPress,
  iconOnly = false,
  rippleKey = '',
}: ListingDetailFooterCtaProps) {
  if (iconOnly) {
    const size = LISTING_SIMILAR_THUMB_SIZE + 10;
    return (
      <View className="items-center justify-center" style={{ width: size, height: size }}>
        {chatIconRippleRingIndexes().map((index) => (
          <ChatIconRippleRing
            key={`${rippleKey}-${index}`}
            playKey={rippleKey}
            delayMs={chatIconRippleRingDelayMs(index)}
            size={size}
          />
        ))}
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          android_ripple={{
            color: 'rgba(249, 115, 22, 0.28)',
            borderless: true,
            radius: size / 2,
          }}
          className="items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            backgroundColor: BRAND.btnSecondary,
            borderColor: BRAND.borderBrand,
            zIndex: 1,
          }}
          onPress={onPress}
        >
          <Ionicons name={icon} size={32} color={BRAND.textBrandLink} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2"
      style={{
        backgroundColor: BRAND.btnSecondary,
        borderColor: BRAND.borderBrand,
      }}
      onPress={onPress}
    >
      <Ionicons name={icon} size={15} color={BRAND.textBrandLink} />
      {label ? (
        <Text className="text-xs font-semibold" style={{ color: BRAND.textBrandLink }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
