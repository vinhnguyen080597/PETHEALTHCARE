import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const PRIMARY_BLUE = '#1E6FE8';
const BADGE_RED = '#EF4444';

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
  if (count <= 0) return null;

  const badgeSize = size >= 22 ? 18 : 16;
  const badgeFontSize = count > 9 ? 9 : 10;

  return (
    <View testID={testID} className="relative items-center justify-center">
      <Ionicons name="notifications" size={size} color={PRIMARY_BLUE} />
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
    </View>
  );
}
