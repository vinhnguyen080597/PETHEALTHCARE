import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppScreen } from '../screens/types';

type BottomTabBarProps = {
  activeScreen: AppScreen;
  onPetFeed: () => void;
  onHome: () => void;
  onAccount: () => void;
  accountTabMode?: 'account' | 'logout';
};

export function BottomTabBar({ activeScreen, onPetFeed, onHome, onAccount, accountTabMode = 'account' }: BottomTabBarProps) {
  const { t } = useTranslation();
  const isLogoutTab = accountTabMode === 'logout';
  const petFeedTabActive = activeScreen === 'pet-feed';
  const homeTabActive = activeScreen === 'home';
  const accountTabActive = !isLogoutTab && activeScreen === 'account';
  return (
    <View className="flex-row border-t border-slate-200 bg-white px-2 py-2">
      <Pressable
        testID="bottom-tab-pet-feed-button"
        accessibilityRole="button"
        accessibilityLabel="Open pet feed tab"
        accessibilityState={{ selected: petFeedTabActive, disabled: petFeedTabActive }}
        className={`flex-1 items-center rounded-xl py-2 ${petFeedTabActive ? 'bg-blue-50' : ''}`}
        disabled={petFeedTabActive}
        onPress={petFeedTabActive ? undefined : onPetFeed}
      >
        <Ionicons name="newspaper-outline" size={22} color={petFeedTabActive ? '#2563eb' : '#64748b'} />
        <Text className={`text-xs font-medium ${petFeedTabActive ? 'text-blue-600' : 'text-slate-600'}`}>
          {t('tabs.petFeed')}
        </Text>
      </Pressable>
      <Pressable
        testID="bottom-tab-home-button"
        accessibilityRole="button"
        accessibilityLabel="Open home tab"
        accessibilityState={{ selected: homeTabActive, disabled: homeTabActive }}
        className={`flex-1 items-center rounded-xl py-2 ${homeTabActive ? 'bg-blue-50' : ''}`}
        disabled={homeTabActive}
        onPress={homeTabActive ? undefined : onHome}
      >
        <Ionicons name="home-outline" size={22} color={homeTabActive ? '#2563eb' : '#64748b'} />
        <Text className={`text-xs font-medium ${homeTabActive ? 'text-blue-600' : 'text-slate-600'}`}>
          {t('tabs.home')}
        </Text>
      </Pressable>
      <Pressable
        testID="bottom-tab-account-button"
        accessibilityRole="button"
        accessibilityLabel={isLogoutTab ? 'Log out' : 'Open account tab'}
        accessibilityState={{ selected: accountTabActive, disabled: accountTabActive }}
        className={`flex-1 items-center rounded-xl py-2 ${accountTabActive ? 'bg-blue-50' : ''}`}
        disabled={accountTabActive}
        onPress={accountTabActive ? undefined : onAccount}
      >
        <Ionicons name={isLogoutTab ? 'log-out-outline' : 'person-circle-outline'} size={22} color={accountTabActive ? '#2563eb' : '#64748b'} />
        <Text className={`text-xs font-medium ${accountTabActive ? 'text-blue-600' : 'text-slate-600'}`}>
          {t(isLogoutTab ? 'tabs.logout' : 'tabs.account')}
        </Text>
      </Pressable>
    </View>
  );
}
