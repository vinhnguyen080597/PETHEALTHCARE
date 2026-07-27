import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const HEADER_BLUE = '#1E6FE8';
const BADGE_RED = '#EF4444';

type AppHeaderVariant = 'default' | 'marketplace';

type AppHeaderProps = {
  titleKey?: string;
  variant?: AppHeaderVariant;
  unreadMessageCount?: number;
  unreadNotificationCount?: number;
  onOpenMessages?: () => void;
  onOpenNotifications?: () => void;
};

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function HeaderActionButton({
  icon,
  label,
  badgeCount = 0,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  badgeCount?: number;
  onPress?: () => void;
}) {
  const showBadge = badgeCount > 0;
  const badgeSize = 16;
  const badgeFontSize = badgeCount > 9 ? 9 : 10;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showBadge ? `${label}, ${badgeCount}` : label}
      className="h-9 w-9 items-center justify-center rounded-full active:bg-white/15"
      hitSlop={4}
      onPress={onPress}
    >
      <View className="relative items-center justify-center">
        <Feather name={icon} size={21} color="#ffffff" />
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
              {formatBadgeCount(badgeCount)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function AppHeader({
  titleKey = 'login.appName',
  variant = 'default',
  unreadMessageCount = 0,
  unreadNotificationCount = 0,
  onOpenMessages,
  onOpenNotifications,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const isMarketplace = variant === 'marketplace';
  const leadingIcon = isMarketplace ? 'home' : 'medkit';

  return (
    <View className="px-5 py-3" style={{ backgroundColor: HEADER_BLUE }}>
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Ionicons name={leadingIcon} size={17} color="#ffffff" />
        </View>
        <Text className="min-w-0 flex-1 text-lg font-bold text-white" numberOfLines={1}>
          {t(titleKey)}
        </Text>
        <View className="flex-row items-center">
          <HeaderActionButton
            icon="message-circle"
            label={t('petFeed.accessibility.openMessages')}
            badgeCount={unreadMessageCount}
            onPress={onOpenMessages}
          />
          <HeaderActionButton
            icon="bell"
            label={t('petFeed.accessibility.openNotifications')}
            badgeCount={unreadNotificationCount}
            onPress={onOpenNotifications}
          />
        </View>
      </View>
    </View>
  );
}
