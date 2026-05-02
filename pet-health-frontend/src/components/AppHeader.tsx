import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

/** Matches `figma/code` home hero: gradient-like blue bar + stethoscope + title. */
export function AppHeader() {
  return (
    <View className="bg-blue-600 px-6 pb-8 pt-2">
      <View className="mb-2 flex-row items-center gap-3">
        <Ionicons name="medkit-outline" size={32} color="#ffffff" />
        <Text className="text-2xl font-semibold text-white">Catties Health Care</Text>
      </View>
      <Text className="text-base text-blue-100">{"Your pet's health assistant powered by Catties"}</Text>
    </View>
  );
}
