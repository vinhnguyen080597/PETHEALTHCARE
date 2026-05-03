import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

const PRIMARY = '#1E6FE8';

type OnboardingHealthPromptScreenProps = {
  petName: string;
  onCheckHealth: () => void;
  onSkip: () => void;
};

/** After first pet is created — offer optional health check before home. */
export function OnboardingHealthPromptScreen({
  petName,
  onCheckHealth,
  onSkip,
}: OnboardingHealthPromptScreenProps) {
  return (
    <View className="flex-1 bg-white px-6 pt-4">
      <View className="mb-6 items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${PRIMARY}18` }}>
          <Ionicons name="medkit" size={40} color={PRIMARY} />
        </View>
        <Text className="text-center text-2xl font-bold text-slate-900">Nice work!</Text>
        <Text className="mt-2 text-center text-base leading-6 text-slate-600">
          {petName} is on your profile. Would you like to run a quick health check with photos now?
        </Text>
      </View>

      <Pressable
        className="mb-3 rounded-xl py-4 active:opacity-90"
        style={{ backgroundColor: PRIMARY }}
        onPress={onCheckHealth}
      >
        <Text className="text-center text-base font-bold text-white">Check health now</Text>
      </Pressable>

      <Pressable
        className="rounded-xl border border-slate-300 bg-white py-4 active:bg-slate-50"
        onPress={onSkip}
      >
        <Text className="text-center text-base font-semibold text-slate-700">Maybe later</Text>
      </Pressable>

      <Text className="mt-6 text-center text-xs leading-5 text-slate-400">
        You can always start a scan from the home screen under your pet.
      </Text>
    </View>
  );
}
