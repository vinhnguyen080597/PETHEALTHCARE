import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { analysisPossibleFinding, analysisSeverity } from '../utils/analysisDisplay';
import { buildCarePassportStats, metadataNumber } from '../utils/carePassport';
import type { Analysis, CoreCareRecord, CoreCareSummary, Pet, Severity } from '../types';

const PRIMARY_BLUE = '#1E6FE8';
const HERO_BLUE = '#1557C0';

type PetProfileScreenProps = {
  pet: Pet;
  history: Analysis[];
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onScanHealth: () => void;
  onSelectEntry: (entry: Analysis) => void;
  onOpenBreedRecognition?: () => void;
  onOpenCoreCare?: () => void;
  onOpenVetSummary?: () => void;
  coreCareSummary?: CoreCareSummary | null;
  coreCareRecords?: CoreCareRecord[];
};

function severityBadgeClass(severity: Severity) {
  if (severity === 'high') return 'bg-red-50 text-red-700';
  if (severity === 'medium') return 'bg-amber-50 text-amber-800';
  return 'bg-emerald-50 text-emerald-800';
}

function severityColor(severity: Severity) {
  if (severity === 'high') return '#dc2626';
  if (severity === 'medium') return '#d97706';
  return '#059669';
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

function ProfileChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
      <Ionicons name={icon} size={13} color={PRIMARY_BLUE} />
      <Text className="text-xs font-semibold text-slate-700">
        {label}: {value}
      </Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-slate-50 px-3 py-3">
      <Text className="text-xs font-semibold text-slate-500" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-1 text-base font-extrabold text-slate-900" numberOfLines={1}>
        {String(value)}
      </Text>
    </View>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-base font-extrabold text-slate-900">{title}</Text>
      {hint ? <Text className="mt-1 text-sm leading-5 text-slate-500">{hint}</Text> : null}
    </View>
  );
}

