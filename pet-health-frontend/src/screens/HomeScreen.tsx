import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Pet } from '../types';
import { formatPetAgeForDisplay } from '../utils/petAge';

const PRIMARY_BLUE = '#1E6FE8';

type HomeScreenProps = {
  pets: Pet[];
  refreshing: boolean;
  onRefresh: () => void;
  onAddPet: () => void;
  onViewProfile: (petId: string) => void;
  onOpenCareServices: (petId: string) => void;
};

function formatPetSubtitle(pet: Pet, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const breed = pet.breed?.trim();
  const speciesLabel = pet.species
    ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1).toLowerCase()
    : t('home.petFallback');
  const breedPart = breed || speciesLabel;
  const agePart = formatPetAgeForDisplay(pet, t);
  return `${breedPart} • ${agePart}`;
}

/** Home list — aligned with `figma/UI/Home.PNG`: My Pets header, cards with Health Check + View Profile only. */
export function HomeScreen({
  pets,
  refreshing,
  onRefresh,
  onAddPet,
  onViewProfile,
  onOpenCareServices,
}: HomeScreenProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      testID="home-screen"
      className="flex-1 bg-[#F2F4F8]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_BLUE} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-900">{t('home.title')}</Text>
        <Pressable
          testID="home-add-pet-button"
          accessibilityRole="button"
          accessibilityLabel="Add pet"
          className="flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-90"
          style={{ backgroundColor: PRIMARY_BLUE }}
          onPress={onAddPet}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">{t('home.addPet')}</Text>
        </Pressable>
      </View>

      {pets.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white py-14">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Ionicons name="paw-outline" size={36} color={PRIMARY_BLUE} />
          </View>
          <Text className="mb-1 text-center text-base font-medium text-slate-800">{t('home.noPetsTitle')}</Text>
          <Text className="mb-6 max-w-xs px-4 text-center text-sm text-slate-500">{t('home.noPetsBody')}</Text>
          <Pressable
            testID="home-add-first-pet-button"
            accessibilityRole="button"
            accessibilityLabel="Add first pet"
            className="flex-row items-center gap-2 rounded-full px-6 py-3 active:opacity-90"
            style={{ backgroundColor: PRIMARY_BLUE }}
            onPress={onAddPet}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="font-semibold text-white">{t('home.addFirstPet')}</Text>
          </Pressable>
          <Text className="mt-4 text-center text-xs text-slate-400">{t('home.pullToRefresh')}</Text>
        </View>
      ) : (
        <View className="gap-4">
          {pets.map((pet) => (
            <View
              testID={`home-pet-card-${pet.id}`}
              key={pet.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm"
            >
              <View className="flex-row items-center gap-3.5">
                <View
                  className="h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  {pet.avatar_url ? (
                    <Image source={{ uri: pet.avatar_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <Ionicons name="person" size={32} color="#ffffff" />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[17px] font-bold text-slate-900">{pet.name}</Text>
                  <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={2}>
                    {formatPetSubtitle(pet, t)}
                  </Text>
                </View>
              </View>

              <View className="mt-3.5 flex-row gap-2.5">
                <Pressable
                  testID={`home-view-profile-button-${pet.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View profile for ${pet.name}`}
                  className="min-w-0 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white py-3 active:bg-slate-50"
                  onPress={() => onViewProfile(pet.id)}
                >
                  <Text className="text-[13px] font-semibold text-slate-800">{t('home.viewProfile')}</Text>
                </Pressable>
                <Pressable
                  testID={`home-care-services-button-${pet.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open care services for ${pet.name}`}
                  className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 active:opacity-90"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                  onPress={() => onOpenCareServices(pet.id)}
                >
                  <Ionicons name="sparkles-outline" size={16} color="#ffffff" />
                  <Text className="text-[13px] font-semibold text-white" numberOfLines={1}>{t('home.openCareServices')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
