import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  inlineErrorMessage?: string;
  onDismissInlineError?: () => void;
  analysisCooldownSeconds?: number;
  analyzeDisabled?: boolean;
};

function speciesLabel(species: string, petFallback: string): string {
  if (!species) return petFallback;
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
  inlineErrorMessage = '',
  onDismissInlineError,
  analysisCooldownSeconds = 0,
  analyzeDisabled = false,
}: HealthCheckScreenProps) {
  const { t } = useTranslation();
  const subtitle = [speciesLabel(pet.species, t('healthCheck.petFallback')), pet.breed?.trim() || null]
    .filter(Boolean)
    .join(' • ');
  const canStart = photoUris.length > 0 && !analyzeDisabled && analysisCooldownSeconds <= 0;
  const photoCountHint =
    photoUris.length === 1
      ? t('healthCheck.photoCountOne', { count: photoUris.length })
      : t('healthCheck.photoCountMany', { count: photoUris.length });

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
            {t('healthCheck.title', { name: pet.name })}
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
            {t('healthCheck.infoBanner')}
          </Text>
        </View>
        {inlineErrorMessage ? (
          <View className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <View className="flex-row items-start gap-3">
              <Ionicons name="alert-circle-outline" size={20} color="#b45309" style={{ marginTop: 2 }} />
              <View className="min-w-0 flex-1">
                <Text className="text-sm leading-5 text-amber-900">{inlineErrorMessage}</Text>
                {onDismissInlineError ? (
                  <Pressable className="mt-2 self-start rounded-md bg-amber-100 px-3 py-1.5" onPress={onDismissInlineError}>
                    <Text className="text-xs font-semibold text-amber-900">{t('common.ok')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <Text className="mb-2 text-base font-bold text-slate-900">
          {t('healthCheck.photos')} <Text className="text-red-500">{t('healthCheck.required')}</Text>
        </Text>
        <Pressable
          onPress={onAddPhotos}
          className="mb-6 min-h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-6 active:bg-gray-100"
        >
          {photoUris.length === 0 ? (
            <>
              <Ionicons name="images-outline" size={40} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">{t('healthCheck.uploadPhotos')}</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">{t('healthCheck.upTo6')}</Text>
            </>
          ) : (
            <View className="w-full">
              <Text className="mb-3 text-center text-sm font-medium text-slate-600">{photoCountHint}</Text>
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

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.videoOptional')}</Text>
        <View className="mb-6 min-h-[100px] overflow-hidden rounded-xl border border-gray-300 bg-white px-4 py-5">
          {videoUri ? (
            <View className="items-center">
              <Ionicons name="videocam" size={32} color={PRIMARY} />
              <Text className="mt-2 text-center text-sm font-medium text-slate-800">{t('healthCheck.videoSelected')}</Text>
              <View className="mt-3 flex-row gap-4">
                <Pressable onPress={onPickVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
                    {t('healthCheck.changeVideo')}
                  </Text>
                </Pressable>
                <Pressable onPress={onClearVideo} className="active:opacity-80">
                  <Text className="text-sm font-semibold text-slate-500">{t('healthCheck.remove')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={onPickVideo}
              className="min-h-[88px] items-center justify-center active:bg-gray-50"
            >
              <Ionicons name="videocam-outline" size={36} color="#64748b" />
              <Text className="mt-2 text-base font-semibold text-slate-800">{t('healthCheck.uploadVideo')}</Text>
            </Pressable>
          )}
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.weightKg')}</Text>
        <TextInput
          className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.enterWeight')}
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={onChangeWeight}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.vaccination')}</Text>
        <View className="mb-3 flex-row">
          <RadioRow label={t('common.yes')} selected={vaccinated} value="yes" onSelect={onChangeVaccinated} />
          <RadioRow label={t('common.no')} selected={vaccinated} value="no" onSelect={onChangeVaccinated} />
        </View>
        {vaccinated === 'yes' ? (
          <TextInput
            className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
            placeholder={t('healthCheck.enterVaccineType')}
            placeholderTextColor="#9ca3af"
            value={vaccineType}
            onChangeText={onChangeVaccineType}
          />
        ) : (
          <View className="mb-6" />
        )}

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.neutering')}</Text>
        <View className="mb-6 flex-row">
          <RadioRow label={t('common.yes')} selected={neutered} value="yes" onSelect={onChangeNeutered} />
          <RadioRow label={t('common.no')} selected={neutered} value="no" onSelect={onChangeNeutered} />
        </View>

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.medicalHistory')}</Text>
        <TextInput
          className="mb-6 min-h-[100px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.medicalHistoryPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          value={medicalHistory}
          onChangeText={onChangeMedicalHistory}
        />

        <Text className="mb-2 text-base font-bold text-slate-900">{t('healthCheck.symptoms')}</Text>
        <TextInput
          className="mb-2 min-h-[120px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder={t('healthCheck.symptomsPlaceholder')}
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
          <Text className="text-center text-base font-bold text-white">{t('healthCheck.startAnalysis')}</Text>
        </Pressable>
        {!canStart ? (
          <Text className="mt-2 text-center text-sm text-red-500">
            {!photoUris.length
              ? t('healthCheck.photoRequiredError')
              : analysisCooldownSeconds > 0
                ? t('healthCheck.cooldownHint', { seconds: analysisCooldownSeconds })
                : t('healthCheck.analysisBusyHint')}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
