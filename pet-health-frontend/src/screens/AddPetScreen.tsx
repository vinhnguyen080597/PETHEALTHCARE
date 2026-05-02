import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type PetFormVariant = 'create' | 'edit';

type AddPetScreenProps = {
  variant: PetFormVariant;
  petName: string;
  petSpecies: string;
  petBreed: string;
  petAge: string;
  petAvatarUrl: string;
  onChangeName: (value: string) => void;
  onChangeSpecies: (value: string) => void;
  onChangeBreed: (value: string) => void;
  onChangeAge: (value: string) => void;
  onChangeAvatarUrl: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** Matches `figma/code` pet profile / add pet: top bar + form on gray background. */
export function AddPetScreen({
  variant,
  petName,
  petSpecies,
  petBreed,
  petAge,
  petAvatarUrl,
  onChangeName,
  onChangeSpecies,
  onChangeBreed,
  onChangeAge,
  onChangeAvatarUrl,
  onSubmit,
  onCancel,
}: AddPetScreenProps) {
  const title = variant === 'create' ? 'Add New Pet' : 'Edit Pet';
  const submitLabel = variant === 'create' ? 'Save Pet' : 'Update Pet';

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 border-b border-gray-200 bg-white px-4 py-4">
        <Pressable className="rounded-lg p-2 active:bg-gray-100" onPress={onCancel} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900">{title}</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="mb-5">
          <Text className="mb-2 text-sm text-slate-700">Pet name</Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Enter pet name"
            placeholderTextColor="#9ca3af"
            value={petName}
            onChangeText={onChangeName}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-sm text-slate-700">Species</Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="e.g. cat, dog, bird"
            placeholderTextColor="#9ca3af"
            value={petSpecies}
            onChangeText={onChangeSpecies}
            autoCapitalize="none"
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-sm text-slate-700">Breed</Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Enter breed"
            placeholderTextColor="#9ca3af"
            value={petBreed}
            onChangeText={onChangeBreed}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-sm text-slate-700">Age (years)</Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="e.g. 3"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={petAge}
            onChangeText={onChangeAge}
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 text-sm text-slate-700">Avatar URL (optional)</Text>
          <TextInput
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="https://..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            value={petAvatarUrl}
            onChangeText={onChangeAvatarUrl}
          />
        </View>

        <Pressable className="rounded-xl bg-blue-600 py-3 active:bg-blue-700" onPress={onSubmit}>
          <Text className="text-center text-base font-semibold text-white">{submitLabel}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
