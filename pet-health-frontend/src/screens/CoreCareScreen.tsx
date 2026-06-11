import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { vaccineIdsForPetSpecies } from '../constants/petVaccineOptions';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { metadataText } from '../utils/carePassport';
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

function scheduleTimestamp(record: CoreCareRecord): number {
  const due = record.due_at ? new Date(record.due_at).getTime() : NaN;
  if (Number.isFinite(due)) return due;
  const occurred = new Date(record.occurred_at || record.created_at).getTime();
  return Number.isFinite(occurred) ? occurred : 0;
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
  const [submittingReminder, setSubmittingReminder] = useState(false);

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

  const latestVaccine = useMemo(
    () =>
      careRecords
        .filter((record) => record.type === 'vaccine')
        .sort((a, b) => scheduleTimestamp(b) - scheduleTimestamp(a))[0],
    [careRecords],
  );

  const upcomingRecords = useMemo(
    () =>
      careRecords
        .filter((record) => {
          if (!record.due_at || record.status === 'done') return false;
          return scheduleTimestamp(record) >= Date.now() - 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => scheduleTimestamp(a) - scheduleTimestamp(b))
        .slice(0, 5),
    [careRecords],
  );

  const historyRecords = useMemo(
    () =>
      careRecords
        .filter((record) => !upcomingRecords.some((upcoming) => upcoming.id === record.id))
        .sort((a, b) => scheduleTimestamp(b) - scheduleTimestamp(a))
        .slice(0, 10),
    [careRecords, upcomingRecords],
  );

  const nextRecord = upcomingRecords[0];
  const selectedDoseIds = doseDrafts.map((draft) => draft.vaccineId).filter(Boolean);
  const canAddDose = doseDrafts.length < vaccineOptions.length;

  function optionsForDose(draft: VaccineDoseDraft) {
    return vaccineOptions.filter((option) => option.id === draft.vaccineId || !selectedDoseIds.includes(option.id));
  }

  function updateDose(id: string, patch: Partial<VaccineDoseDraft>) {
    setDoseDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  async function saveVaccines() {
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
      setDoseDrafts([makeDoseDraft()]);
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
      await onCreateRecord({
        type: 'vaccine',
        title: cleanTitle,
        note: vaccineNote.trim(),
        dueAt: nextDueAt,
        status: 'active',
        metadata: {
          vaccineName: cleanTitle,
          nextDueAt,
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

  function createGeneratedSchedulePlaceholder() {
    Alert.alert(t('coreCare.scheduleComingSoonTitle'), t('coreCare.scheduleComingSoonBody'));
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
    const dueLabel = record.due_at ? formatLocaleDateTime(record.due_at, i18n.language) : null;
    const createdLabel = formatLocaleDateTime(record.occurred_at || record.created_at, i18n.language);

    return (
      <View key={record.id} testID={`core-care-record-${record.id}`} className="rounded-2xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Ionicons name={typeIcon(record.type)} size={20} color={PRIMARY} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-bold text-slate-900" numberOfLines={2}>
              {vaccineLabel || record.title}
            </Text>
            <Text className="mt-1 text-xs font-semibold uppercase text-slate-500">
              {t(`coreCare.types.${record.type}`)}
            </Text>
            {dueLabel ? <Text className="mt-2 text-sm font-semibold text-blue-700">{t('coreCare.dueLine', { date: dueLabel })}</Text> : null}
            {!dueLabel ? <Text className="mt-2 text-sm text-slate-500">{createdLabel}</Text> : null}
            {clinicName ? <Text className="mt-1 text-sm text-slate-600">{t('coreCare.clinicLine', { clinic: clinicName })}</Text> : null}
            {record.note ? <Text className="mt-2 text-sm leading-5 text-slate-700">{record.note}</Text> : null}
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
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            {nextRecord?.due_at
              ? t('coreCare.nextReminderLine', {
                  title: nextRecord.title,
                  date: formatLocaleDateTime(nextRecord.due_at, i18n.language),
                })
              : t('coreCare.noNextSchedule')}
          </Text>
          <View className="mt-3 rounded-xl bg-blue-50 p-3">
            <Text className="text-xs font-semibold text-blue-700">{t('coreCare.latestVaccine')}</Text>
            <Text className="mt-1 text-sm font-bold text-slate-900" numberOfLines={1}>
              {latestVaccine?.title ?? t('coreCare.notLogged')}
            </Text>
          </View>

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
                onPress={() => void saveVaccines()}
                disabled={submittingVaccines || vaccineOptions.length === 0}
              >
                {submittingVaccines ? <ActivityIndicator color="#fff" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />}
                <Text className="text-sm font-bold text-white">{t('coreCare.saveVaccines')}</Text>
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
              <Pressable
                testID="core-care-generate-vaccine-schedule-button"
                accessibilityRole="button"
                className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 active:opacity-90"
                onPress={createGeneratedSchedulePlaceholder}
              >
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text className="text-sm font-bold text-white">{t('coreCare.generateVaccineSchedule')}</Text>
              </Pressable>
            </View>
          )}
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

        <Text className="mb-3 mt-6 text-base font-bold text-slate-900">{t('coreCare.upcomingReminders')}</Text>
        {upcomingRecords.length === 0 ? (
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-sm text-slate-500">{t('coreCare.noReminders')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {upcomingRecords.map((record) => renderRecordCard(record, { showDoneAction: true }))}
          </View>
        )}

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
