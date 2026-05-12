import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../i18n/localeDate';
import type { Analysis, Pet, Severity } from '../types';

const PRIMARY_BLUE = '#1E6FE8';

type PetProfileScreenProps = {
  pet: Pet;
  history: Analysis[];
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onEdit: () => void;
  onScanHealth: () => void;
  onSelectEntry: (entry: Analysis) => void;
  onOpenBreedRecognition?: () => void;
};

function severityBadgeClass(severity: Severity) {
  if (severity === 'high') return 'bg-red-50 text-red-700';
  if (severity === 'medium') return 'bg-amber-50 text-amber-800';
  return 'bg-emerald-50 text-emerald-800';
}

function severityIconName(severity: Severity) {
  if (severity === 'high') return 'warning-outline' as const;
  if (severity === 'medium') return 'alert-circle-outline' as const;
  return 'checkmark-circle-outline' as const;
}

function formatSpecies(pet: Pet, petFallback: string): string {
  if (!pet.species?.trim()) return petFallback;
  const s = pet.species.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function PetProfileScreen({
  pet,
  history,
  refreshing,
  onRefresh,
  onBack,
  onEdit,
  onScanHealth,
  onSelectEntry,
  onOpenBreedRecognition,
}: PetProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const breed = pet.breed?.trim();
  const ageLabel =
    pet.age != null
      ? pet.age === 1
        ? t('home.yearOld', { count: pet.age })
        : t('home.yearsOld', { count: pet.age })
      : t('profile.ageNotSet');
  const genderLabel =
    pet.gender === 'female' || pet.gender === 'male'
      ? t(`gender.${pet.gender}`)
      : t('profile.dashGender');

  return (
    <View className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <View className="w-14">
          <Pressable className="rounded-lg p-2 active:bg-gray-100" onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('profile.title')}</Text>
        <View className="w-14 items-end">
          <Pressable className="rounded-lg px-2 py-2 active:bg-gray-100" onPress={onEdit}>
            <Text className="text-sm font-semibold" style={{ color: PRIMARY_BLUE }}>
              {t('profile.edit')}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_BLUE} />
        }
      >
        <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <View className="items-center">
            <View
              className="mb-4 h-24 w-24 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {pet.avatar_url ? (
                <Image source={{ uri: pet.avatar_url }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={44} color="#ffffff" />
              )}
            </View>
            <Text className="text-xl font-bold text-slate-900">{pet.name}</Text>
            <Text className="mt-1 text-sm text-slate-500">{breed || formatSpecies(pet, t('home.petFallback'))}</Text>
          </View>

          <View className="mt-6 gap-3 border-t border-gray-100 pt-5">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">{t('profile.species')}</Text>
              <Text className="text-sm font-medium text-slate-900">{formatSpecies(pet, t('home.petFallback'))}</Text>
            </View>
            {breed ? (
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">{t('profile.breed')}</Text>
                <Text className="text-sm font-medium text-slate-900">{breed}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">{t('profile.age')}</Text>
              <Text className="text-sm font-medium text-slate-900">{ageLabel}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">{t('profile.gender')}</Text>
              <Text className="text-sm font-medium text-slate-900">{genderLabel}</Text>
            </View>
          </View>

          <Pressable
            className="mt-6 flex-row items-center justify-center gap-2 rounded-xl py-3.5 active:opacity-90"
            style={{ backgroundColor: PRIMARY_BLUE }}
            onPress={onScanHealth}
          >
            <Ionicons name="camera" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">{t('profile.scanHealth')}</Text>
          </Pressable>
          {String(pet.species).toLowerCase().trim() === 'cat' && onOpenBreedRecognition ? (
            <Pressable
              className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-3 active:bg-slate-50"
              onPress={onOpenBreedRecognition}
            >
              <Ionicons name="sparkles-outline" size={18} color={PRIMARY_BLUE} />
              <Text className="text-sm font-semibold text-slate-800">{t('breedRecognition.profileLink')}</Text>
            </Pressable>
          ) : null}
        </View>

        <Text className="mb-3 mt-8 text-base font-bold text-slate-900">{t('profile.healthSection')}</Text>
        <Text className="mb-3 text-sm text-slate-500">{t('profile.healthHint', { name: pet.name })}</Text>

        {history.length === 0 ? (
          <View className="rounded-2xl border border-gray-200 bg-white py-10">
            <Text className="text-center text-slate-600">{t('profile.noHealthScans')}</Text>
            <Text className="mt-1 px-6 text-center text-sm text-slate-400">{t('profile.noHealthScansHint')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {history.map((item) => (
              <Pressable
                key={item.id}
                className="flex-row gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
                onPress={() => onSelectEntry(item)}
              >
                <View className={`self-start rounded-full px-2 py-1 ${severityBadgeClass(item.severity)}`}>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name={severityIconName(item.severity)} size={14} />
                    <Text className="text-xs font-semibold capitalize">{t(`severity.${item.severity}`)}</Text>
                  </View>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-slate-900" numberOfLines={2}>
                    {item.diagnosis}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500">
                    {t('common.confidence', { pct: (item.confidence * 100).toFixed(0) })} ·{' '}
                    {formatLocaleDateTime(item.created_at, i18n.language)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
