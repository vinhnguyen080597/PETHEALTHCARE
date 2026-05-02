import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Pet } from '../types';

type HomeScreenProps = {
  pets: Pet[];
  selectedPetId: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onAddPet: () => void;
  onSelectPet: (petId: string) => void;
  onStartScan: (petId: string) => void;
  onEditPet: (petId: string) => void;
  onDeletePet: (pet: Pet) => void;
};

/** Layout aligned with `figma/code/src/app/components/HomeScreen.tsx` (cards, avatar, actions). */
export function HomeScreen({
  pets,
  selectedPetId,
  refreshing,
  onRefresh,
  onAddPet,
  onSelectPet,
  onStartScan,
  onEditPet,
  onDeletePet,
}: HomeScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-slate-50 px-6 py-6"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-slate-900">My Pets</Text>
        <Pressable
          className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 active:bg-blue-700"
          onPress={onAddPet}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="font-medium text-white">Add Pet</Text>
        </Pressable>
      </View>

      {pets.length === 0 ? (
        <View className="items-center py-12">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="person-outline" size={40} color="#9ca3af" />
          </View>
          <Text className="mb-4 text-center text-base text-gray-600">No pets added yet</Text>
          <Pressable
            className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 active:bg-blue-700"
            onPress={onAddPet}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">Add Your First Pet</Text>
          </Pressable>
          <Text className="mt-3 text-center text-xs text-slate-500">Pull down to refresh</Text>
        </View>
      ) : (
        <View className="gap-4">
          {pets.map((pet) => (
            <View key={pet.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <View className="flex-row items-start gap-4">
                <View className="h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500">
                  {pet.avatar_url ? (
                    <Image source={{ uri: pet.avatar_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Ionicons name="person" size={32} color="#ffffff" />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-lg font-semibold text-slate-900">{pet.name}</Text>
                  <Text className="text-sm text-gray-600">
                    {pet.species} • {pet.breed ?? 'Unknown breed'} •{' '}
                    {pet.age != null ? `${pet.age} ${pet.age === 1 ? 'year' : 'years'} old` : 'age unknown'}
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Pressable
                      className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 active:bg-blue-700"
                      onPress={() => onStartScan(pet.id)}
                    >
                      <Ionicons name="camera-outline" size={16} color="#ffffff" />
                      <Text className="text-sm font-medium text-white">Scan Health</Text>
                    </Pressable>
                    <Pressable
                      className="rounded-lg border border-gray-300 px-4 py-2 active:bg-gray-50"
                      onPress={() => onEditPet(pet.id)}
                    >
                      <Text className="text-sm font-medium text-slate-800">Edit</Text>
                    </Pressable>
                    <Pressable
                      className={`rounded-lg border px-4 py-2 ${
                        selectedPetId === pet.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                      }`}
                      onPress={() => onSelectPet(pet.id)}
                    >
                      <Text className="text-sm font-medium text-slate-800">Select</Text>
                    </Pressable>
                    <Pressable
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 active:bg-red-100"
                      onPress={() => onDeletePet(pet)}
                    >
                      <Text className="text-sm font-medium text-red-700">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
