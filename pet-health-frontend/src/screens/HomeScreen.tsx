import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { Pet } from '../types';

const PRIMARY_BLUE = '#1E6FE8';

type HomeScreenProps = {
  pets: Pet[];
  refreshing: boolean;
  onRefresh: () => void;
  onAddPet: () => void;
  onStartScan: (petId: string) => void;
  onViewProfile: (petId: string) => void;
};

function formatPetSubtitle(pet: Pet): string {
  const breed = pet.breed?.trim();
  const speciesLabel = pet.species
    ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()
    : 'Pet';
  const breedPart = breed || speciesLabel;
  const agePart =
    pet.age != null ? `${pet.age} ${pet.age === 1 ? 'year' : 'years'} old` : 'age unknown';
  return `${breedPart} • ${agePart}`;
}

/** Home list — aligned with `figma/UI/Home.PNG`: My Pets header, cards with Scan Health + View Profile only. */
export function HomeScreen({
  pets,
  refreshing,
  onRefresh,
  onAddPet,
  onStartScan,
  onViewProfile,
}: HomeScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-[#F2F4F8] px-5 pb-6 pt-5"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_BLUE} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-900">My Pets</Text>
        <Pressable
          className="flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-90"
          style={{ backgroundColor: PRIMARY_BLUE }}
          onPress={onAddPet}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">Add Pet</Text>
        </Pressable>
      </View>

      {pets.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white py-14">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Ionicons name="paw-outline" size={36} color={PRIMARY_BLUE} />
          </View>
          <Text className="mb-1 text-center text-base font-medium text-slate-800">No pets yet</Text>
          <Text className="mb-6 max-w-xs px-4 text-center text-sm text-slate-500">
            Add a pet to start tracking health scans.
          </Text>
          <Pressable
            className="flex-row items-center gap-2 rounded-full px-6 py-3 active:opacity-90"
            style={{ backgroundColor: PRIMARY_BLUE }}
            onPress={onAddPet}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">Add Your First Pet</Text>
          </Pressable>
          <Text className="mt-4 text-center text-xs text-slate-400">Pull down to refresh</Text>
        </View>
      ) : (
        <View className="gap-4">
          {pets.map((pet) => (
            <View
              key={pet.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-center gap-4">
                <View
                  className="h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  {pet.avatar_url ? (
                    <Image source={{ uri: pet.avatar_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Ionicons name="person" size={36} color="#ffffff" />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-lg font-bold text-slate-900">{pet.name}</Text>
                  <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={2}>
                    {formatPetSubtitle(pet)}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                  onPress={() => onStartScan(pet.id)}
                >
                  <Ionicons name="camera" size={18} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Scan Health</Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white py-3.5 active:bg-slate-50"
                  onPress={() => onViewProfile(pet.id)}
                >
                  <Text className="text-sm font-semibold text-slate-800">View Profile</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
