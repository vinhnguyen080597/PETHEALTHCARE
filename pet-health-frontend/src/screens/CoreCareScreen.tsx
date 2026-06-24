import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaiScheduleSavingModal } from '../components/MaiScheduleSavingModal';
import { schedulePrimaryVaccineIdsForSpecies, vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { metadataText } from '../utils/carePassport';
import {
  type AdministeredVaccineDoseInput,
  calculateCoreCareSchedule,
  calculateNextVaccinationSchedule,
  type CoreCareNextVaccineRecommendation,
  type CoreCareScheduleRecommendation,
  normalizeManualVaccineId,
} from '../utils/coreCareSchedule';
import { resolvePetAgeMonths, parseBirthDateIso } from '../utils/petAge';
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
type VaccineDoseDraft = {
  id: string;
  vaccineId: string;
  administeredAt: Date | null;
};

type VaccineDoseDraftErrors = Record<string, { vaccineId?: string; administeredAt?: string }>;
type GeneratedScheduleErrors = {
  birthDate?: string;
  desiredVaccineId?: string;
};

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

function recordIcon(record: CoreCareRecord) {
  const generatedKind = generatedCareKind(record);
  if (generatedKind === 'vaccine') return 'shield-checkmark-outline' as const;
  if (generatedKind === 'deworming') return 'medkit-outline' as const;
  return typeIcon(record.type);
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

function isFelvVaccine(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'cat_felv' || normalized.includes('felv') || normalized.includes('bạch cầu');
}

function coreCareIntroGuideStorageKey(userId: string): string {
  return `${CORE_CARE_INTRO_GUIDE_STORAGE_KEY_PREFIX}:${userId}`;
}

function makeDoseDraft(): VaccineDoseDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    vaccineId: '',
    administeredAt: null,
  };
}

