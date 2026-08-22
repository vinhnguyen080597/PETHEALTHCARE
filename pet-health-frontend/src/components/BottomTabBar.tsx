import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../theme/brand';
import { tabActiveContainerStyle } from '../theme/buttonStyles';
import type { AppScreen } from '../screens/types';

type BottomTabBarProps = {
  activeScreen: AppScreen;
  onPetFeed: () => void;
  onHome: () => void;
  onAccount: () => void;
  accountTabMode?: 'account' | 'features';
};

function TabItem({
  testID,
  accessibilityLabel,
  active,
  disabled,
  icon,
  label,
  onPress,
}: {
  testID: string;
  accessibilityLabel: string;
  active: boolean;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      className="flex-1 items-center rounded-full py-2"
      style={active ? tabActiveContainerStyle() : undefined}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={active ? BRAND.btnPrimary : BRAND.textMuted} />
      <Text className="text-xs font-medium" style={{ color: active ? BRAND.textBrandLink : BRAND.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomTabBar({ activeScreen, onPetFeed, onHome, onAccount, accountTabMode = 'account' }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFeaturesTab = accountTabMode === 'features';
  const petFeedTabActive = activeScreen === 'pet-feed';
  const homeTabActive = activeScreen === 'home';
  const accountTabActive = isFeaturesTab ? activeScreen === 'admin-features' : activeScreen === 'account';

  return (
    <View
      className="flex-row border-t px-2 pt-2"
      style={{
        backgroundColor: BRAND.card,
        borderTopWidth: 1,
        borderTopColor: BRAND.borderLight,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <TabItem
        testID="bottom-tab-pet-feed-button"
        accessibilityLabel="Open pet feed tab"
        active={petFeedTabActive}
        disabled={petFeedTabActive}
        icon="newspaper-outline"
        label={t('tabs.petFeed')}
        onPress={petFeedTabActive ? undefined : onPetFeed}
      />
      <TabItem
        testID="bottom-tab-home-button"
        accessibilityLabel="Open home tab"
        active={homeTabActive}
        disabled={homeTabActive}
        icon="home-outline"
        label={t('tabs.home')}
        onPress={homeTabActive ? undefined : onHome}
      />
      <TabItem
        testID="bottom-tab-account-button"
        accessibilityLabel={isFeaturesTab ? 'Open app features management' : 'Open account tab'}
        active={accountTabActive}
        disabled={accountTabActive}
        icon={isFeaturesTab ? 'options-outline' : 'person-circle-outline'}
        label={t(isFeaturesTab ? 'tabs.features' : 'tabs.account')}
        onPress={accountTabActive ? undefined : onAccount}
      />
    </View>
  );
}