export function PetProfileScreen({
  pet,
  history,
  refreshing,
  onRefresh,
  onBack,
  onEdit,
  onDelete,
  onScanHealth,
  onSelectEntry,
  coreCareSummary,
  coreCareRecords = [],
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
  const passport = buildCarePassportStats(coreCareRecords, history);
  const speciesLabel = formatSpecies(pet, t('home.petFallback'));
  const careSummary = coreCareSummary ?? {
    diary: 0,
    vet_visit: 0,
    document: 0,
    reminder: 0,
    vaccine: 0,
    weight: 0,
    pendingReminders: 0,
    overdueReminders: 0,
  };

  return (
    <View testID="pet-profile-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <View className="w-14">
          <Pressable
            testID="pet-profile-back-button"
            accessibilityRole="button"
            accessibilityLabel={t('profile.backA11y')}
            className="rounded-lg p-2 active:bg-gray-100"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('profile.title')}</Text>
        <View className="w-14 items-end">
          <Pressable
            testID="pet-profile-edit-button"
            accessibilityRole="button"
            accessibilityLabel={t('profile.editA11y', { name: pet.name })}
            className="rounded-lg px-2 py-2 active:bg-gray-100"
            onPress={onEdit}
          >
            <Text className="text-sm font-semibold" style={{ color: PRIMARY_BLUE }}>
              {t('profile.edit')}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_BLUE} />
        }
      >
        <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <View className="h-64" style={{ backgroundColor: HERO_BLUE }}>
            {pet.avatar_url ? (
              <Image source={{ uri: pet.avatar_url }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-blue-600">
                <Ionicons name="paw" size={56} color="#ffffff" />
              </View>
            )}
          </View>
          <View className="p-5">
            <Text className="text-3xl font-extrabold text-slate-950" numberOfLines={1}>
              {pet.name}
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-500" numberOfLines={1}>
              {breed || speciesLabel}
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              <ProfileChip icon="paw-outline" label={t('profile.species')} value={speciesLabel} />
              {breed ? <ProfileChip icon="ribbon-outline" label={t('profile.breed')} value={breed} /> : null}
              <ProfileChip icon="calendar-outline" label={t('profile.age')} value={ageLabel} />
              <ProfileChip icon="male-female-outline" label={t('profile.gender')} value={genderLabel} />
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <SectionHeader title={t('profile.careOverview')} hint={t('profile.careOverviewHint', { name: pet.name })} />
          <View className="rounded-2xl bg-blue-50 p-4">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons name="alarm-outline" size={20} color={PRIMARY_BLUE} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-bold uppercase text-blue-700">{t('coreCare.nextSchedule')}</Text>
                {passport.nextReminder?.due_at ? (
                  <Text className="mt-1 text-sm font-semibold leading-5 text-slate-900">
                    {t('coreCare.nextReminderLine', {
                      title: passport.nextReminder.title,
                      date: formatLocaleDateTime(passport.nextReminder.due_at, i18n.language),
                    })}
                  </Text>
                ) : (
                  <Text className="mt-1 text-sm leading-5 text-slate-600">{t('coreCare.noNextReminder')}</Text>
                )}
              </View>
            </View>
          </View>

          <View className="mt-3 flex-row gap-3">
            <MiniStat
              label={t('coreCare.latestWeight')}
              value={
                passport.latestWeight
                  ? t('coreCare.weightKgValue', { value: metadataNumber(passport.latestWeight, 'weightKg') ?? '-' })
                  : t('coreCare.notLogged')
              }
            />
            <MiniStat label={t('coreCare.latestVaccine')} value={passport.latestVaccine?.title ?? t('coreCare.notLogged')} />
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {[
              ['diary', careSummary.diary],
              ['reminders', careSummary.pendingReminders],
              ['vaccines', careSummary.vaccine ?? 0],
              ['documents', careSummary.document],
            ].map(([key, value]) => (
              <View key={String(key)} className="rounded-full border border-gray-200 bg-white px-3 py-2">
                <Text className="text-xs font-bold text-slate-700">
                  {t(`coreCare.stats.${key}`)} · {String(value)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-6">
          <View className="mb-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 text-base font-extrabold text-slate-900">
                {t('profile.healthSection')}
              </Text>
              {passport.overdueReminders.length > 0 ? (
                <Text className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  {t('profile.overdueCare', { count: passport.overdueReminders.length })}
                </Text>
              ) : (
                <Text className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {t('profile.onTrack')}
                </Text>
              )}
            </View>
            <Text className="mt-1 text-sm leading-5 text-slate-500">{t('profile.healthHint', { name: pet.name })}</Text>
          </View>

          {history.length === 0 ? (
            <View className="items-center rounded-3xl border border-gray-200 bg-white px-5 py-9">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <Ionicons name="pulse-outline" size={26} color={PRIMARY_BLUE} />
              </View>
              <Text className="text-center text-base font-bold text-slate-800">{t('profile.noHealthScans')}</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{t('profile.noHealthScansHint')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.scanHealthA11y', { name: pet.name })}
                className="mt-4 rounded-full bg-blue-50 px-4 py-2 active:bg-blue-100"
                onPress={onScanHealth}
              >
                <Text className="text-sm font-bold text-blue-700">{t('profile.scanHealth')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {history.map((item) => {
                const title = analysisPossibleFinding(item, t('results.safeFallbackFinding'));
                const severity = analysisSeverity(item);
                return (
                  <Pressable
                    testID={`pet-profile-history-entry-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.openHealthCheckA11y', { title })}
                    key={item.id}
                    className="flex-row gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50"
                    onPress={() => onSelectEntry(item)}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-50">
                      <Ionicons name={severityIconName(severity)} size={21} color={severityColor(severity)} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className={`self-start rounded-full px-2 py-1 text-xs font-bold capitalize ${severityBadgeClass(severity)}`}>
                          {t(`severity.${severity}`)}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          {formatLocaleDateTime(item.created_at, i18n.language)}
                        </Text>
                      </View>
                      <Text className="mt-2 font-bold leading-5 text-slate-900" numberOfLines={2}>
                        {title}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        {t('common.confidence', { pct: (item.confidence * 100).toFixed(0) })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {onDelete ? (
          <View className="mt-6 rounded-3xl border border-red-100 bg-white p-4">
            <Text className="text-base font-extrabold text-slate-900">{t('profile.dangerZone')}</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">{t('profile.deleteHint', { name: pet.name })}</Text>
            <Pressable
              testID="pet-profile-delete-button"
              accessibilityRole="button"
              accessibilityLabel={t('profile.deleteA11y', { name: pet.name })}
              className="mt-3 self-start flex-row items-center gap-2 rounded-full bg-red-50 px-4 py-2 active:bg-red-100"
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
              <Text className="text-sm font-bold text-red-600">{t('addPet.removePet')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
