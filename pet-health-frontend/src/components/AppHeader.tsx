import { Text, View } from 'react-native';

export function AppHeader() {
  return (
    <View className="bg-blue-700 px-5 pb-5 pt-6">
      <Text className="text-2xl font-semibold text-white">Catties Health Care</Text>
      <Text className="mt-1 text-blue-100">Your pet's health assistant</Text>
    </View>
  );
}