function DateField({
  label,
  value,
  placeholder,
  error,
  maximumDate,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: Date | null;
  placeholder?: string;
  error?: string;
  maximumDate?: Date;
  readOnly?: boolean;
  onChange: (value: Date) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const pickerValue = value ?? maximumDate ?? new Date();
  const displayValue = value
    ? new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(value)
    : null;

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (selectedDate) onChange(selectedDate);
    if (Platform.OS !== 'ios') setOpen(false);
  }

  return (
    <View className="flex-1">
      <Text className="mb-2 text-xs font-bold uppercase text-slate-500">{label}</Text>
      <Pressable
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
                value={pickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={maximumDate}
                onChange={handleChange}
              />
              {Platform.OS === 'ios' ? (
                <Pressable
                  className="mt-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                  onPress={() => {
                    if (!value) onChange(pickerValue);
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
  value: string;
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
  const [doseDrafts, setDoseDrafts] = useState<VaccineDoseDraft[]>(() => [makeDoseDraft()]);
  const [desiredVaccineId, setDesiredVaccineId] = useState('');
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
  const [scheduleSetupDismissed, setScheduleSetupDismissed] = useState(false);
  const [showIntroGuide, setShowIntroGuide] = useState(false);
  const [doseDraftErrors, setDoseDraftErrors] = useState<VaccineDoseDraftErrors>({});
  const [generatedScheduleErrors, setGeneratedScheduleErrors] = useState<GeneratedScheduleErrors>({});
  const [showAllUpcomingSchedules, setShowAllUpcomingSchedules] = useState(false);
  const [showAllGeneratedRecommendations, setShowAllGeneratedRecommendations] = useState(false);
  const [dismissedGeneratedRecommendationIds, setDismissedGeneratedRecommendationIds] = useState<string[]>([]);
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
        .sort((a, b) => occurredTimestamp(b) - occurredTimestamp(a))
        .slice(0, 10),
    [careRecords, allUpcomingRecords],
  );

  const nextRecord = allUpcomingRecords[0];
  const selectedDoseIds = doseDrafts.map((draft) => draft.vaccineId).filter(Boolean);
  const canAddDose = doseDrafts.length < vaccineOptions.length;
  const generatedRecommendations = useMemo(
    () =>
      petBirthDate && desiredVaccineId
        ? calculateCoreCareSchedule({ species: pet.species, birthDate: petBirthDate, today, selectedVaccineId: desiredVaccineId })
        : [],
    [petBirthDate, desiredVaccineId, pet.species, today],
  );
  const pendingGeneratedRecommendations = useMemo(
    () => generatedRecommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation)),
    [careRecords, generatedRecommendations],
  );
  const selectedGeneratedRecommendations = useMemo(
    () =>
      pendingGeneratedRecommendations.filter(
        (recommendation) => !dismissedGeneratedRecommendationIds.includes(recommendation.id),
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
  const nextVaccineRecommendations = useMemo(
    () =>
      calculateNextVaccinationSchedule({
        species: pet.species,
        petAgeMonths: resolvePetAgeMonths(pet),
        today,
        administeredDoses: [
          ...administeredVaccineDoses,
          ...doseDrafts
            .filter((draft) => draft.vaccineId && draft.administeredAt)
            .map((draft) => ({
              vaccineId: draft.vaccineId,
              administeredAt: draft.administeredAt!,
            })),
        ],
      }),
    [administeredVaccineDoses, doseDrafts, pet.age, pet.birth_date, pet.species, today],
  );
  const pendingNextVaccineRecommendations = useMemo(
    () => nextVaccineRecommendations.filter((recommendation) => !nextVaccineRecommendationRecordExists(careRecords, recommendation)),
    [careRecords, nextVaccineRecommendations],
  );
  const hasGeneratedSchedule = careRecords.some((record) =>
    Boolean(record.metadata?.generatedCoreCareScheduleId || record.metadata?.generatedCoreCareVaccineScheduleId),
  );
  const showScheduleSetup = !scheduleSetupDismissed && !hasGeneratedSchedule;

  function optionsForDose(draft: VaccineDoseDraft) {
    return vaccineOptions.filter((option) => option.id === draft.vaccineId || !selectedDoseIds.includes(option.id));
  }

  function updateDose(id: string, patch: Partial<VaccineDoseDraft>) {
    setDoseDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    setDoseDraftErrors((current) => {
      const next = { ...current };
      const currentError = next[id];
      if (!currentError) return current;

      const updatedError = { ...currentError };
      if ('vaccineId' in patch) delete updatedError.vaccineId;
      if ('administeredAt' in patch) delete updatedError.administeredAt;

      if (updatedError.vaccineId || updatedError.administeredAt) {
        next[id] = updatedError;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function selectDesiredVaccine(vaccineId: string) {
    setDesiredVaccineId(vaccineId);
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

  async function createScheduleFromVaccines() {
    const nextErrors: VaccineDoseDraftErrors = {};
    for (const draft of doseDrafts) {
      const draftErrors: { vaccineId?: string; administeredAt?: string } = {};
      if (!draft.vaccineId) draftErrors.vaccineId = t('coreCare.vaccineFieldRequired');
      if (!draft.administeredAt) {
        draftErrors.administeredAt = t('coreCare.administeredDateFieldRequired');
      } else if (startOfDay(draft.administeredAt).getTime() > today.getTime()) {
        draftErrors.administeredAt = t('coreCare.pastDateRequired');
      }
      if (draftErrors.vaccineId || draftErrors.administeredAt) nextErrors[draft.id] = draftErrors;
    }

    setDoseDraftErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (pendingNextVaccineRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      return;
    }

    setSubmittingVaccines(true);
    try {
      for (const draft of doseDrafts) {
        if (!draft.administeredAt) continue;
        const option = vaccineOptions.find((item) => item.id === draft.vaccineId);
        const label = option?.label ?? draft.vaccineId;
        const administeredAt = formatDateValue(draft.administeredAt);
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
      for (const recommendation of pendingNextVaccineRecommendations) {
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
      setDoseDrafts([makeDoseDraft()]);
      setScheduleSetupDismissed(true);
      Alert.alert(
        t('coreCare.scheduleGeneratedTitle'),
        t('coreCare.vaccineScheduleGeneratedBody', { count: pendingNextVaccineRecommendations.length }),
      );
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

  async function createGeneratedSchedule() {
    const nextErrors: GeneratedScheduleErrors = {
      birthDate: petBirthDate ? undefined : t('coreCare.birthDateEditPetHint'),
      desiredVaccineId: desiredVaccineId ? undefined : t('coreCare.desiredVaccineRequired'),
    };
    setGeneratedScheduleErrors(nextErrors);
    if (nextErrors.birthDate || nextErrors.desiredVaccineId) {
      return;
    }

    if (generatedRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }
    if (pendingGeneratedRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      return;
    }
    if (selectedGeneratedRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noSelectedGeneratedScheduleBody'));
      return;
    }

    setSubmittingGeneratedSchedule(true);
    try {
      for (const recommendation of selectedGeneratedRecommendations) {
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
        t('coreCare.scheduleGeneratedBody', { count: selectedGeneratedRecommendations.length }),
      );
      setDismissedGeneratedRecommendationIds([]);
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

  function renderRecordCard(record: CoreCareRecord, options?: { showDoneAction?: boolean }) {
    const clinicName = metadataText(record, 'clinic');
    const vaccineId = metadataText(record, 'vaccineId');
    const vaccineLabel = vaccineId ? t(`healthCheck.vaccines.${vaccineId}.label`) : '';
    const dueLabel = record.due_at ? formatDateOnly(record.due_at, i18n.language) : null;
    const dueDateTimeLabel = record.due_at ? formatLocaleDateTime(record.due_at, i18n.language) : null;
    const createdLabel = formatLocaleDateTime(record.occurred_at || record.created_at, i18n.language);
    const generatedKind = generatedCareKind(record);
    const typeLabel = generatedKind ? t(`coreCare.generatedKinds.${generatedKind}`) : t(`coreCare.types.${record.type}`);
    const isUpcoming = Boolean(options?.showDoneAction && dueLabel);
    const shouldShowNote = Boolean(record.note) && !isUpcoming;
    const shouldShowClinic = Boolean(clinicName) && !isUpcoming;
    const shouldShowDoneAction = Boolean(options?.showDoneAction && record.type === 'reminder' && !generatedKind);
    const targetDate = metadataText(record, 'targetDate');
    const targetDateLine = targetDate ? t('coreCare.targetScheduleLine', { date: formatLocaleDateTime(targetDate, i18n.language) }) : '';
    const isCatchUp = record.metadata?.isCatchUp === true;
    const upcomingScheduleLine = isCatchUp ? t('coreCare.catchUpScheduleLine') : targetDateLine;
    const displayTitle = isUpcoming ? record.title : vaccineLabel || record.title;

    return (
      <View
        key={record.id}
        testID={`core-care-record-${record.id}`}
        className={isUpcoming ? 'rounded-xl border border-blue-100 bg-white p-3' : 'rounded-2xl border border-gray-200 bg-white p-4'}
      >
        <View className="flex-row items-start gap-3">
          <View className={isUpcoming ? 'mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-blue-50' : 'h-10 w-10 items-center justify-center rounded-full bg-blue-50'}>
            <Ionicons name={recordIcon(record)} size={isUpcoming ? 16 : 20} color={PRIMARY} />
          </View>
          <View className="min-w-0 flex-1">
            {isUpcoming ? (
              <>
                <Text className="text-sm font-bold text-slate-900" numberOfLines={2}>
                  {displayTitle}
                </Text>
                <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
                  {typeLabel} {dueDateTimeLabel ? `· ${dueDateTimeLabel}` : ''}
                </Text>
                {upcomingScheduleLine ? <Text className="mt-1 text-xs leading-4 text-slate-500">{upcomingScheduleLine}</Text> : null}
              </>
            ) : (
              <>
                <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
                  {displayTitle}
                </Text>
                <Text className="mt-1 text-xs font-semibold uppercase text-slate-500">{typeLabel}</Text>
                {dueLabel ? <Text className="mt-2 text-sm font-semibold text-blue-700">{t('coreCare.dueLine', { date: dueLabel })}</Text> : null}
                {!dueLabel ? <Text className="mt-2 text-sm text-slate-500">{createdLabel}</Text> : null}
              </>
            )}
            {shouldShowClinic ? <Text className="mt-1 text-sm text-slate-600">{t('coreCare.clinicLine', { clinic: clinicName })}</Text> : null}
            {shouldShowNote ? <Text className="mt-2 text-sm leading-5 text-slate-700">{record.note}</Text> : null}
            {shouldShowDoneAction ? (
              <Pressable
                testID={`core-care-mark-reminder-done-${record.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Mark reminder ${record.title} done`}
                className="mt-3 self-start rounded-full bg-emerald-50 px-3 py-1.5 active:bg-emerald-100"
                onPress={() => onMarkReminderDone(record)}
              >
                <Text className="text-xs font-bold text-emerald-700">{t('coreCare.markDone')}</Text>
              </Pressable>
            ) : null}
          </View>
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
              <Ionicons name={recommendation.kind === 'vaccine' ? 'shield-checkmark-outline' : 'medkit-outline'} size={16} color={PRIMARY} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">{recommendationTitle(recommendation)}</Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-blue-700">
                {t(`coreCare.generatedKinds.${recommendation.kind}`)} · {formatLocaleDateTime(recommendation.dueDate, i18n.language)}
              </Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">
                {recommendation.isCatchUp ? t('coreCare.catchUpScheduleLine') : t('coreCare.targetScheduleLine', {
                  date: formatLocaleDateTime(recommendation.targetDate, i18n.language),
                })}
              </Text>
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
          <Text className="text-base font-bold text-slate-900">{t('coreCare.nextScheduleForPet', { name: pet.name })}</Text>
          {nextRecord?.due_at ? (
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
          )}
          {showScheduleSetup ? (
            <>
              <Text className="mt-5 text-sm font-bold text-slate-900">{t('coreCare.hasPetVaccinated', { name: pet.name })}</Text>
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
                        setVaccinatedAnswer(answer);
                        if (answer === 'yes') {
                          setGeneratedScheduleErrors({});
                        } else {
                          setDoseDraftErrors({});
                        }
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
                          <Text className="text-sm font-bold text-slate-900">{t('coreCare.vaccineDoseNumber', { count: index + 1 })}</Text>
                          {doseDrafts.length > 1 ? (
                            <Pressable
                              accessibilityRole="button"
                              className="rounded-full bg-white p-1.5"
                              onPress={() => {
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
                        <View className="flex-row gap-3">
                          <VaccineSelect
                            label={t('coreCare.vaccineType')}
                            value={draft.vaccineId}
                            options={optionsForDose(draft)}
                            error={doseDraftErrors[draft.id]?.vaccineId}
                            onChange={(vaccineId) => updateDose(draft.id, { vaccineId })}
                          />
                          <DateField
                            label={t('coreCare.administeredDate')}
                            value={draft.administeredAt}
                            placeholder={t('coreCare.selectDate')}
                            error={doseDraftErrors[draft.id]?.administeredAt}
                            maximumDate={today}
                            onChange={(administeredAt) => updateDose(draft.id, { administeredAt })}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canAddDose}
                    className={`mt-3 h-11 items-center justify-center rounded-xl border border-dashed ${
                      canAddDose ? 'border-blue-300 bg-blue-50 active:bg-blue-100' : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                    onPress={() => canAddDose && setDoseDrafts((current) => [...current, makeDoseDraft()])}
                  >
                    <Ionicons name="add" size={22} color={canAddDose ? PRIMARY : '#94a3b8'} />
                  </Pressable>
                  <Pressable
                    testID="core-care-save-vaccines-button"
                    accessibilityRole="button"
                    className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                      submittingVaccines ? 'opacity-60' : ''
                    }`}
                    onPress={() => void createScheduleFromVaccines()}
                    disabled={submittingVaccines || vaccineOptions.length === 0}
                  >
                    {submittingVaccines ? <ActivityIndicator color="#fff" /> : <Ionicons name="calendar-outline" size={18} color="#fff" />}
                    <Text className="text-sm font-bold text-white">{t('coreCare.createVaccineSchedule')}</Text>
                  </Pressable>
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
                  {pendingGeneratedRecommendations.length > 0 ? (
                    <View className="mt-3 gap-2">
                      {selectedGeneratedRecommendations.length > 0 ? (
                        visiblePendingRecommendations.map(renderRecommendationPreview)
                      ) : (
                        <Text className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                          {t('coreCare.allGeneratedSchedulesRemoved')}
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
                  <Pressable
                    testID="core-care-generate-vaccine-schedule-button"
                    accessibilityRole="button"
                    className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90 ${
                      submittingGeneratedSchedule ? 'opacity-60' : ''
                    }`}
                    onPress={() => void createGeneratedSchedule()}
                    disabled={submittingGeneratedSchedule || schedulePrimaryVaccineOptions.length === 0 || selectedGeneratedRecommendations.length === 0}
                  >
                    {submittingGeneratedSchedule ? null : <Ionicons name="calendar-outline" size={18} color="#fff" />}
                    <Text className="text-sm font-bold text-white">{t('coreCare.generateVaccineSchedule')}</Text>
                  </Pressable>
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
