import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Pet } from '../types';

type HomeScreenProps = {
  pets: Pet[];
  selectedPetId: string | null;
  onAddPet: () => void;
  onSelectPet: (petId: string) => void;
  onStartScan: (petId: string) => void;
};

export function HomeScreen({ pets, selectedPetId, onAddPet, onSelectPet, onStartScan }: HomeScreenProps) {
  return (
    <ScrollView className="flex-1 px-4 pt-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold">My Pets</Text>
        <Pressable className="rounded-lg bg-brand-600 px-4 py-2" onPress={onAddPet}>
          <Text className="text-white">Add Pet</Text>
        </Pressable>
      </View>

      {pets.length === 0 ? (
        <View className="mt-10 items-center rounded-xl bg-white p-8">
          <Text className="text-base text-slate-600">No pets added yet</Text>
        </View>
      ) : (
        pets.map((pet) => (
          <View key={pet.id} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
            <Text className="text-lg font-semibold">{pet.name}</Text>
            <Text className="text-slate-600">
              {pet.breed ?? 'Unknown breed'} - {pet.age ?? '-'} years
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable className="rounded-lg bg-brand-600 px-3 py-2" onPress={() => onStartScan(pet.id)}>
                <Text className="text-white">Scan Health</Text>
              </Pressable>
              <Pressable
                className={`rounded-lg border px-3 py-2 ${
                  selectedPetId === pet.id ? 'border-blue-600 bg-blue-50' : 'border-slate-300'
                }`}
                onPress={() => onSelectPet(pet.id)}
              >
                <Text>Select</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
