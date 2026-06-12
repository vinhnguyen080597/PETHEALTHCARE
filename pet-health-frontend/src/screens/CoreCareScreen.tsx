import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { metadataText } from '../utils/carePassport';
import {
  type AdministeredVaccineDoseInput,
  calculateCoreCareSchedule,
  calculateNextVaccinationSchedule,
  type CoreCareNextVaccineRecommendation,
  type CoreCareScheduleRecommendation,
} from '../utils/coreCareSchedule';
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

const GUIDELINE_REFERENCES = [
  {
    id: 'wsava2024',
    url: 'https://wsava.org/wp-content/uploads/2024/05/2024-Guidelines-for-the-Vaccination-of-Dogs-and-Cats.pdf',
  },
  {
    id: 'aahaCanine2022',
    url: 'https://www.aaha.org/resources/2022-aaha-canine-vaccination-guidelines/recommendations-for-core-and-noncore-canine-vaccines/',
  },
  {
    id: 'aahaAafpFeline2020',
    url: 'https://journals.sagepub.com/doi/full/10.1177/1098612X20941784',
  },
  {
    id: 'troccap',
    url: 'https://www.troccap.com/canine-guidelines/general-considerations-canine/',
  },
  {
    id: 'capc',
    url: 'https://www.petsandparasites.org/resources/capc-guidelines',
  },
] as const;

type VaccinatedAnswer = 'yes' | 'no';
type ManualEntryType = 'vaccine' | 'reminder';
type VaccineDoseDraft = {
  id: string;
  vaccineId: string;
  administeredAt: Date;
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

function makeDoseDraft(): VaccineDoseDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    vaccineId: '',
    administeredAt: new Date(),
  };
}

