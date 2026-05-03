import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Pet } from '../types';

const PRIMARY = '#1E6FE8';
const INFO_BG = '#E8F1FE';
const INFO_TEXT = '#1A56B8';

type YesNo = 'yes' | 'no';

type HealthCheckScreenProps = {
  pet: Pet;
  photoUris: string[];
  videoUri: string | null;
  weightKg: string;
  vaccinated: YesNo;
  vaccineType: string;
  neutered: YesNo;
  medicalHistory: string;
  symptomDescription: string;
  onBack: () => void;
  onAddPhotos: () => void;
  onRemovePhoto: (index: number) => void;
  onPickVideo: () => void;
  onClearVideo: () => void;
  onChangeWeight: (value: string) => void;
  onChangeVaccinated: (value: YesNo) => void;
  onChangeVaccineType: (value: string) => void;
  onChangeNeutered: (value: YesNo) => void;
  onChangeMedicalHistory: (value: string) => void;
  onChangeSymptomDescription: (value: string) => void;
  onStartAnalysis: () => void;
};

function speciesLabel(species: string): string {
  if (!species) return 'Pet';
  return species.charAt(0).toUpperCase() + species.slice(1).toLowerCase();
}

function RadioRow({
  label,
  selected,
  value,
  onSelect,
}: {
  label: string;
  selected: YesNo;
  value: YesNo;
  onSelect: (v: YesNo) => void;
}) {
  const active = selected === value;
  return (
    <Pressable
      className="mr-6 flex-row items-center gap-2 py-1 active:opacity-80"
      onPress={() => onSelect(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: active ? PRIMARY : '#cbd5e1' }}
      >
        {active ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIMARY }} /> : null}
      </View>
      <Text className="text-base text-slate-800">{label}</Text>
    </Pressable>
  );
}

/** Health check intake — `figma/UI/HealthCheck1.png` + `HealthCheck2.png`. */
export function HealthCheckScreen({
  pet,
  photoUris,
  videoUri,
  weightKg,
  vaccinated,
  vaccineType,
  neutered,
  medicalHistory,
  symptomDescription,
  onBack,
  onAddPhotos,
  onRemovePhoto,
  onPickVideo,
  onClearVideo,
  onChangeWeight,
  onChangeVaccinated,
  onChangeVaccineType,
  onChangeNeutered,
  onChangeMedicalHistory,
  onChangeSymptomDescription,
  onStartAnalysis,
}: HealthCheckScreenProps) {
  const subtitle = [speciesLabel(pet.species), pet.breed?.trim() || null].filter(Boolean).join(' • ');
  const canStart = photoUris.length > 0;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-gray-200 px-2 py-3">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-gray-100"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
            Health Check for {pet.name}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        <View className="mb-5 rounded-xl px-4 py-3" style={{ backgroundColor: INFO_BG }}>
          <Text className="text-sm leading-5" style={{ color: INFO_TEXT }}>
            Provide clear photos to help Catties diagnose your pet as accurately as possible like Face, Ear, Eye,
            Body... Let’s get started!
          </Text>
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">
          Photos <Text className="text-red-500">*</Text>
        </Text>
        <Pressable
          onPress={onAddPhotos}
          className="mb-6 min-h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-6 active:bg-gray-100"
        >
          {photoUris.length === 0 ? (
            <>
              <Ionicons name="images-outline" size={40} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">Upload Photos</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">Up to 6 images per check</Text>
            </>
          ) : (
            <View className="w-full">
              <Text className="mb-3 text-center text-sm font-medium text-slate-600">
                {photoUris.length} photo{photoUris.length !== 1 ? 's' : ''} — tap area to add more
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {photoUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} className="relative">
                    <Image source={{ uri }} className="h-20 w-20 rounded-lg" resizeMode="cover" />
                    <Pressable
                      className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-slate-900/80"
                      onPress={() => onRemovePhoto(index)}
                      hitSlop={8}
                      accessibilityLabel="Remove photo"
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Pressable>

        <Text className="mb-2 text-base font-bold text-slate-900">Video (Optional)</Text>
        <View className="mb-6 min-h-[100px] overflow-hidden rounded-xl border border-gray-300 bg-white px-4 py-5">
          {videoUri ? (
            <View className="items-center">
              <Ionicons name="videocam" size={32} color={PRIMARY} />
              <Text className="mt-2 text-center text-sm font-medium text-slate-800">Video selected</Text>
              <View className="mt-3 flex-row gap-4">
                <Pressable onPress={onPickVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
                    Change video
                  </Text>
                </Pressable>
                <Pressable onPress={onClearVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold text-slate-500">Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={onPickVideo}
              className="min-h-[88px] items-center justify-center active:bg-gray-50"
            >
              <Ionicons name="videocam-outline" size={36} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">Upload Video</Text>
            </Pressable>
          )}
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">Weight (kg)</Text>
        <TextInput
          className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder="Enter weight in kg"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={onChangeWeight}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">Vaccination Status</Text>
        <View className="mb-3 flex-row">
          <RadioRow label="Yes" selected={vaccinated} value="yes" onSelect={onChangeVaccinated} />
          <RadioRow label="No" selected={vaccinated} value="no" onSelect={onChangeVaccinated} />
        </View>
        {vaccinated === 'yes' ? (
          <TextInput
            className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder="Enter vaccine type"
            placeholderTextColor="#9ca3af"
            value={vaccineType}
            onChangeText={onChangeVaccineType}
          />
        ) : (
          <View className="mb-6" />
        )}

        <Text className="mb-2 text-base font-bold text-slate-900">Neutering/Spaying Status</Text>
        <View className="mb-6 flex-row">
          <RadioRow label="Yes" selected={neutered} value="yes" onSelect={onChangeNeutered} />
          <RadioRow label="No" selected={neutered} value="no" onSelect={onChangeNeutered} />
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">Medical History (if applicable)</Text>
        <TextInput
          className="mb-6 min-h-[100px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder="e.g., known drug allergies or previous conditions like skin fungus."
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          value={medicalHistory}
          onChangeText={onChangeMedicalHistory}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">Symptom Description</Text>
        <TextInput
          className="mb-2 min-h-[120px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={"Describe your pet's condition further (e.g., loss of appetite, lethargy, frequent scratching...)"}
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          value={symptomDescription}
          onChangeText={onChangeSymptomDescription}
        />

        <Pressable
          className={`mt-4 rounded-xl py-4 ${canStart ? 'active:opacity-90' : 'opacity-50'}`}
          style={{ backgroundColor: canStart ? PRIMARY : '#94a3b8' }}
          onPress={onStartAnalysis}
          disabled={!canStart}
        >
          <Text className="text-center text-base font-bold text-white">Start Analysis</Text>
        </Pressable>
        {!canStart ? (
          <Text className="mt-2 text-center text-sm text-red-500">* Please upload at least one photo</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
