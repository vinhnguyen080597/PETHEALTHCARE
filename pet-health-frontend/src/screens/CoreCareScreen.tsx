import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaiScheduleSavingModal } from '../components/MaiScheduleSavingModal';
import { DewormingIcon } from '../components/DewormingIcon';
import { schedulePrimaryVaccineIdsForSpecies, vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { metadataText } from '../utils/carePassport';
import {
  type AdministeredDewormingDoseInput,
  type AdministeredVaccineDoseInput,
  calculateCoreCareSchedule,
  calculateCoreCareScheduleFromHistory,
  calculateNextVaccinationSchedule,
  type CoreCareNextVaccineRecommendation,
  type CoreCareScheduleRecommendation,
  normalizeManualVaccineId,
} from '../utils/coreCareSchedule';
import { debugCheck, debugLog } from '../utils/debugLog';
import { resolvePetAgeMonths, parseBirthDateIso, formatBirthDateIso, isBirthDateInFuture } from '../utils/petAge';
import {
  canMarkScheduleAdministered,
  resolveScheduleDueStatus,
  scheduleDueStatusTextClass,
  type ScheduleDueStatus,
} from '../utils/scheduleDueStatus';
import type {
  AiCreditAccount,
  Analysis,
  CoreCareRecord,
  CoreCareRecordType,
  CoreCareSummary,
  CreateCoreCareRecordPayload,
  Pet,
} from '../types';

const PRIMARY = '#1E6FE8';
const CORE_CARE_INTRO_GUIDE_STORAGE_KEY_PREFIX = 'pet-health-care:core-care-intro-guide-seen:v1';
const UPCOMING_SCHEDULE_PREVIEW_LIMIT = 5;

type VaccinatedAnswer = 'yes' | 'no';
type ManualEntryType = 'vaccine' | 'reminder';
type CareEntryKind = 'vaccine' | 'deworming';
type CareEntryDraft = {
  id: string;
  careKind: CareEntryKind;
  vaccineId: string;
  administeredAt: Date | null;
};

type CareEntryDraftErrors = Record<string, { careKind?: string; vaccineId?: string; administeredAt?: string }>;
type GeneratedScheduleErrors = {
  birthDate?: string;
  desiredVaccineId?: string;
};

type YesSchedulePreview =
  | { kind: 'cat'; recommendations: CoreCareScheduleRecommendation[] }
  | { kind: 'dog'; recommendations: CoreCareNextVaccineRecommendation[] };

type CoreCareScreenProps = {
  pet: Pet;
  records: CoreCareRecord[];
  history: Analysis[];
  summary: CoreCareSummary | null;
  refreshing: boolean;
  aiCredits: AiCreditAccount | null;
  creditLedger: Array<Record<string, unknown>>;
  onBack: () => void;
  onOpenInfo: () => void;
  onRefresh: () => void;
  onCreateRecord: (payload: CreateCoreCareRecordPayload) => Promise<void>;
  onMarkReminderDone: (record: CoreCareRecord) => Promise<void>;
  onClaimRewardedAd: () => Promise<void>;
};

function typeIcon(type: CoreCareRecordType) {
  if (type === 'reminder') return 'alarm-outline' as const;
  if (type === 'vaccine') return 'shield-checkmark-outline' as const;
  return 'document-text-outline' as const;
}

function generatedCareKind(record: CoreCareRecord): 'vaccine' | 'deworming' | null {
  const kind = record.metadata?.generatedCoreCareKind;
  if (kind === 'vaccine' || kind === 'deworming') return kind;
  return null;
}

function isDewormingCareRecord(record: CoreCareRecord): boolean {
  if (generatedCareKind(record) === 'deworming') return true;
  const family = record.metadata?.generatedCoreCareFamily;
  return family === 'catDeworming' || family === 'dogDeworming';
}

function recordIcon(record: CoreCareRecord) {
  const generatedKind = generatedCareKind(record);
  if (generatedKind === 'vaccine') return 'shield-checkmark-outline' as const;
  if (isDewormingCareRecord(record)) return null;
  return typeIcon(record.type);
}

function CareScheduleIcon({
  record,
  kind,
  size,
  color = PRIMARY,
}: {
  record?: CoreCareRecord;
  kind?: 'vaccine' | 'deworming' | null;
  size: number;
  color?: string;
}) {
  const isDeworming = kind === 'deworming' || Boolean(record && isDewormingCareRecord(record));
  if (isDeworming) return <DewormingIcon size={Math.round(size * 1.25)} color={color} />;

  if (kind === 'vaccine' || (record && generatedCareKind(record) === 'vaccine')) {
    return <Ionicons name="shield-checkmark-outline" size={size} color={color} />;
  }

  const iconName = record ? recordIcon(record) : 'alarm-outline';
  return <Ionicons name={iconName ?? 'alarm-outline'} size={size} color={color} />;
}

function scheduleTimestamp(record: CoreCareRecord): number {
  const due = record.due_at ? new Date(record.due_at).getTime() : NaN;
  if (Number.isFinite(due)) return due;
  const occurred = new Date(record.occurred_at || record.created_at).getTime();
  return Number.isFinite(occurred) ? occurred : 0;
}

function occurredTimestamp(record: CoreCareRecord): number {
  const occurred = new Date(record.occurred_at || record.created_at).getTime();
  return Number.isFinite(occurred) ? occurred : 0;
}

function isPendingScheduleRecord(record: CoreCareRecord): boolean {
  if (!record.due_at || record.status === 'done') return false;
  if (record.type === 'vaccine') return false;
  return true;
}

function isFulfilledGeneratedReminder(record: CoreCareRecord): boolean {
  if (record.type !== 'reminder' || record.status !== 'done') return false;
  return Boolean(record.metadata?.generatedCoreCareScheduleId || record.metadata?.generatedCoreCareVaccineScheduleId);
}

function scheduleDueStatusLabel(t: (key: string) => string, status: ScheduleDueStatus): string {
  if (status === 'upcoming') return t('coreCare.scheduleDueStatus.upcoming');
  if (status === 'due_today') return t('coreCare.scheduleDueStatus.dueToday');
  return t('coreCare.scheduleDueStatus.overdue');
}

function ScheduleDueStatusBadge({
  dueAt,
  today,
  t,
}: {
  dueAt?: string | null;
  today: Date;
  t: (key: string) => string;
}) {
  if (!dueAt) return null;
  const status = resolveScheduleDueStatus(dueAt, today);
  if (!status) return null;
  return <Text className={`mt-1 ${scheduleDueStatusTextClass(status)}`}>{scheduleDueStatusLabel(t, status)}</Text>;
}

function recommendationRecordExists(records: CoreCareRecord[], recommendation: CoreCareScheduleRecommendation): boolean {
  return records.some((record) => {
    const generatedId = record.metadata?.generatedCoreCareScheduleId;
    if (generatedId === recommendation.id) return true;

    const family = record.metadata?.generatedCoreCareFamily;
    const doseNumber = record.metadata?.generatedCoreCareDoseNumber;
    const dueDate = record.due_at?.slice(0, 10);
    return family === recommendation.family && doseNumber === recommendation.doseNumber && dueDate === recommendation.dueDate;
  });
}

function nextVaccineRecommendationRecordExists(records: CoreCareRecord[], recommendation: CoreCareNextVaccineRecommendation): boolean {
  return records.some((record) => {
    const generatedId = record.metadata?.generatedCoreCareVaccineScheduleId;
    if (generatedId === recommendation.id) return true;

    const vaccineId = record.metadata?.vaccineId;
    const dueDate = record.due_at?.slice(0, 10);
    return vaccineId === recommendation.vaccineId && dueDate === recommendation.dueDate;
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampPerformedDate(date: Date, minimumDate?: Date, maximumDate?: Date): Date {
  let next = startOfDay(date);
  if (minimumDate) {
    const min = startOfDay(minimumDate);
    if (next.getTime() < min.getTime()) next = min;
  }
  if (maximumDate) {
    const max = startOfDay(maximumDate);
    if (next.getTime() > max.getTime()) next = max;
  }
  return next;
}

function formatDateValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateOnly(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function recordScheduleDateLabel(record: CoreCareRecord, language: string, preferDueDate: boolean): string | null {
  if (preferDueDate && record.due_at) return formatDateOnly(record.due_at, language);
  const performedAt =
    metadataText(record, 'administeredAt') || record.occurred_at || record.due_at || record.created_at;
  if (!performedAt) return null;
  return formatDateOnly(performedAt, language);
}

function historyStatusLabel(
  record: CoreCareRecord,
  t: (key: string) => string,
): string {
  const generatedKind = generatedCareKind(record);
  if (generatedKind === 'deworming' || isDewormingCareRecord(record)) return t('coreCare.historyDewormed');
  if (record.type === 'vaccine' || generatedKind === 'vaccine') return t('coreCare.markAdministered');
  return t('coreCare.historyCompleted');
}

function sortByDueDate<T extends { dueDate: string; id?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dueDiff !== 0) return dueDiff;
    return (a.id ?? '').localeCompare(b.id ?? '');
  });
}

function scheduleItemsFingerprint(items: Array<{ id: string; dueDate: string }>): string {
  return sortByDueDate(items)
    .map((item) => `${item.id}|${item.dueDate}`)
    .join('\n');
}

function doseDraftsFingerprint(drafts: CareEntryDraft[]): string {
  return drafts
    .filter((draft) => draft.administeredAt && (draft.careKind === 'deworming' || draft.vaccineId))
    .map((draft) => `${draft.careKind}|${draft.vaccineId}|${formatDateValue(draft.administeredAt!)}`)
    .sort()
    .join('\n');
}

function mergeAdministeredVaccineDoses(
  ...sources: AdministeredVaccineDoseInput[][]
): AdministeredVaccineDoseInput[] {
  const seen = new Set<string>();
  const merged: AdministeredVaccineDoseInput[] = [];
  for (const doses of sources) {
    for (const dose of doses) {
      const key = `${dose.vaccineId}|${formatDateValue(startOfDay(dose.administeredAt))}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(dose);
    }
  }
  return merged;
}

function mergeAdministeredDewormingDoses(
  ...sources: AdministeredDewormingDoseInput[][]
): AdministeredDewormingDoseInput[] {
  const seen = new Set<string>();
  const merged: AdministeredDewormingDoseInput[] = [];
  for (const doses of sources) {
    for (const dose of doses) {
      const key = formatDateValue(startOfDay(dose.administeredAt));
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(dose);
    }
  }
  return merged;
}

type EditScheduleBaseline = {
  scheduleFingerprint: string;
  doseDraftsFingerprint: string;
  desiredVaccineId: string | null;
};

function isFelvVaccine(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'cat_felv' || normalized.includes('felv') || normalized.includes('bạch cầu');
}

function coreCareIntroGuideStorageKey(userId: string): string {
  return `${CORE_CARE_INTRO_GUIDE_STORAGE_KEY_PREFIX}:${userId}`;
}

function makeCareEntryDraft(): CareEntryDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    careKind: 'vaccine',
    vaccineId: '',
    administeredAt: null,
  };
}

function isHistoricalDewormingRecord(record: CoreCareRecord): boolean {
  if (record.metadata?.generatedCoreCareKind !== 'deworming') return false;
  if (record.metadata?.isHistoricalDeworming) return true;
  return Boolean(record.occurred_at) && record.status !== 'pending';
}

function hasRecordedCareHistory(records: CoreCareRecord[]): boolean {
  return records.some((record) => record.type === 'vaccine' || isHistoricalDewormingRecord(record));
}

function isGeneratedUpcomingScheduleRecord(record: CoreCareRecord): boolean {
  return Boolean(record.metadata?.generatedCoreCareScheduleId || record.metadata?.generatedCoreCareVaccineScheduleId);
}

function recordToCatScheduleRecommendation(record: CoreCareRecord): CoreCareScheduleRecommendation | null {
  const id = metadataText(record, 'generatedCoreCareScheduleId');
  const family = metadataText(record, 'generatedCoreCareFamily');
  const kind = metadataText(record, 'generatedCoreCareKind');
  const doseNumber = record.metadata?.generatedCoreCareDoseNumber;
  if (!id || !record.due_at || !family || !kind || typeof doseNumber !== 'number') return null;

  return {
    id,
    kind: kind === 'deworming' ? 'deworming' : 'vaccine',
    family: family as CoreCareScheduleRecommendation['family'],
    doseNumber,
    dueDate: record.due_at.slice(0, 10),
    targetDate: metadataText(record, 'targetDate') || record.due_at.slice(0, 10),
    sourceLabel: metadataText(record, 'sourceLabel'),
    sourceUrl: metadataText(record, 'sourceUrl'),
    isCatchUp: Boolean(record.metadata?.isCatchUp),
  };
}

function recordToDogScheduleRecommendation(record: CoreCareRecord): CoreCareNextVaccineRecommendation | null {
  const id = metadataText(record, 'generatedCoreCareVaccineScheduleId');
  const vaccineId = metadataText(record, 'vaccineId');
  const doseNumber = record.metadata?.generatedCoreCareDoseNumber;
  if (!id || !record.due_at || !vaccineId || typeof doseNumber !== 'number') return null;

  return {
    id,
    vaccineId,
    doseNumber,
    dueDate: record.due_at.slice(0, 10),
    targetDate: metadataText(record, 'targetDate') || record.due_at.slice(0, 10),
    administeredAt: metadataText(record, 'administeredAt') || record.occurred_at || record.created_at,
    sourceLabel: metadataText(record, 'sourceLabel'),
    sourceUrl: metadataText(record, 'sourceUrl'),
    isCatchUp: Boolean(record.metadata?.isCatchUp),
    horizonMonths: typeof record.metadata?.horizonMonths === 'number' ? record.metadata.horizonMonths : 12,
    isRestartRequired: Boolean(record.metadata?.isRestartRequired),
  };
}

function inferDesiredVaccineIdFromRecords(
  records: CoreCareRecord[],
  scheduleOptions: Array<{ id: string; label: string }>,
): string | null {
  const generatedUpcoming = records.filter((record) => isPendingScheduleRecord(record) && isGeneratedUpcomingScheduleRecord(record));
  for (const record of generatedUpcoming) {
    const family = metadataText(record, 'generatedCoreCareFamily');
    if (family === 'catFvrcp' || family === 'dogDhpp' || family === 'dogLepto') {
      const matchedOption = scheduleOptions.find((option) => record.title.includes(option.label));
      if (matchedOption) return matchedOption.id;
    }
  }

  for (const record of records) {
    const vaccineId = metadataText(record, 'vaccineId');
    if (vaccineId && scheduleOptions.some((option) => option.id === vaccineId)) return vaccineId;
  }

  return null;
}

function hydrateDoseDraftsFromHistory(records: CoreCareRecord[], petBirthDate: Date | null, today: Date): CareEntryDraft[] {
  const drafts: CareEntryDraft[] = [];

  for (const record of records) {
    if (record.type !== 'vaccine') continue;
    const vaccineId = metadataText(record, 'vaccineId');
    const administeredAtValue = metadataText(record, 'administeredAt') || record.occurred_at || record.created_at;
    const administeredAt = parseBirthDateIso(administeredAtValue.slice(0, 10));
    if (!vaccineId || !administeredAt) continue;
    drafts.push({
      id: `${record.id}-history`,
      careKind: 'vaccine',
      vaccineId,
      administeredAt: clampPerformedDate(administeredAt, petBirthDate ?? undefined, today),
    });
  }

  for (const record of records.filter(isHistoricalDewormingRecord)) {
    const administeredAtValue = metadataText(record, 'administeredAt') || record.occurred_at || record.created_at;
    const administeredAt = parseBirthDateIso(administeredAtValue.slice(0, 10));
    if (!administeredAt) continue;
    drafts.push({
      id: `${record.id}-history`,
      careKind: 'deworming',
      vaccineId: '',
      administeredAt: clampPerformedDate(administeredAt, petBirthDate ?? undefined, today),
    });
  }

  return drafts.length > 0 ? drafts : [makeCareEntryDraft()];
}

function careEntryDraftAlreadyRecorded(draft: CareEntryDraft, records: CoreCareRecord[]): boolean {
  if (!draft.administeredAt) return false;
  const administeredAt = formatDateValue(draft.administeredAt);

  if (draft.careKind === 'vaccine') {
    return records.some((record) => {
      if (record.type !== 'vaccine') return false;
      const vaccineId = metadataText(record, 'vaccineId');
      const recordDate = (metadataText(record, 'administeredAt') || record.occurred_at || record.created_at).slice(0, 10);
      return vaccineId === draft.vaccineId && recordDate === administeredAt;
    });
  }

  return records.some((record) => {
    if (!isHistoricalDewormingRecord(record)) return false;
    const recordDate = (metadataText(record, 'administeredAt') || record.occurred_at || record.created_at).slice(0, 10);
    return recordDate === administeredAt;
  });
}

function DateField({
  label,
  value,
  placeholder,
  error,
  minimumDate,
  maximumDate,
  readOnly = false,
  fullWidth = false,
  testID,
  onChange,
}: {
  label: string;
  value: Date | null;
  placeholder?: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  readOnly?: boolean;
  fullWidth?: boolean;
  testID?: string;
  onChange: (value: Date) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const pickerValue = value ?? maximumDate ?? minimumDate ?? new Date();
  const isoValue = value ? formatBirthDateIso(value) : '';
  const displayValue = value
    ? new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(value)
    : null;

  function commitDate(date: Date) {
    onChange(clampPerformedDate(date, minimumDate, maximumDate));
  }

  function applyIsoValue(nextValue: string) {
    const parsed = parseBirthDateIso(nextValue);
    if (parsed) commitDate(parsed);
  }

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (selectedDate) commitDate(selectedDate);
    if (Platform.OS !== 'ios') setOpen(false);
  }

  if (Platform.OS === 'web' && !readOnly) {
    return (
      <View className={fullWidth ? 'w-full' : 'flex-1'}>
        <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
        <View
          className={`min-h-[48px] flex-row items-center rounded-xl border px-3 py-2 ${
            error ? 'border-red-300' : 'border-gray-200'
          } bg-slate-50`}
        >
          <input
            type="date"
            data-testid={testID}
            value={isoValue}
            min={minimumDate ? formatBirthDateIso(minimumDate) : undefined}
            max={maximumDate ? formatBirthDateIso(maximumDate) : undefined}
            onChange={(event) => applyIsoValue(event.currentTarget.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              fontWeight: 600,
              color: isoValue ? '#0f172a' : '#94a3b8',
              fontFamily: 'inherit',
            }}
          />
        </View>
        {error ? <Text className="mt-1.5 text-xs font-semibold text-red-600">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View className={fullWidth ? 'w-full' : 'flex-1'}>
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: readOnly }}
        disabled={readOnly}
        className={`min-h-[48px] flex-row items-center justify-between rounded-xl border px-3 py-3 ${
          readOnly ? 'border-gray-200 bg-gray-100' : 'border-gray-200 bg-slate-50 active:bg-slate-100'
        } ${error ? 'border-red-300' : ''}`}
        onPress={() => {
          if (!readOnly) setOpen(true);
        }}
      >
        <Text className={`text-sm font-semibold ${displayValue ? 'text-slate-900' : 'text-slate-400'}`}>
          {displayValue ?? placeholder ?? t('coreCare.selectDate')}
        </Text>
        <Ionicons name={readOnly ? 'lock-closed-outline' : 'calendar-outline'} size={18} color="#64748b" />
      </Pressable>
      {!readOnly ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
            <View className="rounded-t-3xl bg-white px-4 pb-8 pt-3">
              <View className="mb-3 self-center rounded-full bg-gray-200 px-10 py-1" />
              <Text className="mb-2 text-center text-base font-bold text-slate-900">{label}</Text>
              <DateTimePicker
                testID={testID ? `${testID}-picker` : undefined}
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  className="mt-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                  onPress={() => {
                    if (!value) commitDate(pickerValue);
                    setOpen(false);
                  }}
                >
                  <Text className="text-center text-sm font-bold text-white">{t('common.done')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
      {error ? <Text className="mt-1.5 text-xs font-semibold text-red-600">{error}</Text> : null}
    </View>
  );
}

function VaccineSelect({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Array<{ id: string; label: string }>;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.id === value)?.label;

  return (
    <View className="flex-1">
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
      <Pressable
        accessibilityRole="button"
        className={`min-h-[48px] flex-row items-center justify-between rounded-xl border bg-slate-50 px-3 py-3 active:bg-slate-100 ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
        onPress={() => setOpen(true)}
      >
        <Text className={`min-w-0 flex-1 text-sm font-semibold ${selectedLabel ? 'text-slate-900' : 'text-slate-400'}`} numberOfLines={1}>
          {selectedLabel ?? t('coreCare.selectVaccine')}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-3">
            <View className="mb-3 self-center rounded-full bg-gray-200 px-10 py-1" />
            <Text className="mb-2 text-center text-base font-bold text-slate-900">{label}</Text>
            {options.map((option) => (
              <Pressable
                key={option.id}
                className="border-b border-gray-100 py-3.5 active:bg-gray-50"
                onPress={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <Text className={`text-center text-base ${option.id === value ? 'font-bold text-blue-700' : 'text-slate-900'}`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
            <Pressable className="mt-2 py-3" onPress={() => setOpen(false)}>
              <Text className="text-center text-base text-blue-600">{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {error ? <Text className="mt-1.5 text-xs font-semibold text-red-600">{error}</Text> : null}
    </View>
  );
}

export function CoreCareScreen({
  pet,
  records,
  refreshing,
  onBack,
  onOpenInfo,
  onRefresh,
  onCreateRecord,
  onMarkReminderDone,
}: CoreCareScreenProps) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [vaccinatedAnswer, setVaccinatedAnswer] = useState<VaccinatedAnswer>('yes');
  const [manualEntryType, setManualEntryType] = useState<ManualEntryType>('vaccine');
  const [doseDrafts, setDoseDrafts] = useState<CareEntryDraft[]>(() => [makeCareEntryDraft()]);
  const [desiredVaccineId, setDesiredVaccineId] = useState<string | null>(null);
  const [vaccineTitle, setVaccineTitle] = useState('');
  const [vaccineClinic, setVaccineClinic] = useState('');
  const [vaccineNextDueDate, setVaccineNextDueDate] = useState<Date>(today);
  const [vaccineNote, setVaccineNote] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date>(today);
  const [reminderNote, setReminderNote] = useState('');
  const [submittingVaccine, setSubmittingVaccine] = useState(false);
  const [submittingVaccines, setSubmittingVaccines] = useState(false);
  const [submittingGeneratedSchedule, setSubmittingGeneratedSchedule] = useState(false);
  const [submittingReminder, setSubmittingReminder] = useState(false);
  const [markingAdministeredRecordId, setMarkingAdministeredRecordId] = useState<string | null>(null);
  const [scheduleSetupDismissed, setScheduleSetupDismissed] = useState(false);
  const [isEditingGeneratedSchedule, setIsEditingGeneratedSchedule] = useState(false);
  const [editScheduleBaseline, setEditScheduleBaseline] = useState<EditScheduleBaseline | null>(null);
  const [showIntroGuide, setShowIntroGuide] = useState(false);
  const [doseDraftErrors, setDoseDraftErrors] = useState<CareEntryDraftErrors>({});
  const [generatedScheduleErrors, setGeneratedScheduleErrors] = useState<GeneratedScheduleErrors>({});
  const [showAllUpcomingSchedules, setShowAllUpcomingSchedules] = useState(false);
  const [showAllGeneratedRecommendations, setShowAllGeneratedRecommendations] = useState(false);
  const [dismissedGeneratedRecommendationIds, setDismissedGeneratedRecommendationIds] = useState<string[]>([]);
  const [previewedGeneratedRecommendations, setPreviewedGeneratedRecommendations] = useState<CoreCareScheduleRecommendation[] | null>(null);
  const [previewedYesSchedule, setPreviewedYesSchedule] = useState<YesSchedulePreview | null>(null);
  const [dismissedYesRecommendationIds, setDismissedYesRecommendationIds] = useState<string[]>([]);
  const [showAllYesRecommendations, setShowAllYesRecommendations] = useState(false);
  const introGuideStorageKey = useMemo(() => coreCareIntroGuideStorageKey(pet.user_id), [pet.user_id]);

  useEffect(() => {
    let mounted = true;
    setShowIntroGuide(false);

    AsyncStorage.getItem(introGuideStorageKey)
      .then((value) => {
        if (mounted && value !== '1') setShowIntroGuide(true);
      })
      .catch(() => {
        if (mounted) setShowIntroGuide(true);
      });

    return () => {
      mounted = false;
    };
  }, [introGuideStorageKey]);

  const vaccineOptions = useMemo(
    () =>
      (vaccineIdsForPetSpecies(pet.species) ?? []).map((id) => ({
        id,
        label: t(`healthCheck.vaccines.${id}.label`),
      })),
    [pet.species, t],
  );

  const schedulePrimaryVaccineOptions = useMemo(
    () =>
      (schedulePrimaryVaccineIdsForSpecies(pet.species) ?? []).map((id) => ({
        id,
        label: t(`coreCare.scheduleVaccineOptions.${id}`, {
          defaultValue: t(`healthCheck.vaccines.${id}.label`),
        }),
      })),
    [pet.species, t],
  );

  const petBirthDate = useMemo(() => {
    if (!pet.birth_date) return null;
    return parseBirthDateIso(pet.birth_date.slice(0, 10));
  }, [pet.birth_date]);
  const petBirthDateIso = pet.birth_date?.slice(0, 10) ?? '';
  const petBirthDateIsFuture = Boolean(petBirthDateIso && isBirthDateInFuture(petBirthDateIso, today));
  const selectedDesiredVaccineId =
    desiredVaccineId && schedulePrimaryVaccineOptions.some((option) => option.id === desiredVaccineId)
      ? desiredVaccineId
      : null;

  const careRecords = useMemo(
    () => records.filter((record) => record.type === 'vaccine' || record.type === 'reminder'),
    [records],
  );

  const allUpcomingRecords = useMemo(
    () =>
      careRecords
        .filter(isPendingScheduleRecord)
        .sort((a, b) => scheduleTimestamp(a) - scheduleTimestamp(b)),
    [careRecords],
  );
  const visibleUpcomingRecords = useMemo(
    () =>
      showAllUpcomingSchedules
        ? allUpcomingRecords
        : allUpcomingRecords.slice(0, UPCOMING_SCHEDULE_PREVIEW_LIMIT),
    [allUpcomingRecords, showAllUpcomingSchedules],
  );
  const hiddenUpcomingCount = Math.max(0, allUpcomingRecords.length - UPCOMING_SCHEDULE_PREVIEW_LIMIT);
  const historyRecords = useMemo(
    () =>
      careRecords
        .filter((record) => !allUpcomingRecords.some((upcoming) => upcoming.id === record.id))
        .filter((record) => !isFulfilledGeneratedReminder(record))
        .sort((a, b) => occurredTimestamp(b) - occurredTimestamp(a))
        .slice(0, 10),
    [careRecords, allUpcomingRecords],
  );

  const nextRecord = allUpcomingRecords[0];
  const isCatSpecies = pet.species.trim().toLowerCase() === 'cat';
  const selectedDoseIds = doseDrafts
    .filter((draft) => draft.careKind === 'vaccine')
    .map((draft) => draft.vaccineId)
    .filter(Boolean);
  const canAddCareEntry = doseDrafts.length < 12;
  const generatedRecommendations = previewedGeneratedRecommendations ?? [];
  const hasGeneratedSchedulePreview = previewedGeneratedRecommendations !== null;
  const pendingGeneratedRecommendations = useMemo(
    () =>
      isEditingGeneratedSchedule
        ? generatedRecommendations
        : generatedRecommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation)),
    [careRecords, generatedRecommendations, isEditingGeneratedSchedule],
  );
  const selectedGeneratedRecommendations = useMemo(
    () =>
      sortByDueDate(
        pendingGeneratedRecommendations.filter(
          (recommendation) => !dismissedGeneratedRecommendationIds.includes(recommendation.id),
        ),
      ),
    [dismissedGeneratedRecommendationIds, pendingGeneratedRecommendations],
  );
  const visiblePendingRecommendations = useMemo(
    () =>
      showAllGeneratedRecommendations
        ? selectedGeneratedRecommendations
        : selectedGeneratedRecommendations.slice(0, UPCOMING_SCHEDULE_PREVIEW_LIMIT),
    [selectedGeneratedRecommendations, showAllGeneratedRecommendations],
  );
  const hiddenPendingRecommendationsCount = Math.max(
    0,
    selectedGeneratedRecommendations.length - UPCOMING_SCHEDULE_PREVIEW_LIMIT,
  );
  const administeredVaccineDoses = useMemo(
    () =>
      careRecords
        .filter((record) => record.type === 'vaccine')
        .map((record): AdministeredVaccineDoseInput | null => {
          const vaccineName = metadataText(record, 'vaccineName') || record.title || record.note || '';
          const vaccineId = metadataText(record, 'vaccineId') || normalizeManualVaccineId(vaccineName, pet.species);
          if (!vaccineId) return null;
          const administeredAtValue = metadataText(record, 'administeredAt') || record.occurred_at || record.created_at;
          const administeredAt = new Date(administeredAtValue);
          if (!Number.isFinite(administeredAt.getTime())) return null;
          return { vaccineId, administeredAt };
        })
        .filter((dose): dose is AdministeredVaccineDoseInput => Boolean(dose)),
    [careRecords],
  );
  const administeredDewormingDoses = useMemo(
    () =>
      careRecords
        .filter(isHistoricalDewormingRecord)
        .map((record): AdministeredDewormingDoseInput | null => {
          const administeredAtValue = metadataText(record, 'administeredAt') || record.occurred_at || record.created_at;
          const administeredAt = new Date(administeredAtValue);
          if (!Number.isFinite(administeredAt.getTime())) return null;
          return { administeredAt };
        })
        .filter((dose): dose is AdministeredDewormingDoseInput => Boolean(dose)),
    [careRecords],
  );
  const draftVaccineDoses = useMemo(
    () =>
      doseDrafts
        .filter((draft) => draft.careKind === 'vaccine' && draft.vaccineId && draft.administeredAt)
        .map((draft) => ({
          vaccineId: draft.vaccineId,
          administeredAt: draft.administeredAt!,
        })),
    [doseDrafts],
  );
  const draftDewormingDoses = useMemo(
    () =>
      doseDrafts
        .filter((draft) => draft.careKind === 'deworming' && draft.administeredAt)
        .map((draft) => ({
          administeredAt: draft.administeredAt!,
        })),
    [doseDrafts],
  );
  const resolvedHistoryVaccineId = useMemo(() => {
    const fromDraft = draftVaccineDoses[0]?.vaccineId;
    if (fromDraft) return fromDraft;
    if (administeredVaccineDoses[0]?.vaccineId) return administeredVaccineDoses[0].vaccineId;
    return schedulePrimaryVaccineOptions[0]?.id ?? '';
  }, [administeredVaccineDoses, draftVaccineDoses, schedulePrimaryVaccineOptions]);
  const hasYesSchedulePreview = previewedYesSchedule !== null;
  const pendingYesCatRecommendations = useMemo(
    () =>
      previewedYesSchedule?.kind === 'cat'
        ? isEditingGeneratedSchedule
          ? previewedYesSchedule.recommendations
          : previewedYesSchedule.recommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation))
        : [],
    [careRecords, isEditingGeneratedSchedule, previewedYesSchedule],
  );
  const pendingYesDogRecommendations = useMemo(
    () =>
      previewedYesSchedule?.kind === 'dog'
        ? isEditingGeneratedSchedule
          ? previewedYesSchedule.recommendations
          : previewedYesSchedule.recommendations.filter((recommendation) => !nextVaccineRecommendationRecordExists(careRecords, recommendation))
        : [],
    [careRecords, isEditingGeneratedSchedule, previewedYesSchedule],
  );
  const selectedYesCatRecommendations = useMemo(
    () =>
      sortByDueDate(
        pendingYesCatRecommendations.filter((recommendation) => !dismissedYesRecommendationIds.includes(recommendation.id)),
      ),
    [dismissedYesRecommendationIds, pendingYesCatRecommendations],
  );
  const selectedYesDogRecommendations = useMemo(
    () =>
      sortByDueDate(
        pendingYesDogRecommendations.filter((recommendation) => !dismissedYesRecommendationIds.includes(recommendation.id)),
      ),
    [dismissedYesRecommendationIds, pendingYesDogRecommendations],
  );
  const selectedYesRecommendations = isCatSpecies ? selectedYesCatRecommendations : selectedYesDogRecommendations;
  const visibleYesRecommendations = useMemo(
    () =>
      showAllYesRecommendations
        ? selectedYesRecommendations
        : selectedYesRecommendations.slice(0, UPCOMING_SCHEDULE_PREVIEW_LIMIT),
    [selectedYesRecommendations, showAllYesRecommendations],
  );
  const hiddenYesRecommendationsCount = Math.max(0, selectedYesRecommendations.length - UPCOMING_SCHEDULE_PREVIEW_LIMIT);
  const hasEditScheduleChanges = useMemo(() => {
    if (!isEditingGeneratedSchedule || !editScheduleBaseline) return false;

    if (vaccinatedAnswer === 'yes') {
      const currentScheduleFingerprint = scheduleItemsFingerprint(
        selectedYesRecommendations.map((recommendation) => ({
          id: recommendation.id,
          dueDate: recommendation.dueDate,
        })),
      );
      return (
        currentScheduleFingerprint !== editScheduleBaseline.scheduleFingerprint ||
        doseDraftsFingerprint(doseDrafts) !== editScheduleBaseline.doseDraftsFingerprint
      );
    }

    const currentScheduleFingerprint = scheduleItemsFingerprint(
      selectedGeneratedRecommendations.map((recommendation) => ({
        id: recommendation.id,
        dueDate: recommendation.dueDate,
      })),
    );
    return (
      currentScheduleFingerprint !== editScheduleBaseline.scheduleFingerprint ||
      desiredVaccineId !== editScheduleBaseline.desiredVaccineId
    );
  }, [
    desiredVaccineId,
    doseDrafts,
    editScheduleBaseline,
    isEditingGeneratedSchedule,
    selectedGeneratedRecommendations,
    selectedYesRecommendations,
    vaccinatedAnswer,
  ]);
  const hasGeneratedSchedule = careRecords.some((record) =>
    Boolean(record.metadata?.generatedCoreCareScheduleId || record.metadata?.generatedCoreCareVaccineScheduleId),
  );
  const showScheduleSetup = isEditingGeneratedSchedule || (!scheduleSetupDismissed && !hasGeneratedSchedule);

  useEffect(() => {
    debugLog('CORE_CARE', 'CoreCareScreen.schedule_state', {
      petId: pet.id,
      species: pet.species,
      birthDate: pet.birth_date,
      isCatSpecies,
      hasGeneratedSchedule,
      administeredVaccineDoses: administeredVaccineDoses.length,
      administeredDewormingDoses: administeredDewormingDoses.length,
      draftVaccineDoses: draftVaccineDoses.length,
      draftDewormingDoses: draftDewormingDoses.length,
      generatedRecommendations: generatedRecommendations.length,
      pendingGeneratedRecommendations: pendingGeneratedRecommendations.length,
      previewedYesSchedule: previewedYesSchedule
        ? previewedYesSchedule.kind === 'cat'
          ? previewedYesSchedule.recommendations.length
          : previewedYesSchedule.recommendations.length
        : null,
      selectedYesRecommendations: selectedYesRecommendations.length,
      resolvedHistoryVaccineId,
      desiredVaccineId,
    });
  }, [
    administeredDewormingDoses.length,
    administeredVaccineDoses.length,
    desiredVaccineId,
    draftDewormingDoses.length,
    draftVaccineDoses.length,
    generatedRecommendations.length,
    hasGeneratedSchedule,
    isCatSpecies,
    pendingGeneratedRecommendations.length,
    pet.birth_date,
    pet.id,
    pet.species,
    previewedYesSchedule,
    resolvedHistoryVaccineId,
    selectedYesRecommendations.length,
  ]);

  function optionsForDose(draft: CareEntryDraft) {
    if (draft.careKind !== 'vaccine') return vaccineOptions;
    return vaccineOptions.filter((option) => option.id === draft.vaccineId || !selectedDoseIds.includes(option.id));
  }

  function clearYesSchedulePreview() {
    setPreviewedYesSchedule(null);
    setDismissedYesRecommendationIds([]);
    setShowAllYesRecommendations(false);
  }

  function updateCareEntry(id: string, patch: Partial<CareEntryDraft>) {
    clearYesSchedulePreview();
    setDoseDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    setDoseDraftErrors((current) => {
      const next = { ...current };
      const currentError = next[id];
      if (!currentError) return current;

      const updatedError = { ...currentError };
      if ('careKind' in patch) {
        delete updatedError.careKind;
        delete updatedError.vaccineId;
      }
      if ('vaccineId' in patch) delete updatedError.vaccineId;
      if ('administeredAt' in patch) delete updatedError.administeredAt;

      if (updatedError.careKind || updatedError.vaccineId || updatedError.administeredAt) {
        next[id] = updatedError;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function historyRecommendationTitle(recommendation: CoreCareScheduleRecommendation): string {
    if (recommendation.kind === 'vaccine' && resolvedHistoryVaccineId) {
      const label =
        schedulePrimaryVaccineOptions.find((option) => option.id === resolvedHistoryVaccineId)?.label ??
        vaccineOptions.find((option) => option.id === resolvedHistoryVaccineId)?.label ??
        resolvedHistoryVaccineId;
      if (recommendation.family === 'catFvrcp' || recommendation.family === 'dogDhpp' || recommendation.family === 'dogLepto') {
        return t('coreCare.nextVaccineReminderTitle', { vaccine: label, dose: recommendation.doseNumber });
      }
    }
    return t(`coreCare.generatedRules.${recommendation.family}.title`, { dose: recommendation.doseNumber });
  }

  function selectDesiredVaccine(vaccineId: string) {
    setDesiredVaccineId(vaccineId);
    setPreviewedGeneratedRecommendations(null);
    setDismissedGeneratedRecommendationIds([]);
    setShowAllGeneratedRecommendations(false);
    setGeneratedScheduleErrors((current) => ({ ...current, desiredVaccineId: undefined }));
  }

  function dismissGeneratedRecommendation(recommendationId: string) {
    setDismissedGeneratedRecommendationIds((current) =>
      current.includes(recommendationId) ? current : [...current, recommendationId],
    );
  }

  function nextVaccineRecommendationTitle(recommendation: CoreCareNextVaccineRecommendation): string {
    const label = vaccineOptions.find((option) => option.id === recommendation.vaccineId)?.label ?? recommendation.vaccineId;
    return t('coreCare.nextVaccineReminderTitle', { vaccine: label, dose: recommendation.doseNumber });
  }

  function nextVaccineRecommendationNote(recommendation: CoreCareNextVaccineRecommendation): string {
    const note = t('coreCare.generatedNextVaccineScheduleNote', {
      administeredAt: formatLocaleDateTime(recommendation.administeredAt, i18n.language),
      targetDate: formatLocaleDateTime(recommendation.targetDate, i18n.language),
      source: recommendation.sourceLabel,
      months: recommendation.horizonMonths,
    });
    const extraNotes = [];
    if (isFelvVaccine(recommendation.vaccineId)) extraNotes.push(t('coreCare.felvRiskNote'));
    if (recommendation.isRestartRequired) extraNotes.push(t('coreCare.lapsedPrimarySeriesWarning'));
    return extraNotes.length > 0 ? `${note}\n\n${extraNotes.join('\n\n')}` : note;
  }

  function desiredVaccineMatchesRecommendation(recommendation: CoreCareScheduleRecommendation): boolean {
    if (desiredVaccineId === 'cat_3in1_fvrcp' || desiredVaccineId === 'cat_4in1') return recommendation.family === 'catFvrcp';
    if (desiredVaccineId === 'cat_felv') return recommendation.family === 'catFelv';
    if (desiredVaccineId === 'cat_rabies') return recommendation.family === 'catRabies';
    if (desiredVaccineId === 'dog_5in1_dhppl' || desiredVaccineId === 'dog_7in1') {
      return recommendation.family === 'dogDhpp' || recommendation.family === 'dogLepto';
    }
    if (desiredVaccineId === 'dog_rabies') return recommendation.family === 'dogRabies';
    return false;
  }

  function dismissYesRecommendation(recommendationId: string) {
    setDismissedYesRecommendationIds((current) =>
      current.includes(recommendationId) ? current : [...current, recommendationId],
    );
  }

  function validateDoseDrafts(): CareEntryDraftErrors {
    const nextErrors: CareEntryDraftErrors = {};
    for (const draft of doseDrafts) {
      const draftErrors: { careKind?: string; vaccineId?: string; administeredAt?: string } = {};
      if (draft.careKind === 'vaccine' && !draft.vaccineId) {
        draftErrors.vaccineId = t('coreCare.vaccineFieldRequired');
      }
      if (!draft.administeredAt) {
        draftErrors.administeredAt = t('coreCare.performedDateFieldRequired');
      } else {
        const performed = startOfDay(draft.administeredAt);
        if (performed.getTime() > today.getTime()) {
          draftErrors.administeredAt = t('coreCare.performedDateFuture');
        } else if (petBirthDate && performed.getTime() < startOfDay(petBirthDate).getTime()) {
          draftErrors.administeredAt = t('coreCare.performedDateBeforeBirth');
        }
      }
      if (draftErrors.vaccineId || draftErrors.administeredAt) nextErrors[draft.id] = draftErrors;
    }
    return nextErrors;
  }

  function computeYesSchedulePreview(): YesSchedulePreview | null {
    if (isCatSpecies) {
      if (!petBirthDate || !resolvedHistoryVaccineId) return null;
      return {
        kind: 'cat',
        recommendations: calculateCoreCareScheduleFromHistory({
          species: pet.species,
          birthDate: petBirthDate,
          today,
          selectedVaccineId: resolvedHistoryVaccineId,
          administeredVaccines: mergeAdministeredVaccineDoses(administeredVaccineDoses, draftVaccineDoses),
          administeredDewormings: mergeAdministeredDewormingDoses(administeredDewormingDoses, draftDewormingDoses),
        }),
      };
    }

    return {
      kind: 'dog',
      recommendations: calculateNextVaccinationSchedule({
        species: pet.species,
        petAgeMonths: resolvePetAgeMonths(pet),
        today,
        administeredDoses: mergeAdministeredVaccineDoses(administeredVaccineDoses, draftVaccineDoses),
      }),
    };
  }

  function buildYesPreviewFromUpcomingRecords(): YesSchedulePreview | null {
    const upcomingGenerated = allUpcomingRecords.filter(isGeneratedUpcomingScheduleRecord);
    const catRecommendations = upcomingGenerated
      .map(recordToCatScheduleRecommendation)
      .filter((recommendation): recommendation is CoreCareScheduleRecommendation => Boolean(recommendation));
    if (catRecommendations.length > 0) {
      return { kind: 'cat', recommendations: catRecommendations };
    }

    const dogRecommendations = upcomingGenerated
      .map(recordToDogScheduleRecommendation)
      .filter((recommendation): recommendation is CoreCareNextVaccineRecommendation => Boolean(recommendation));
    if (dogRecommendations.length > 0) {
      return { kind: 'dog', recommendations: dogRecommendations };
    }

    return null;
  }

  function buildNoPreviewFromUpcomingRecords(): CoreCareScheduleRecommendation[] {
    return allUpcomingRecords
      .map(recordToCatScheduleRecommendation)
      .filter((recommendation): recommendation is CoreCareScheduleRecommendation => Boolean(recommendation));
  }

  function cancelEditGeneratedSchedule() {
    setIsEditingGeneratedSchedule(false);
    setEditScheduleBaseline(null);
    setGeneratedScheduleErrors({});
    setDoseDraftErrors({});
    setPreviewedGeneratedRecommendations(null);
    clearYesSchedulePreview();
    setDismissedGeneratedRecommendationIds([]);
    setShowAllGeneratedRecommendations(false);
    setDismissedYesRecommendationIds([]);
    setShowAllYesRecommendations(false);
    setDoseDrafts([makeCareEntryDraft()]);
    setDesiredVaccineId(null);
    setVaccinatedAnswer('yes');
  }

  function confirmCancelEditGeneratedSchedule() {
    Alert.alert(t('coreCare.cancelEditScheduleConfirmTitle'), t('coreCare.cancelEditScheduleConfirmBody'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), onPress: cancelEditGeneratedSchedule },
    ]);
  }

  function openGeneratedScheduleEdit() {
    setIsEditingGeneratedSchedule(true);
    setGeneratedScheduleErrors({});
    setDoseDraftErrors({});
    setDismissedGeneratedRecommendationIds([]);
    setDismissedYesRecommendationIds([]);
    setShowAllGeneratedRecommendations(false);
    setShowAllYesRecommendations(false);

    const yesPath = hasRecordedCareHistory(careRecords);

    if (yesPath) {
      const hydratedDrafts = hydrateDoseDraftsFromHistory(careRecords, petBirthDate, today);
      setVaccinatedAnswer('yes');
      setDoseDrafts(hydratedDrafts);

      const hydratedVaccineDoses = hydratedDrafts
        .filter((draft) => draft.careKind === 'vaccine' && draft.vaccineId && draft.administeredAt)
        .map((draft) => ({ vaccineId: draft.vaccineId, administeredAt: draft.administeredAt! }));
      const hydratedDewormingDoses = hydratedDrafts
        .filter((draft) => draft.careKind === 'deworming' && draft.administeredAt)
        .map((draft) => ({ administeredAt: draft.administeredAt! }));
      const historyVaccineId =
        hydratedVaccineDoses[0]?.vaccineId ||
        administeredVaccineDoses[0]?.vaccineId ||
        schedulePrimaryVaccineOptions[0]?.id ||
        '';

      let preview: YesSchedulePreview | null = null;
      if (isCatSpecies && petBirthDate && historyVaccineId) {
        preview = {
          kind: 'cat',
          recommendations: calculateCoreCareScheduleFromHistory({
            species: pet.species,
            birthDate: petBirthDate,
            today,
            selectedVaccineId: historyVaccineId,
            administeredVaccines: mergeAdministeredVaccineDoses(administeredVaccineDoses, hydratedVaccineDoses),
            administeredDewormings: mergeAdministeredDewormingDoses(administeredDewormingDoses, hydratedDewormingDoses),
          }),
        };
      } else if (!isCatSpecies) {
        preview = {
          kind: 'dog',
          recommendations: calculateNextVaccinationSchedule({
            species: pet.species,
            petAgeMonths: resolvePetAgeMonths(pet),
            today,
            administeredDoses: mergeAdministeredVaccineDoses(administeredVaccineDoses, hydratedVaccineDoses),
          }),
        };
      }

      const resolvedYesPreview = preview ?? buildYesPreviewFromUpcomingRecords();
      setPreviewedYesSchedule(resolvedYesPreview);
      setPreviewedGeneratedRecommendations(null);
      setDesiredVaccineId(null);
      setEditScheduleBaseline({
        scheduleFingerprint: scheduleItemsFingerprint(
          (resolvedYesPreview?.recommendations ?? []).map((recommendation) => ({
            id: recommendation.id,
            dueDate: recommendation.dueDate,
          })),
        ),
        doseDraftsFingerprint: doseDraftsFingerprint(hydratedDrafts),
        desiredVaccineId: null,
      });
      return;
    }

    setVaccinatedAnswer('no');
    const inferredVaccineId = inferDesiredVaccineIdFromRecords(careRecords, schedulePrimaryVaccineOptions);
    setDesiredVaccineId(inferredVaccineId);

    let recommendations: CoreCareScheduleRecommendation[] = [];
    if (petBirthDate && inferredVaccineId && !petBirthDateIsFuture) {
      recommendations = calculateCoreCareSchedule({
        species: pet.species,
        birthDate: petBirthDate,
        today,
        selectedVaccineId: inferredVaccineId,
      });
    }
    if (recommendations.length === 0) {
      recommendations = buildNoPreviewFromUpcomingRecords();
    }

    setPreviewedGeneratedRecommendations(recommendations);
    setPreviewedYesSchedule(null);
    setEditScheduleBaseline({
      scheduleFingerprint: scheduleItemsFingerprint(
        recommendations.map((recommendation) => ({
          id: recommendation.id,
          dueDate: recommendation.dueDate,
        })),
      ),
      doseDraftsFingerprint: '',
      desiredVaccineId: inferredVaccineId,
    });
  }

  function checkScheduleFromVaccines() {
    const nextErrors = validateDoseDrafts();
    setDoseDraftErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (isCatSpecies && !petBirthDate) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.birthDateEditPetHint'));
      return;
    }

    const preview = computeYesSchedulePreview();
    if (!preview) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }

    setPreviewedYesSchedule(preview);
    setDismissedYesRecommendationIds([]);
    setShowAllYesRecommendations(false);

    const pendingRecommendations =
      preview.kind === 'cat'
        ? preview.recommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation))
        : preview.recommendations.filter((recommendation) => !nextVaccineRecommendationRecordExists(careRecords, recommendation));

    if (preview.recommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }

    if (pendingRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
    }
  }

  async function createScheduleFromVaccines() {
    debugLog('CORE_CARE', 'CoreCareScreen.createScheduleFromVaccines.enter', {
      doseDraftCount: doseDrafts.length,
      selectedYesRecommendations: selectedYesRecommendations.length,
      isCatSpecies,
    });
    const nextErrors = validateDoseDrafts();
    if (isCatSpecies && !petBirthDate) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.birthDateEditPetHint'));
      return;
    }

    setDoseDraftErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!hasYesSchedulePreview) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.checkGeneratedScheduleFirst'));
      return;
    }

    if (selectedYesRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noSelectedGeneratedScheduleBody'));
      return;
    }

    const yesCatRecommendationsToCreate = selectedYesCatRecommendations.filter(
      (recommendation) => !recommendationRecordExists(careRecords, recommendation),
    );
    const yesDogRecommendationsToCreate = selectedYesDogRecommendations.filter(
      (recommendation) => !nextVaccineRecommendationRecordExists(careRecords, recommendation),
    );
    const hasNewCareDrafts = doseDrafts.some(
      (draft) => Boolean(draft.administeredAt) && !careEntryDraftAlreadyRecorded(draft, careRecords),
    );
    const recommendationsToCreate = isCatSpecies ? yesCatRecommendationsToCreate : yesDogRecommendationsToCreate;

    if (!hasNewCareDrafts && recommendationsToCreate.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      if (isEditingGeneratedSchedule) {
        setIsEditingGeneratedSchedule(false);
        setEditScheduleBaseline(null);
        clearYesSchedulePreview();
      }
      return;
    }

    setSubmittingVaccines(true);
    try {
      let dewormingHistoryCount = administeredDewormingDoses.length;
      for (const draft of doseDrafts) {
        if (!draft.administeredAt || careEntryDraftAlreadyRecorded(draft, careRecords)) continue;
        const administeredAt = formatDateValue(draft.administeredAt);
        if (draft.careKind === 'deworming') {
          dewormingHistoryCount += 1;
          await onCreateRecord({
            type: 'reminder',
            title: t('coreCare.generatedRules.catDeworming.title', { dose: dewormingHistoryCount }),
            note: '',
            occurredAt: administeredAt,
            dueAt: null,
            status: 'done',
            metadata: {
              generatedCoreCareKind: 'deworming',
              generatedCoreCareFamily: 'catDeworming',
              generatedCoreCareDoseNumber: dewormingHistoryCount,
              administeredAt,
              isHistoricalDeworming: true,
            },
          });
          continue;
        }

        const option = vaccineOptions.find((item) => item.id === draft.vaccineId);
        const label = option?.label ?? draft.vaccineId;
        await onCreateRecord({
          type: 'vaccine',
          title: label,
          note: '',
          occurredAt: administeredAt,
          dueAt: null,
          status: 'active',
          metadata: {
            vaccineId: draft.vaccineId,
            vaccineName: label,
            administeredAt,
          },
        });
      }

      if (isCatSpecies) {
        for (const recommendation of yesCatRecommendationsToCreate) {
          await onCreateRecord({
            type: 'reminder',
            title: historyRecommendationTitle(recommendation),
            note: recommendationNote(recommendation),
            dueAt: recommendation.dueDate,
            status: 'pending',
            metadata: {
              generatedCoreCareScheduleId: recommendation.id,
              generatedCoreCareFamily: recommendation.family,
              generatedCoreCareKind: recommendation.kind,
              generatedCoreCareDoseNumber: recommendation.doseNumber,
              targetDate: recommendation.targetDate,
              sourceLabel: recommendation.sourceLabel,
              sourceUrl: recommendation.sourceUrl,
              isCatchUp: recommendation.isCatchUp,
            },
          });
        }
      } else {
        for (const recommendation of yesDogRecommendationsToCreate) {
          await onCreateRecord({
            type: 'reminder',
            title: nextVaccineRecommendationTitle(recommendation),
            note: nextVaccineRecommendationNote(recommendation),
            dueAt: recommendation.dueDate,
            status: 'pending',
            metadata: {
              generatedCoreCareVaccineScheduleId: recommendation.id,
              generatedCoreCareKind: 'vaccine',
              vaccineId: recommendation.vaccineId,
              generatedCoreCareDoseNumber: recommendation.doseNumber,
              administeredAt: recommendation.administeredAt,
              targetDate: recommendation.targetDate,
              sourceLabel: recommendation.sourceLabel,
              sourceUrl: recommendation.sourceUrl,
              isCatchUp: recommendation.isCatchUp,
              horizonMonths: recommendation.horizonMonths,
              isRestartRequired: recommendation.isRestartRequired,
            },
          });
        }
      }

      setDoseDrafts([makeCareEntryDraft()]);
      clearYesSchedulePreview();
      setIsEditingGeneratedSchedule(false);
      setEditScheduleBaseline(null);
      setScheduleSetupDismissed(true);
      Alert.alert(
        t('coreCare.scheduleGeneratedTitle'),
        isCatSpecies
          ? t('coreCare.scheduleGeneratedBody', { count: yesCatRecommendationsToCreate.length })
          : t('coreCare.vaccineScheduleGeneratedBody', { count: yesDogRecommendationsToCreate.length }),
      );
      debugLog('CORE_CARE', 'CoreCareScreen.createScheduleFromVaccines.exit', { ok: true });
    } catch (error) {
      debugCheck('CORE_CARE', 'CoreCareScreen.createScheduleFromVaccines', false, {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      setSubmittingVaccines(false);
    }
  }

  async function saveVaccine() {
    const cleanTitle = vaccineTitle.trim();
    if (!cleanTitle) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.vaccineTitleRequired'));
      return;
    }

    setSubmittingVaccine(true);
    try {
      const nextDueAt = formatDateValue(vaccineNextDueDate);
      const occurredAt = formatDateValue(today);
      await onCreateRecord({
        type: 'vaccine',
        title: cleanTitle,
        note: vaccineNote.trim(),
        occurredAt,
        dueAt: null,
        status: 'active',
        metadata: {
          vaccineName: cleanTitle,
          administeredAt: occurredAt,
          nextDueAt,
          ...(vaccineClinic.trim() ? { clinic: vaccineClinic.trim() } : {}),
        },
      });
      await onCreateRecord({
        type: 'reminder',
        title: t('coreCare.manualNextVaccineReminderTitle', { vaccine: cleanTitle }),
        note: `${t('coreCare.manualNextVaccineReminderNote', {
          targetDate: formatLocaleDateTime(nextDueAt, i18n.language),
        })}${isFelvVaccine(cleanTitle) ? `\n\n${t('coreCare.felvRiskNote')}` : ''}`,
        dueAt: nextDueAt,
        status: 'pending',
        metadata: {
          generatedCoreCareKind: 'vaccine',
          vaccineName: cleanTitle,
          targetDate: nextDueAt,
          ...(vaccineClinic.trim() ? { clinic: vaccineClinic.trim() } : {}),
        },
      });
      setVaccineTitle('');
      setVaccineClinic('');
      setVaccineNote('');
      setVaccineNextDueDate(today);
    } finally {
      setSubmittingVaccine(false);
    }
  }

  function recommendationTitle(recommendation: CoreCareScheduleRecommendation): string {
    const desiredVaccineLabel =
      schedulePrimaryVaccineOptions.find((option) => option.id === desiredVaccineId)?.label ??
      vaccineOptions.find((option) => option.id === desiredVaccineId)?.label;
    if (recommendation.kind === 'vaccine' && desiredVaccineLabel && desiredVaccineMatchesRecommendation(recommendation)) {
      return t('coreCare.nextVaccineReminderTitle', { vaccine: desiredVaccineLabel, dose: recommendation.doseNumber });
    }

    return t(`coreCare.generatedRules.${recommendation.family}.title`, { dose: recommendation.doseNumber });
  }

  function recommendationNote(recommendation: CoreCareScheduleRecommendation): string {
    const note = t('coreCare.generatedScheduleNote', {
      targetDate: formatLocaleDateTime(recommendation.targetDate, i18n.language),
      source: recommendation.sourceLabel,
    });
    return recommendation.family === 'catFelv' ? `${note}\n\n${t('coreCare.felvRiskNote')}` : note;
  }

  function validateGeneratedScheduleInputs(): GeneratedScheduleErrors {
    return {
      birthDate: petBirthDate
        ? petBirthDateIsFuture
          ? t('coreCare.birthDateFutureScheduleHint')
          : undefined
        : t('coreCare.birthDateEditPetHint'),
      desiredVaccineId: selectedDesiredVaccineId ? undefined : t('coreCare.desiredVaccineRequired'),
    };
  }

  function checkGeneratedSchedule() {
    const nextErrors = validateGeneratedScheduleInputs();
    setGeneratedScheduleErrors(nextErrors);
    if (nextErrors.birthDate || nextErrors.desiredVaccineId) {
      return;
    }

    const recommendations = calculateCoreCareSchedule({
      species: pet.species,
      birthDate: petBirthDate!,
      today,
      selectedVaccineId: selectedDesiredVaccineId!,
    });
    setPreviewedGeneratedRecommendations(recommendations);
    setDismissedGeneratedRecommendationIds([]);
    setShowAllGeneratedRecommendations(false);

    if (recommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }

    const pendingRecommendations = recommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation));
    if (pendingRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
    }
  }

  async function createGeneratedSchedule() {
    const nextErrors = validateGeneratedScheduleInputs();
    setGeneratedScheduleErrors(nextErrors);
    if (nextErrors.birthDate || nextErrors.desiredVaccineId) {
      return;
    }

    if (!hasGeneratedSchedulePreview) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.checkGeneratedScheduleFirst'));
      return;
    }

    if (generatedRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }
    if (!isEditingGeneratedSchedule && pendingGeneratedRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      return;
    }
    if (selectedGeneratedRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noSelectedGeneratedScheduleBody'));
      return;
    }

    const recommendationsToCreate = selectedGeneratedRecommendations.filter(
      (recommendation) => !recommendationRecordExists(careRecords, recommendation),
    );
    if (recommendationsToCreate.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      if (isEditingGeneratedSchedule) {
        setIsEditingGeneratedSchedule(false);
        setEditScheduleBaseline(null);
        setPreviewedGeneratedRecommendations(null);
      }
      return;
    }

    setSubmittingGeneratedSchedule(true);
    try {
      for (const recommendation of recommendationsToCreate) {
        await onCreateRecord({
          type: 'reminder',
          title: recommendationTitle(recommendation),
          note: recommendationNote(recommendation),
          dueAt: recommendation.dueDate,
          status: 'pending',
          metadata: {
            generatedCoreCareScheduleId: recommendation.id,
            generatedCoreCareFamily: recommendation.family,
            generatedCoreCareKind: recommendation.kind,
            generatedCoreCareDoseNumber: recommendation.doseNumber,
            targetDate: recommendation.targetDate,
            sourceLabel: recommendation.sourceLabel,
            sourceUrl: recommendation.sourceUrl,
            isCatchUp: recommendation.isCatchUp,
          },
        });
      }
      Alert.alert(
        t('coreCare.scheduleGeneratedTitle'),
        t('coreCare.scheduleGeneratedBody', { count: recommendationsToCreate.length }),
      );
      setDismissedGeneratedRecommendationIds([]);
      setPreviewedGeneratedRecommendations(null);
      setIsEditingGeneratedSchedule(false);
      setEditScheduleBaseline(null);
      setScheduleSetupDismissed(true);
    } finally {
      setSubmittingGeneratedSchedule(false);
    }
  }

  async function saveReminder() {
    const cleanTitle = reminderTitle.trim();
    if (!cleanTitle) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.reminderTitleRequired'));
      return;
    }
    setSubmittingReminder(true);
    try {
      await onCreateRecord({
        type: 'reminder',
        title: cleanTitle,
        note: reminderNote.trim(),
        dueAt: formatDateValue(reminderDate),
        status: 'pending',
        metadata: {},
      });
      setReminderTitle('');
      setReminderNote('');
      setReminderDate(today);
    } finally {
      setSubmittingReminder(false);
    }
  }

  async function markScheduleItemAdministered(record: CoreCareRecord) {
    if (!record.due_at || !canMarkScheduleAdministered(record.due_at, today)) return;

    const administeredAt = formatDateValue(today);
    const generatedKind = generatedCareKind(record);
    const vaccineId = metadataText(record, 'vaccineId');

    setMarkingAdministeredRecordId(record.id);
    try {
      if (generatedKind === 'vaccine' || vaccineId) {
        const label = vaccineId ? t(`healthCheck.vaccines.${vaccineId}.label`, { defaultValue: record.title }) : record.title;
        await onCreateRecord({
          type: 'vaccine',
          title: label,
          note: record.note || '',
          occurredAt: administeredAt,
          dueAt: null,
          status: 'active',
          metadata: {
            ...(vaccineId ? { vaccineId } : {}),
            vaccineName: label,
            administeredAt,
            fulfilledReminderId: record.id,
          },
        });
      } else if (generatedKind === 'deworming' || isDewormingCareRecord(record)) {
        const doseNumber = record.metadata?.generatedCoreCareDoseNumber;
        await onCreateRecord({
          type: 'reminder',
          title:
            typeof doseNumber === 'number'
              ? t('coreCare.generatedRules.catDeworming.title', { dose: doseNumber })
              : record.title,
          note: '',
          occurredAt: administeredAt,
          dueAt: null,
          status: 'done',
          metadata: {
            generatedCoreCareKind: 'deworming',
            generatedCoreCareFamily: metadataText(record, 'generatedCoreCareFamily') || 'catDeworming',
            ...(typeof doseNumber === 'number' ? { generatedCoreCareDoseNumber: doseNumber } : {}),
            administeredAt,
            isHistoricalDeworming: true,
            fulfilledReminderId: record.id,
          },
        });
      }

      await onMarkReminderDone(record);
    } finally {
      setMarkingAdministeredRecordId(null);
    }
  }

  function renderRecordCard(record: CoreCareRecord, options?: { showDoneAction?: boolean }) {
    const generatedKind = generatedCareKind(record);
    const typeLabel = generatedKind ? t(`coreCare.generatedKinds.${generatedKind}`) : t(`coreCare.types.${record.type}`);
    const isUpcoming = Boolean(options?.showDoneAction && record.due_at);
    const scheduleDateLabel = recordScheduleDateLabel(record, i18n.language, isUpcoming);
    const shouldShowAdministeredAction = Boolean(options?.showDoneAction && record.type === 'reminder');
    const canMarkAdministered = Boolean(record.due_at && canMarkScheduleAdministered(record.due_at, today));
    const isMarkingAdministered = markingAdministeredRecordId === record.id;
    const displayTitle = record.title;

    return (
      <View
        key={record.id}
        testID={`core-care-record-${record.id}`}
        className="rounded-xl border border-blue-100 bg-white p-3"
      >
        <View className="flex-row items-start gap-3">
          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
            <CareScheduleIcon record={record} size={16} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-slate-900" numberOfLines={2}>
              {displayTitle}
            </Text>
            <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
              {typeLabel} {scheduleDateLabel ? `· ${scheduleDateLabel}` : ''}
            </Text>
            {isUpcoming ? (
              <ScheduleDueStatusBadge dueAt={record.due_at} today={today} t={t} />
            ) : (
              <Text className="mt-1 text-xs font-semibold text-emerald-600">{historyStatusLabel(record, t)}</Text>
            )}
          </View>
          {shouldShowAdministeredAction ? (
            <Pressable
              testID={`core-care-mark-administered-${record.id}`}
              accessibilityRole="button"
              accessibilityLabel={t('coreCare.markAdministeredA11y', { title: displayTitle })}
              accessibilityState={{ disabled: !canMarkAdministered || isMarkingAdministered }}
              className={`shrink-0 rounded-lg px-2.5 py-2 ${
                canMarkAdministered && !isMarkingAdministered
                  ? 'bg-emerald-50 active:bg-emerald-100'
                  : 'opacity-50'
              }`}
              disabled={!canMarkAdministered || isMarkingAdministered}
              onPress={() => void markScheduleItemAdministered(record)}
            >
              {isMarkingAdministered ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Text
                  className={`text-xs font-bold ${canMarkAdministered ? 'text-emerald-700' : 'text-slate-400'}`}
                  numberOfLines={2}
                >
                  {t('coreCare.markAdministered')}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function renderYesCatRecommendationPreview(recommendation: CoreCareScheduleRecommendation) {
    return (
      <View key={recommendation.id} className="rounded-xl border border-blue-100 bg-white p-3">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 flex-row items-start gap-2">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <CareScheduleIcon kind={recommendation.kind} size={16} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">{historyRecommendationTitle(recommendation)}</Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
                {t(`coreCare.generatedKinds.${recommendation.kind}`)} · {formatLocaleDateTime(recommendation.dueDate, i18n.language)}
              </Text>
              <ScheduleDueStatusBadge dueAt={recommendation.dueDate} today={today} t={t} />
            </View>
          </View>
          <Pressable
            testID={`core-care-remove-yes-recommendation-${recommendation.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('coreCare.removeGeneratedScheduleItemA11y', { title: historyRecommendationTitle(recommendation) })}
            className="rounded-full p-1.5 active:bg-slate-100"
            onPress={() => dismissYesRecommendation(recommendation.id)}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderYesDogRecommendationPreview(recommendation: CoreCareNextVaccineRecommendation) {
    return (
      <View key={recommendation.id} className="rounded-xl border border-blue-100 bg-white p-3">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 flex-row items-start gap-2">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <CareScheduleIcon kind="vaccine" size={16} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">{nextVaccineRecommendationTitle(recommendation)}</Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
                {t('coreCare.generatedKinds.vaccine')} · {formatLocaleDateTime(recommendation.dueDate, i18n.language)}
              </Text>
              <ScheduleDueStatusBadge dueAt={recommendation.dueDate} today={today} t={t} />
            </View>
          </View>
          <Pressable
            testID={`core-care-remove-yes-recommendation-${recommendation.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('coreCare.removeGeneratedScheduleItemA11y', { title: nextVaccineRecommendationTitle(recommendation) })}
            className="rounded-full p-1.5 active:bg-slate-100"
            onPress={() => dismissYesRecommendation(recommendation.id)}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderRecommendationPreview(recommendation: CoreCareScheduleRecommendation) {
    return (
      <View key={recommendation.id} className="rounded-xl border border-blue-100 bg-white p-3">
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 flex-row items-start gap-2">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <CareScheduleIcon kind={recommendation.kind} size={16} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">{recommendationTitle(recommendation)}</Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
                {t(`coreCare.generatedKinds.${recommendation.kind}`)} · {formatLocaleDateTime(recommendation.dueDate, i18n.language)}
              </Text>
              <ScheduleDueStatusBadge dueAt={recommendation.dueDate} today={today} t={t} />
            </View>
          </View>
          <Pressable
            testID={`core-care-remove-recommendation-${recommendation.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('coreCare.removeGeneratedScheduleItemA11y', { title: recommendationTitle(recommendation) })}
            className="rounded-full p-1.5 active:bg-slate-100"
            onPress={() => dismissGeneratedRecommendation(recommendation.id)}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>
      </View>
    );
  }

  async function markIntroGuideSeen() {
    setShowIntroGuide(false);
    try {
      await AsyncStorage.setItem(introGuideStorageKey, '1');
    } catch {
      // If local storage is unavailable, still let Sen continue in the current session.
    }
  }

  function dismissIntroGuide() {
    void markIntroGuideSeen();
  }

  function openInfoFromIntroGuide() {
    void markIntroGuideSeen().then(onOpenInfo);
  }

  return (
    <View testID="core-care-screen" className="flex-1 bg-[#F2F4F8]">
      <MaiScheduleSavingModal visible={submittingGeneratedSchedule} petName={pet.name} />
      <Modal visible={showIntroGuide} transparent animationType="fade" onRequestClose={dismissIntroGuide}>
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="rounded-3xl bg-white p-5">
            <Text className="mb-4 text-center text-lg font-bold text-slate-900">{t('coreCare.introGuideTitle')}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-600">{t('coreCareInfo.heroBody')}</Text>
            <Pressable
              testID="core-care-intro-info-link"
              accessibilityRole="button"
              accessibilityLabel={t('coreCare.openInfo')}
              className="mt-5 self-center flex-row items-center gap-1 px-2 py-1 active:opacity-70"
              onPress={openInfoFromIntroGuide}
            >
              <Ionicons name="information-circle-outline" size={14} color={PRIMARY} />
              <Text className="text-sm font-bold text-blue-700">{t('coreCare.openInfo')}</Text>
            </Pressable>
            <Pressable
              testID="core-care-intro-dismiss-button"
              accessibilityRole="button"
              className="mt-3 rounded-2xl bg-blue-600 py-3 active:opacity-90"
              onPress={dismissIntroGuide}
            >
              <Text className="text-center text-sm font-bold text-white">{t('coreCare.introGuideDismiss')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View className="border-b border-gray-200 bg-white px-2 pb-2 pt-2">
        <View className="flex-row items-center">
          <View className="w-14">
            <Pressable
              testID="core-care-back-button"
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="rounded-lg p-2 active:bg-gray-100"
              onPress={onBack}
            >
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </Pressable>
          </View>
          <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('coreCare.title')}</Text>
          <View className="w-14" />
        </View>
        <Pressable
          testID="core-care-info-link"
          accessibilityRole="button"
          accessibilityLabel={t('coreCare.openInfo')}
          className="-mt-1 self-center flex-row items-center gap-1 px-2 py-0.5 active:opacity-70"
          onPress={onOpenInfo}
        >
          <Ionicons name="information-circle-outline" size={13} color={PRIMARY} />
          <Text className="text-xs font-semibold text-blue-700">{t('coreCare.openInfo')}</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-base font-bold text-slate-900">{t('coreCare.nextScheduleForPet', { name: pet.name })}</Text>
            {hasGeneratedSchedule && !isEditingGeneratedSchedule ? (
              <Pressable
                testID="core-care-edit-generated-schedule-button"
                accessibilityRole="button"
                className="rounded-lg px-2 py-1 active:opacity-70"
                onPress={openGeneratedScheduleEdit}
              >
                <Text className="text-sm font-bold text-blue-700">{t('coreCare.editSchedule')}</Text>
              </Pressable>
            ) : isEditingGeneratedSchedule ? (
              <Pressable
                testID="core-care-cancel-edit-generated-schedule-button"
                accessibilityRole="button"
                className="rounded-lg px-2 py-1 active:opacity-70"
                onPress={confirmCancelEditGeneratedSchedule}
              >
                <Text className="text-sm font-bold text-slate-600">{t('common.cancel')}</Text>
              </Pressable>
            ) : null}
          </View>
          {!isEditingGeneratedSchedule ? (
            nextRecord?.due_at ? (
              <View className="mt-3 gap-3">
                {visibleUpcomingRecords.map((record) => renderRecordCard(record, { showDoneAction: true }))}
                {hiddenUpcomingCount > 0 ? (
                  <Pressable
                    testID="core-care-show-more-upcoming-button"
                    accessibilityRole="button"
                    className="self-center py-1 active:opacity-70"
                    onPress={() => setShowAllUpcomingSchedules((current) => !current)}
                  >
                    <Text className="text-xs font-semibold text-blue-700">
                      {showAllUpcomingSchedules
                        ? t('coreCare.showLessSchedules')
                        : t('coreCare.showMoreSchedules', { count: hiddenUpcomingCount })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text className="mt-2 text-sm leading-5 text-slate-600">{t('coreCare.noNextSchedule')}</Text>
            )
          ) : null}
          {showScheduleSetup ? (
            <>
              <Text className="mt-5 text-sm font-bold text-slate-900">{t('coreCare.hasPetReceivedCare', { name: pet.name })}</Text>
              <View className="mt-3 flex-row gap-3">
                {(['yes', 'no'] as VaccinatedAnswer[]).map((answer) => {
                  const active = vaccinatedAnswer === answer;
                  return (
                    <Pressable
                      key={answer}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className={`flex-1 rounded-xl border px-4 py-3 active:bg-blue-50 ${
                        active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => {
                        if (vaccinatedAnswer === answer) return;
                        setVaccinatedAnswer(answer);
                      }}
                    >
                      <Text className={`text-center text-sm font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                        {t(`common.${answer}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {vaccinatedAnswer === 'yes' ? (
                <View className="mt-4">
                  {vaccineOptions.length === 0 ? (
                    <Text className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('coreCare.unsupportedVaccineSpecies')}</Text>
                  ) : null}
                  <View className="gap-4">
                    {doseDrafts.map((draft, index) => (
                      <View key={draft.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                        <View className="mb-3 flex-row items-center justify-between">
                          <Text className="text-sm font-bold text-slate-900">{t('coreCare.careEntryNumber', { count: index + 1 })}</Text>
                          {doseDrafts.length > 1 ? (
                            <Pressable
                              accessibilityRole="button"
                              className="rounded-full bg-white p-1.5"
                              onPress={() => {
                                clearYesSchedulePreview();
                                setDoseDrafts((current) => current.filter((item) => item.id !== draft.id));
                                setDoseDraftErrors((current) => {
                                  const next = { ...current };
                                  delete next[draft.id];
                                  return next;
                                });
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#dc2626" />
                            </Pressable>
                          ) : null}
                        </View>
                        <View className="mb-3">
                          <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{t('coreCare.careKindLabel')}</Text>
                          <View className="flex-row gap-2">
                            {(isCatSpecies ? (['vaccine', 'deworming'] as CareEntryKind[]) : (['vaccine'] as CareEntryKind[])).map((kind) => {
                              const active = draft.careKind === kind;
                              return (
                                <Pressable
                                  key={kind}
                                  accessibilityRole="button"
                                  accessibilityState={{ selected: active }}
                                  className={`flex-1 rounded-xl border px-3 py-2.5 active:bg-blue-50 ${
                                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                                  }`}
                                  onPress={() =>
                                    updateCareEntry(draft.id, {
                                      careKind: kind,
                                      vaccineId: kind === 'deworming' ? '' : draft.vaccineId,
                                    })
                                  }
                                >
                                  <Text className={`text-center text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {t(`coreCare.careKind.${kind}`)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                        {draft.careKind === 'vaccine' ? (
                          <View className="flex-row gap-3">
                            <VaccineSelect
                              label={t('coreCare.vaccineType')}
                              value={draft.vaccineId}
                              options={optionsForDose(draft)}
                              error={doseDraftErrors[draft.id]?.vaccineId}
                              onChange={(vaccineId) => updateCareEntry(draft.id, { vaccineId })}
                            />
                            <DateField
                              testID={`core-care-performed-date-${index}`}
                              label={t('coreCare.performedDate')}
                              value={draft.administeredAt}
                              placeholder={t('coreCare.selectDate')}
                              error={doseDraftErrors[draft.id]?.administeredAt}
                              minimumDate={petBirthDate ?? undefined}
                              maximumDate={today}
                              onChange={(administeredAt) => updateCareEntry(draft.id, { administeredAt })}
                            />
                          </View>
                        ) : (
                          <DateField
                            fullWidth
                            testID={`core-care-performed-date-${index}`}
                            label={t('coreCare.performedDate')}
                            value={draft.administeredAt}
                            placeholder={t('coreCare.selectDate')}
                            error={doseDraftErrors[draft.id]?.administeredAt}
                            minimumDate={petBirthDate ?? undefined}
                            maximumDate={today}
                            onChange={(administeredAt) => updateCareEntry(draft.id, { administeredAt })}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canAddCareEntry}
                    className={`mt-3 h-11 items-center justify-center rounded-xl border border-dashed ${
                      canAddCareEntry ? 'border-blue-300 bg-blue-50 active:bg-blue-100' : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                    onPress={() => {
                      if (!canAddCareEntry) return;
                      clearYesSchedulePreview();
                      setDoseDrafts((current) => [...current, makeCareEntryDraft()]);
                    }}
                  >
                    <Ionicons name="add" size={22} color={canAddCareEntry ? PRIMARY : '#94a3b8'} />
                  </Pressable>
                  <Text className="mt-3 text-sm leading-5 text-slate-700">{t('coreCare.generatedScheduleIntro')}</Text>
                  {hasYesSchedulePreview ? (
                    <View className="mt-3 gap-2">
                      {previewedYesSchedule && previewedYesSchedule.recommendations.length > 0 ? (
                        selectedYesRecommendations.length > 0 ? (
                          isCatSpecies
                            ? visibleYesRecommendations.map((recommendation) =>
                                renderYesCatRecommendationPreview(recommendation as CoreCareScheduleRecommendation),
                              )
                            : visibleYesRecommendations.map((recommendation) =>
                                renderYesDogRecommendationPreview(recommendation as CoreCareNextVaccineRecommendation),
                              )
                        ) : (
                          <Text className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                            {t('coreCare.allGeneratedSchedulesRemoved')}
                          </Text>
                        )
                      ) : (
                        <Text className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                          {t('coreCare.noGeneratedScheduleBody')}
                        </Text>
                      )}
                      {hiddenYesRecommendationsCount > 0 ? (
                        <Pressable
                          testID="core-care-show-more-yes-recommendations-button"
                          accessibilityRole="button"
                          className="self-center py-1 active:opacity-70"
                          onPress={() => setShowAllYesRecommendations((current) => !current)}
                        >
                          <Text className="text-xs font-semibold text-blue-700">
                            {showAllYesRecommendations
                              ? t('coreCare.showLessSchedules')
                              : t('coreCare.showMoreSchedules', { count: hiddenYesRecommendationsCount })}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  <Text className="mt-3 text-xs leading-4 text-slate-500">{t('coreCare.generatedScheduleDisclaimer')}</Text>
                  {!hasYesSchedulePreview ? (
                    <Pressable
                      testID="core-care-check-yes-schedule-button"
                      accessibilityRole="button"
                      className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                      onPress={checkScheduleFromVaccines}
                      disabled={vaccineOptions.length === 0}
                    >
                      <Ionicons name="search-outline" size={18} color="#fff" />
                      <Text className="text-sm font-bold text-white">{t('coreCare.checkGeneratedSchedule')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      testID="core-care-save-vaccines-button"
                      accessibilityRole="button"
                      className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                        submittingVaccines ||
                        selectedYesRecommendations.length === 0 ||
                        (isEditingGeneratedSchedule && !hasEditScheduleChanges)
                          ? 'opacity-60'
                          : ''
                      }`}
                      onPress={() => void createScheduleFromVaccines()}
                      disabled={
                        submittingVaccines ||
                        vaccineOptions.length === 0 ||
                        selectedYesRecommendations.length === 0 ||
                        (isEditingGeneratedSchedule && !hasEditScheduleChanges)
                      }
                    >
                      {submittingVaccines ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Ionicons name="calendar-outline" size={18} color="#fff" />
                      )}
                      <Text className="text-sm font-bold text-white">
                        {t(isEditingGeneratedSchedule ? 'coreCare.updateVaccineSchedule' : 'coreCare.generateVaccineSchedule')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  {schedulePrimaryVaccineOptions.length === 0 ? (
                    <Text className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('coreCare.unsupportedVaccineSpecies')}</Text>
                  ) : null}
                  <View className="gap-3">
                    <DateField
                      label={t('coreCare.petBirthDate')}
                      value={petBirthDate}
                      placeholder={t('coreCare.selectDate')}
                      error={generatedScheduleErrors.birthDate}
                      maximumDate={today}
                      readOnly
                      onChange={() => {}}
                    />
                    {!petBirthDate ? (
                      <Text className="text-xs leading-4 text-amber-800">{t('coreCare.birthDateEditPetHint')}</Text>
                    ) : (
                      <Text className="text-xs leading-4 text-slate-500">{t('coreCare.birthDateLockedHint')}</Text>
                    )}
                    <VaccineSelect
                      label={t('coreCare.desiredVaccineType')}
                      value={desiredVaccineId}
                      options={schedulePrimaryVaccineOptions}
                      error={generatedScheduleErrors.desiredVaccineId}
                      onChange={selectDesiredVaccine}
                    />
                  </View>
                  <Text className="mt-3 text-xs leading-4 text-slate-500">{t('coreCare.desiredVaccineHint')}</Text>
                  <Text className="mt-3 text-sm leading-5 text-slate-700">{t('coreCare.generatedScheduleIntro')}</Text>
                  {petBirthDateIsFuture ? (
                    <Text className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('coreCare.birthDateFutureScheduleHint')}</Text>
                  ) : hasGeneratedSchedulePreview ? (
                    <View className="mt-3 gap-2">
                      {generatedRecommendations.length > 0 ? (
                        selectedGeneratedRecommendations.length > 0 ? (
                          visiblePendingRecommendations.map(renderRecommendationPreview)
                        ) : (
                          <Text className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                            {t('coreCare.allGeneratedSchedulesRemoved')}
                          </Text>
                        )
                      ) : (
                        <Text className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                          {t('coreCare.noGeneratedScheduleBody')}
                        </Text>
                      )}
                      {hiddenPendingRecommendationsCount > 0 ? (
                        <Pressable
                          testID="core-care-show-more-recommendations-button"
                          accessibilityRole="button"
                          className="self-center py-1 active:opacity-70"
                          onPress={() => setShowAllGeneratedRecommendations((current) => !current)}
                        >
                          <Text className="text-xs font-semibold text-blue-700">
                            {showAllGeneratedRecommendations
                              ? t('coreCare.showLessSchedules')
                              : t('coreCare.showMoreSchedules', { count: hiddenPendingRecommendationsCount })}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  <Text className="mt-3 text-xs leading-4 text-slate-500">{t('coreCare.generatedScheduleDisclaimer')}</Text>
                  {!hasGeneratedSchedulePreview ? (
                    <Pressable
                      testID="core-care-check-generated-schedule-button"
                      accessibilityRole="button"
                      className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                      onPress={checkGeneratedSchedule}
                      disabled={schedulePrimaryVaccineOptions.length === 0}
                    >
                      <Ionicons name="search-outline" size={18} color="#fff" />
                      <Text className="text-sm font-bold text-white">{t('coreCare.checkGeneratedSchedule')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      testID="core-care-generate-vaccine-schedule-button"
                      accessibilityRole="button"
                      className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                        submittingGeneratedSchedule ||
                        selectedGeneratedRecommendations.length === 0 ||
                        (isEditingGeneratedSchedule && !hasEditScheduleChanges)
                          ? 'opacity-60'
                          : ''
                      }`}
                      onPress={() => void createGeneratedSchedule()}
                      disabled={
                        submittingGeneratedSchedule ||
                        schedulePrimaryVaccineOptions.length === 0 ||
                        selectedGeneratedRecommendations.length === 0 ||
                        (isEditingGeneratedSchedule && !hasEditScheduleChanges)
                      }
                    >
                      {submittingGeneratedSchedule ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Ionicons name="calendar-outline" size={18} color="#fff" />
                      )}
                      <Text className="text-sm font-bold text-white">
                        {t(isEditingGeneratedSchedule ? 'coreCare.updateVaccineSchedule' : 'coreCare.generateVaccineSchedule')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          ) : null}
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('coreCare.manualEntryTitle')}</Text>
          <View className="mt-3 flex-row rounded-2xl border border-blue-100 bg-blue-50/40 p-1">
            {(['vaccine', 'reminder'] as ManualEntryType[]).map((type) => {
              const active = manualEntryType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
                    active ? 'bg-blue-600' : 'bg-transparent'
                  }`}
                  onPress={() => setManualEntryType(type)}
                >
                  <Ionicons name={typeIcon(type)} size={17} color={active ? '#fff' : PRIMARY} />
                  <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-blue-700'}`}>
                    {type === 'vaccine' ? t('coreCare.addVaccine') : t('coreCare.addReminder')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {manualEntryType === 'vaccine' ? (
            <View className="mt-4">
              <TextInput
                testID="core-care-vaccine-title-input"
                accessibilityLabel="Vaccine title"
                className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('coreCare.vaccineTitlePlaceholder')}
                value={vaccineTitle}
                onChangeText={setVaccineTitle}
              />
              <TextInput
                testID="core-care-vaccine-clinic-input"
                accessibilityLabel="Clinic or place"
                className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('coreCare.clinicPlaceholder')}
                value={vaccineClinic}
                onChangeText={setVaccineClinic}
              />
              <View className="mt-3">
                <DateField
                  label={t('coreCare.nextDoseDate')}
                  value={vaccineNextDueDate}
                  onChange={setVaccineNextDueDate}
                />
              </View>
              <TextInput
                testID="core-care-vaccine-note-input"
                accessibilityLabel="Vaccine note"
                className="mt-3 min-h-[88px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('coreCare.notePlaceholder')}
                multiline
                textAlignVertical="top"
                value={vaccineNote}
                onChangeText={setVaccineNote}
              />
              <Pressable
                testID="core-care-save-vaccine-button"
                accessibilityRole="button"
                className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                  submittingVaccine ? 'opacity-60' : ''
                }`}
                onPress={() => void saveVaccine()}
                disabled={submittingVaccine}
              >
                {submittingVaccine ? <ActivityIndicator color="#fff" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />}
                <Text className="text-sm font-bold text-white">{t('coreCare.saveVaccine')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-4">
              <TextInput
                testID="core-care-reminder-title-input"
                accessibilityLabel="Reminder title"
                className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('coreCare.reminderTitlePlaceholder')}
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />
              <View className="mt-3">
                <DateField
                  label={t('coreCare.dueDate')}
                  value={reminderDate}
                  onChange={setReminderDate}
                />
              </View>
              <TextInput
                testID="core-care-reminder-note-input"
                accessibilityLabel="Reminder note"
                className="mt-3 min-h-[88px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
                placeholder={t('coreCare.notePlaceholder')}
                multiline
                textAlignVertical="top"
                value={reminderNote}
                onChangeText={setReminderNote}
              />
              <Pressable
                testID="core-care-save-reminder-button"
                accessibilityRole="button"
                className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                  submittingReminder ? 'opacity-60' : ''
                }`}
                onPress={() => void saveReminder()}
                disabled={submittingReminder}
              >
                {submittingReminder ? <ActivityIndicator color="#fff" /> : <Ionicons name="alarm-outline" size={18} color="#fff" />}
                <Text className="text-sm font-bold text-white">{t('coreCare.saveReminder')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text className="mb-3 mt-6 text-base font-bold text-slate-900">{t('coreCare.timelineTitle')}</Text>
        {historyRecords.length === 0 ? (
          <View className="rounded-xl border border-gray-200 bg-white p-5">
            <Text className="text-center text-sm text-slate-500">{t('coreCare.emptyRecords')}</Text>
          </View>
        ) : (
          <View className="gap-3">{historyRecords.map((record) => renderRecordCard(record))}</View>
        )}

      </ScrollView>
    </View>
  );
}
