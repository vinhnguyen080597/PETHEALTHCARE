import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PET_MARKET_AVATAR } from '../assets/brandAssets';
import { BRAND } from '../theme/brand';
import { buttonContainerStyle } from '../theme/buttonStyles';
import { splitBrandName } from '../utils/brandDisplay';

const BADGE_RED = BRAND.logout;

type AppHeaderProps = {
  titleKey?: string;
  /** @deprecated Icon is always the brand avatar; kept for call-site compatibility. */
  variant?: 'default' | 'marketplace';
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
      className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
      style={({ pressed }) => buttonContainerStyle('secondary', pressed)}
      hitSlop={4}
      onPress={onPress}
    >
      <View className="relative items-center justify-center">
        <Feather name={icon} size={20} color={BRAND.btnPrimary} />
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

/** Clean minimalist header — white surface, orange accent icons. */
export function AppHeader({
  titleKey = 'login.appName',
  unreadMessageCount = 0,
  unreadNotificationCount = 0,
  onOpenMessages,
  onOpenNotifications,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const title = t(titleKey);
  const { lead, rest } = splitBrandName(title);

  return (
    <View
      testID="app-header"
      className="border-b px-5 py-3"
      style={{ backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.borderLight }}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          testID="app-header-brand-avatar"
          className="h-9 w-9 items-center justify-center overflow-hidden rounded-full p-0.5"
          style={{ backgroundColor: BRAND.surfaceLight }}
        >
          <View className="h-full w-full overflow-hidden rounded-full">
            <Image
              source={PET_MARKET_AVATAR}
              style={{ height: '100%', width: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={t('login.appName')}
            />
          </View>
        </View>
        <Text className="min-w-0 flex-1 text-lg font-bold" numberOfLines={1}>
          <Text style={{ color: BRAND.btnPrimary }}>{lead}</Text>
          {rest ? <Text style={{ color: BRAND.textPrimary }}>{rest}</Text> : null}
        </Text>
        <View className="flex-row items-center gap-1.5">
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
