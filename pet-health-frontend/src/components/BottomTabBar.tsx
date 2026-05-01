import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { AppScreen } from '../screens/types';

type BottomTabBarProps = {
  activeScreen: AppScreen;
  onHome: () => void;
  onHistory: () => void;
  onLogout: () => void;
};

export function BottomTabBar({ activeScreen, onHome, onHistory, onLogout }: BottomTabBarProps) {
  return (
    <View className="flex-row border-t border-slate-200 bg-white px-4 py-3">
      <Pressable className={`flex-1 items-center py-2 ${activeScreen === 'home' ? 'bg-blue-50' : ''}`} onPress={onHome}>
        <Ionicons name="home-outline" size={22} color="#334155" />
        <Text className="text-xs">Home</Text>
      </Pressable>
      <Pressable className={`flex-1 items-center py-2 ${activeScreen === 'history' ? 'bg-blue-50' : ''}`} onPress={onHistory}>
        <Ionicons name="time-outline" size={22} color="#334155" />
        <Text className="text-xs">History</Text>
      </Pressable>
      <Pressable className="flex-1 items-center py-2" onPress={onLogout}>
        <Ionicons name="log-out-outline" size={22} color="#334155" />
        <Text className="text-xs">Logout</Text>
      </Pressable>
    </View>
  );
}
