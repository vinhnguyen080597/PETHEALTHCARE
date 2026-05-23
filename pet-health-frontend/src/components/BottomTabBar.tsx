import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppScreen } from '../screens/types';

type BottomTabBarProps = {
  activeScreen: AppScreen;
  onHome: () => void;
  onHistory: () => void;
  onLogout: () => void;
};

export function BottomTabBar({ activeScreen, onHome, onHistory, onLogout }: BottomTabBarProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row border-t border-slate-200 bg-white px-2 py-2">
      <Pressable
        testID="bottom-tab-home-button"
        accessibilityRole="button"
        accessibilityLabel="Open home tab"
        className={`flex-1 items-center rounded-xl py-2 ${activeScreen === 'home' ? 'bg-blue-50' : ''}`}
        onPress={onHome}
      >
        <Ionicons name="home-outline" size={22} color={activeScreen === 'home' ? '#2563eb' : '#64748b'} />
        <Text className={`text-xs font-medium ${activeScreen === 'home' ? 'text-blue-600' : 'text-slate-600'}`}>
          {t('tabs.home')}
        </Text>
      </Pressable>
      <Pressable
        testID="bottom-tab-history-button"
        accessibilityRole="button"
        accessibilityLabel="Open history tab"
        className={`flex-1 items-center rounded-xl py-2 ${activeScreen === 'history' ? 'bg-blue-50' : ''}`}
        onPress={onHistory}
      >
        <Ionicons name="time-outline" size={22} color={activeScreen === 'history' ? '#2563eb' : '#64748b'} />
        <Text className={`text-xs font-medium ${activeScreen === 'history' ? 'text-blue-600' : 'text-slate-600'}`}>
          {t('tabs.history')}
        </Text>
      </Pressable>
      <Pressable
        testID="bottom-tab-logout-button"
        accessibilityRole="button"
        accessibilityLabel="Log out"
        className="flex-1 items-center rounded-xl py-2"
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={22} color="#64748b" />
        <Text className="text-xs font-medium text-slate-600">{t('tabs.logout')}</Text>
      </Pressable>
    </View>
  );
}