function DateField({
  label,
  value,
  maximumDate,
  onChange,
}: {
  label: string;
  value: Date;
  maximumDate?: Date;
  onChange: (value: Date) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
        className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 active:bg-slate-100"
        onPress={() => setOpen(true)}
      >
        <Text className="text-sm font-semibold text-slate-900">{formatDateValue(value)}</Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setOpen(false)} />
          <View className="rounded-t-3xl bg-white px-4 pb-8 pt-3">
            <View className="mb-3 self-center rounded-full bg-gray-200 px-10 py-1" />
            <Text className="mb-2 text-center text-base font-bold text-slate-900">{label}</Text>
            <DateTimePicker
              value={value}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maximumDate}
              onChange={handleChange}
            />
            {Platform.OS === 'ios' ? (
              <Pressable className="mt-2 rounded-xl bg-blue-600 py-3 active:opacity-90" onPress={() => setOpen(false)}>
                <Text className="text-center text-sm font-bold text-white">{t('common.done')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VaccineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
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
        className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 active:bg-slate-100"
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
    </View>
  );
}

export function CoreCareScreen({
  pet,
  records,
  refreshing,
  onBack,
  onRefresh,
  onCreateRecord,
  onMarkReminderDone,
}: CoreCareScreenProps) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [vaccinatedAnswer, setVaccinatedAnswer] = useState<VaccinatedAnswer>('yes');
  const [manualEntryType, setManualEntryType] = useState<ManualEntryType>('vaccine');
  const [doseDrafts, setDoseDrafts] = useState<VaccineDoseDraft[]>(() => [makeDoseDraft()]);
  const [birthDate, setBirthDate] = useState<Date>(today);
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

  const vaccineOptions = useMemo(
    () =>
      (vaccineIdsForPetSpecies(pet.species) ?? []).map((id) => ({
        id,
        label: t(`healthCheck.vaccines.${id}.label`),
      })),
    [pet.species, t],
  );

  const careRecords = useMemo(
    () => records.filter((record) => record.type === 'vaccine' || record.type === 'reminder'),
    [records],
  );

  const upcomingRecords = useMemo(
    () =>
      careRecords
        .filter(isPendingScheduleRecord)
        .sort((a, b) => scheduleTimestamp(a) - scheduleTimestamp(b))
        .slice(0, 5),
    [careRecords],
  );
  const historyRecords = useMemo(
    () =>
      careRecords
        .filter((record) => !upcomingRecords.some((upcoming) => upcoming.id === record.id))
        .sort((a, b) => occurredTimestamp(b) - occurredTimestamp(a))
        .slice(0, 10),
    [careRecords, upcomingRecords],
  );

  const nextRecord = upcomingRecords[0];
  const selectedDoseIds = doseDrafts.map((draft) => draft.vaccineId).filter(Boolean);
  const canAddDose = doseDrafts.length < vaccineOptions.length;
  const generatedRecommendations = useMemo(
    () => calculateCoreCareSchedule({ species: pet.species, birthDate, today }),
    [birthDate, pet.species, today],
  );
  const pendingGeneratedRecommendations = useMemo(
    () => generatedRecommendations.filter((recommendation) => !recommendationRecordExists(careRecords, recommendation)),
    [careRecords, generatedRecommendations],
  );
  const administeredVaccineDoses = useMemo(
    () =>
      careRecords
        .filter((record) => record.type === 'vaccine')
        .map((record): AdministeredVaccineDoseInput | null => {
          const vaccineId = metadataText(record, 'vaccineId');
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
        petAgeMonths: pet.age,
        today,
        administeredDoses: [
          ...administeredVaccineDoses,
          ...doseDrafts
            .filter((draft) => draft.vaccineId)
            .map((draft) => ({
              vaccineId: draft.vaccineId,
              administeredAt: draft.administeredAt,
            })),
        ],
      }),
    [administeredVaccineDoses, doseDrafts, pet.age, pet.species, today],
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
  }

  function nextVaccineRecommendationTitle(recommendation: CoreCareNextVaccineRecommendation): string {
    const label = vaccineOptions.find((option) => option.id === recommendation.vaccineId)?.label ?? recommendation.vaccineId;
    return t('coreCare.nextVaccineReminderTitle', { vaccine: label, dose: recommendation.doseNumber });
  }

  function nextVaccineRecommendationNote(recommendation: CoreCareNextVaccineRecommendation): string {
    return t('coreCare.generatedNextVaccineScheduleNote', {
      administeredAt: formatLocaleDateTime(recommendation.administeredAt, i18n.language),
      targetDate: formatLocaleDateTime(recommendation.targetDate, i18n.language),
      source: recommendation.sourceLabel,
      months: recommendation.horizonMonths,
    });
  }

  async function createScheduleFromVaccines() {
    const missing = doseDrafts.some((draft) => !draft.vaccineId);
    if (missing) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.vaccineRequired'));
      return;
    }
    const hasFutureDate = doseDrafts.some((draft) => startOfDay(draft.administeredAt).getTime() > today.getTime());
    if (hasFutureDate) {
      Alert.alert(t('alerts.missingData.title'), t('coreCare.pastDateRequired'));
      return;
    }
    if (pendingNextVaccineRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      return;
    }

    setSubmittingVaccines(true);
    try {
      for (const draft of doseDrafts) {
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
        note: t('coreCare.manualNextVaccineReminderNote', {
          targetDate: formatLocaleDateTime(nextDueAt, i18n.language),
        }),
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
    return t(`coreCare.generatedRules.${recommendation.family}.title`, { dose: recommendation.doseNumber });
  }

  function recommendationNote(recommendation: CoreCareScheduleRecommendation): string {
    return t('coreCare.generatedScheduleNote', {
      targetDate: formatLocaleDateTime(recommendation.targetDate, i18n.language),
      source: recommendation.sourceLabel,
    });
  }

  async function createGeneratedSchedule() {
    if (generatedRecommendations.length === 0) {
      Alert.alert(t('coreCare.noGeneratedScheduleTitle'), t('coreCare.noGeneratedScheduleBody'));
      return;
    }
    if (pendingGeneratedRecommendations.length === 0) {
      Alert.alert(t('coreCare.scheduleAlreadyGeneratedTitle'), t('coreCare.scheduleAlreadyGeneratedBody'));
      return;
    }

    setSubmittingGeneratedSchedule(true);
    try {
      for (const recommendation of pendingGeneratedRecommendations) {
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
        t('coreCare.scheduleGeneratedBody', { count: pendingGeneratedRecommendations.length }),
      );
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
    const createdLabel = formatLocaleDateTime(record.occurred_at || record.created_at, i18n.language);
    const generatedKind = generatedCareKind(record);
    const typeLabel = generatedKind ? t(`coreCare.generatedKinds.${generatedKind}`) : t(`coreCare.types.${record.type}`);
    const shouldShowNote = Boolean(record.note) && !(options?.showDoneAction && generatedKind === 'vaccine');
    const isUpcoming = Boolean(options?.showDoneAction && dueLabel);

    return (
      <View key={record.id} testID={`core-care-record-${record.id}`} className="rounded-2xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Ionicons name={recordIcon(record)} size={20} color={PRIMARY} />
          </View>
          <View className="min-w-0 flex-1">
            {isUpcoming ? (
              <>
                <Text className="text-lg font-extrabold text-blue-700">{dueLabel}</Text>
                <Text className="mt-2 text-sm font-semibold uppercase text-slate-500">{typeLabel}</Text>
                <Text className="mt-1 text-base font-bold text-slate-900" numberOfLines={2}>
                  {vaccineLabel || record.title}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
                  {vaccineLabel || record.title}
                </Text>
                <Text className="mt-1 text-xs font-semibold uppercase text-slate-500">{typeLabel}</Text>
                {dueLabel ? <Text className="mt-2 text-sm font-semibold text-blue-700">{t('coreCare.dueLine', { date: dueLabel })}</Text> : null}
                {!dueLabel ? <Text className="mt-2 text-sm text-slate-500">{createdLabel}</Text> : null}
              </>
            )}
            {clinicName ? <Text className="mt-1 text-sm text-slate-600">{t('coreCare.clinicLine', { clinic: clinicName })}</Text> : null}
            {shouldShowNote ? <Text className="mt-2 text-sm leading-5 text-slate-700">{record.note}</Text> : null}
            {options?.showDoneAction && record.type === 'reminder' ? (
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
        <View className="flex-row items-start gap-2">
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
      </View>
    );
  }

  return (
    <View testID="core-care-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
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
              {upcomingRecords.map((record) => renderRecordCard(record, { showDoneAction: true }))}
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
                      onPress={() => setVaccinatedAnswer(answer)}
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
                              onPress={() => setDoseDrafts((current) => current.filter((item) => item.id !== draft.id))}
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
                            onChange={(vaccineId) => updateDose(draft.id, { vaccineId })}
                          />
                          <DateField
                            label={t('coreCare.administeredDate')}
                            value={draft.administeredAt}
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
                  <DateField
                    label={t('coreCare.petBirthDate')}
                    value={birthDate}
                    maximumDate={today}
                    onChange={setBirthDate}
                  />
                  <Text className="mt-3 text-sm leading-5 text-slate-700">{t('coreCare.generatedScheduleIntro')}</Text>
                  {pendingGeneratedRecommendations.length > 0 ? (
                    <View className="mt-3 gap-2">
                      {pendingGeneratedRecommendations.slice(0, 5).map(renderRecommendationPreview)}
                      {pendingGeneratedRecommendations.length > 5 ? (
                        <Text className="text-center text-xs font-semibold text-blue-700">
                          {t('coreCare.moreGeneratedRecommendations', { count: pendingGeneratedRecommendations.length - 5 })}
                        </Text>
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
                    disabled={submittingGeneratedSchedule}
                  >
                    {submittingGeneratedSchedule ? <ActivityIndicator color="#fff" /> : <Ionicons name="calendar-outline" size={18} color="#fff" />}
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

        <View className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('coreCare.guidelinesTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">{t('coreCare.guidelinesBody')}</Text>
          <View className="mt-3 gap-2">
            {GUIDELINE_REFERENCES.map((reference) => (
              <Pressable
                key={reference.id}
                accessibilityRole="link"
                className="flex-row items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 active:bg-blue-50"
                onPress={() => void Linking.openURL(reference.url)}
              >
                <Ionicons name="open-outline" size={16} color={PRIMARY} />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-900">{t(`coreCare.guidelines.${reference.id}.title`)}</Text>
                  <Text className="mt-1 text-xs leading-4 text-slate-500">{t(`coreCare.guidelines.${reference.id}.body`)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
