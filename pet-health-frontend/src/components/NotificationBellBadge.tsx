import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

const PRIMARY_BLUE = '#1E6FE8';
const BADGE_RED = '#EF4444';
const SHAKE_DURATION_MS = 2000;
const SHAKE_SWING_MS = 70;

type NotificationBellBadgeProps = {
  count: number;
  size?: number;
  testID?: string;
};

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function NotificationBellBadge({ count, size = 22, testID }: NotificationBellBadgeProps) {
  const showBadge = count > 0;
  const badgeSize = size >= 22 ? 18 : 16;
  const badgeFontSize = count > 9 ? 9 : 10;
  const rotate = useRef(new Animated.Value(0)).current;
  const hasShakenRef = useRef(false);

  useEffect(() => {
    if (count <= 0 || hasShakenRef.current) return;
    hasShakenRef.current = true;

    const swing = Animated.sequence([
      Animated.timing(rotate, {
        toValue: 1,
        duration: SHAKE_SWING_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: -1,
        duration: SHAKE_SWING_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 0,
        duration: SHAKE_SWING_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);

    const iterations = Math.max(1, Math.round(SHAKE_DURATION_MS / (SHAKE_SWING_MS * 3)));
    const animation = Animated.loop(swing, { iterations });
    animation.start(({ finished }) => {
      if (finished) rotate.setValue(0);
    });

    return () => {
      animation.stop();
      rotate.setValue(0);
    };
  }, [count, rotate]);

  const rotateStyle = {
    transform: [
      {
        rotate: rotate.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-18deg', '0deg', '18deg'],
        }),
      },
    ],
  };

  return (
    <View testID={testID} className="relative items-center justify-center">
      <Animated.View style={rotateStyle}>
        <Ionicons name="notifications" size={size} color={PRIMARY_BLUE} />
      </Animated.View>
      {showBadge ? (
        <View
          className="absolute items-center justify-center rounded-full"
          style={{
            top: -4,
            right: -6,
            minWidth: badgeSize,
            height: badgeSize,
            paddingHorizontal: 4,
            backgroundColor: BADGE_RED,
          }}
        >
          <Text
            className="font-bold text-white"
            style={{ fontSize: badgeFontSize, lineHeight: badgeFontSize + 2 }}
            numberOfLines={1}
          >
            {formatBadgeCount(count)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
