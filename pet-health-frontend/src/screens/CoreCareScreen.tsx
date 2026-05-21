import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../i18n/localeDate';
import type {
  AiCreditAccount,
  CoreCareRecord,
  CoreCareRecordType,
  CoreCareSummary,
  CreateCoreCareRecordPayload,
  Pet,
} from '../types';

const PRIMARY = '#1E6FE8';

const RECORD_TYPES: CoreCareRecordType[] = ['diary', 'reminder', 'vet_visit', 'document'];

type CoreCareScreenProps = {
  pet: Pet;
  records: CoreCareRecord[];
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
  if (type === 'diary') return 'reader-outline' as const;
  if (type === 'reminder') return 'alarm-outline' as const;
  if (type === 'vet_visit') return 'medkit-outline' as const;
  return 'document-text-outline' as const;
}

function defaultTitle(type: CoreCareRecordType, t: (key: string) => string) {
  return t(`coreCare.typeDefaults.${type}`);
}

export function CoreCareScreen({
  pet,
  records,
  summary,
  refreshing,
  aiCredits,
  creditLedger,
  onBack,
  onRefresh,
  onCreateRecord,
  onMarkReminderDone,
  onClaimRewardedAd,
}: CoreCareScreenProps) {
  const { t, i18n } = useTranslation();
  const [selectedType, setSelectedType] = useState<CoreCareRecordType>('diary');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upcomingReminders = useMemo(
    () =>
      records
        .filter((record) => record.type === 'reminder' && record.status === 'pending')
        .sort((a, b) => String(a.due_at || a.occurred_at).localeCompare(String(b.due_at || b.occurred_at)))
        .slice(0, 3),
    [records],
  );

  const libraryCards = [
    { key: 'emergency', icon: 'warning-outline' as const },
    { key: 'vaccines', icon: 'shield-checkmark-outline' as const },
    { key: 'nutrition', icon: 'restaurant-outline' as const },
    { key: 'grooming', icon: 'cut-outline' as const },
  ];

  async function submit() {
    const cleanTitle = title.trim() || defaultTitle(selectedType, t);
    setSubmitting(true);
    try {
      await onCreateRecord({
        type: selectedType,
        title: cleanTitle,
        note: note.trim(),
        dueAt: selectedType === 'reminder' && dueAt.trim() ? dueAt.trim() : null,
        status: selectedType === 'reminder' ? 'pending' : 'active',
      });
      setTitle('');
      setNote('');
      setDueAt('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <View className="w-14">
          <Pressable className="rounded-lg p-2 active:bg-gray-100" onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('coreCare.title')}</Text>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Text className="text-lg font-bold text-slate-900">{t('coreCare.heroTitle', { name: pet.name })}</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-700">{t('coreCare.heroBody')}</Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          {[
            ['diary', summary?.diary ?? 0],
            ['reminders', summary?.pendingReminders ?? 0],
            ['documents', summary?.document ?? 0],
          ].map(([key, count]) => (
            <View key={String(key)} className="flex-1 rounded-xl border border-gray-200 bg-white p-3">
              <Text className="text-xs font-semibold uppercase text-slate-500">{t(`coreCare.stats.${key}`)}</Text>
              <Text className="mt-1 text-xl font-bold text-slate-900">{String(count)}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{t('coreCare.quickAdd')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {RECORD_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <Pressable
                  key={type}
                  className={`flex-row items-center gap-1 rounded-full border px-3 py-2 ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setSelectedType(type)}
                >
                  <Ionicons name={typeIcon(type)} size={15} color={active ? PRIMARY : '#64748b'} />
                  <Text className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-slate-600'}`}>
                    {t(`coreCare.types.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={defaultTitle(selectedType, t)}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            className="mt-3 min-h-[90px] rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
            placeholder={t('coreCare.notePlaceholder')}
            multiline
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
          />
          {selectedType === 'reminder' ? (
            <TextInput
              className="mt-3 rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-slate-900"
              placeholder={t('coreCare.duePlaceholder')}
              value={dueAt}
              onChangeText={setDueAt}
            />
          ) : null}
          <Pressable
            className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3 ${submitting ? 'opacity-60' : 'active:opacity-90'}`}
            style={{ backgroundColor: PRIMARY }}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={18} color="#fff" />}
            <Text className="text-sm font-bold text-white">{t('coreCare.saveRecord')}</Text>
          </Pressable>
        </View>

        <Text className="mb-3 mt-6 text-base font-bold text-slate-900">{t('coreCare.upcomingReminders')}</Text>
        {upcomingReminders.length === 0 ? (
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            <Text className="text-sm text-slate-500">{t('coreCare.noReminders')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {upcomingReminders.map((record) => (
              <View key={record.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <Text className="font-semibold text-slate-900">{record.title}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {record.due_at ? formatLocaleDateTime(record.due_at, i18n.language) : t('coreCare.noDueDate')}
                </Text>
                {record.note ? <Text className="mt-2 text-sm leading-5 text-slate-700">{record.note}</Text> : null}
                <Pressable className="mt-3 self-start rounded-full bg-emerald-50 px-3 py-1.5" onPress={() => onMarkReminderDone(record)}>
                  <Text className="text-xs font-bold text-emerald-700">{t('coreCare.markDone')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text className="mb-3 mt-6 text-base font-bold text-slate-900">{t('coreCare.libraryTitle')}</Text>
        <View className="gap-3">
          {libraryCards.map((card) => (
            <View key={card.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <Ionicons name={card.icon} size={20} color={PRIMARY} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-slate-900">{t(`coreCare.library.${card.key}.title`)}</Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-600">{t(`coreCare.library.${card.key}.body`)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-base font-bold text-amber-950">{t('coreCare.creditsTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-amber-900">
            {aiCredits
              ? t('coreCare.creditsBody', { credits: aiCredits.creditBalance })
              : t('coreCare.creditsUnavailable')}
          </Text>
          <Pressable className="mt-3 rounded-xl bg-white px-4 py-3 active:bg-amber-100" onPress={onClaimRewardedAd}>
            <Text className="text-center text-sm font-bold text-amber-900">{t('coreCare.claimAdCredit')}</Text>
          </Pressable>
          {creditLedger.length > 0 ? (
            <Text className="mt-3 text-xs text-amber-900">
              {t('coreCare.lastCreditEvent', { reason: String(creditLedger[0]?.reason ?? '-') })}
            </Text>
          ) : null}
        </View>

        <Text className="mb-3 mt-6 text-base font-bold text-slate-900">{t('coreCare.recentRecords')}</Text>
        {records.length === 0 ? (
          <View className="rounded-xl border border-gray-200 bg-white p-5">
            <Text className="text-center text-sm text-slate-500">{t('coreCare.emptyRecords')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {records.slice(0, 12).map((record) => (
              <View key={record.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start gap-3">
                  <Ionicons name={typeIcon(record.type)} size={20} color={PRIMARY} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-slate-900">{record.title}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {t(`coreCare.types.${record.type}`)} · {formatLocaleDateTime(record.occurred_at, i18n.language)}
                    </Text>
                    {record.note ? <Text className="mt-2 text-sm leading-5 text-slate-700">{record.note}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
