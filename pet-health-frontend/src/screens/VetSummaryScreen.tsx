import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../i18n/localeDate';
import { buildCarePassportStats, metadataNumber, metadataText } from '../utils/carePassport';
import { analysisPossibleFinding } from '../utils/analysisDisplay';
import type { Analysis, CoreCareRecord, Pet } from '../types';

const PRIMARY = '#1E6FE8';

type VetSummaryScreenProps = {
  pet: Pet;
  records: CoreCareRecord[];
  history: Analysis[];
  historyTotalCount?: number | null;
  onBack: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">{title}</Text>
      <View className="mt-3 gap-3">{children}</View>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <Text className="text-sm text-slate-500">{text}</Text>;
}

export function VetSummaryScreen({ pet, records, history, historyTotalCount = null, onBack }: VetSummaryScreenProps) {
  const { t, i18n } = useTranslation();
  const passport = buildCarePassportStats(records, history);
  const healthCheckCount = historyTotalCount ?? history.length;
  const vaccines = records.filter((record) => record.type === 'vaccine').slice(0, 6);
  const weights = records.filter((record) => record.type === 'weight').slice(0, 6);
  const vetVisits = records.filter((record) => record.type === 'vet_visit').slice(0, 5);
  const documents = records.filter((record) => record.type === 'document').slice(0, 5);

  return (
    <View testID="vet-summary-screen" className="flex-1 bg-[#F2F4F8]">
      <View className="flex-row items-center border-b border-gray-200 bg-white px-2 py-2">
        <View className="w-14">
          <Pressable
            testID="vet-summary-back-button"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="rounded-lg p-2 active:bg-gray-100"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-lg font-semibold text-slate-900">{t('vetSummary.title')}</Text>
        <View className="w-14" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl bg-blue-600 p-5">
          <Text className="text-xs font-bold uppercase tracking-wide text-blue-100">{t('vetSummary.eyebrow')}</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{pet.name}</Text>
          <Text className="mt-2 text-sm leading-5 text-blue-50">
            {t('vetSummary.heroBody', {
              species: pet.species,
              breed: pet.breed || t('vetSummary.unknown'),
              age: pet.age ?? t('vetSummary.unknown'),
            })}
          </Text>
        </View>

        <Section title={t('vetSummary.overview')}>
          <Text className="text-sm text-slate-700">{t('vetSummary.pendingReminders', { count: passport.pendingReminders.length })}</Text>
          <Text className="text-sm text-slate-700">{t('vetSummary.healthChecks', { count: healthCheckCount })}</Text>
          <Text className="text-sm text-slate-700">
            {t('vetSummary.latestWeight', {
              value: passport.latestWeight ? metadataNumber(passport.latestWeight, 'weightKg') ?? '-' : '-',
            })}
          </Text>
        </Section>

        <Section title={t('vetSummary.vaccines')}>
          {vaccines.length === 0 ? <EmptyLine text={t('vetSummary.emptyVaccines')} /> : null}
          {vaccines.map((record) => (
            <Text key={record.id} className="text-sm leading-5 text-slate-700">
              {record.title} · {formatLocaleDateTime(record.occurred_at, i18n.language)}
              {record.due_at ? ` · ${t('vetSummary.nextDue', { date: formatLocaleDateTime(record.due_at, i18n.language) })}` : ''}
            </Text>
          ))}
        </Section>

        <Section title={t('vetSummary.weight')}>
          {weights.length === 0 ? <EmptyLine text={t('vetSummary.emptyWeight')} /> : null}
          {weights.map((record) => (
            <Text key={record.id} className="text-sm leading-5 text-slate-700">
              {metadataNumber(record, 'weightKg') ?? '-'} kg · {formatLocaleDateTime(record.occurred_at, i18n.language)}
            </Text>
          ))}
        </Section>

        <Section title={t('vetSummary.visitsAndDocs')}>
          {vetVisits.length === 0 && documents.length === 0 ? <EmptyLine text={t('vetSummary.emptyVisits')} /> : null}
          {[...vetVisits, ...documents].map((record) => (
            <Text key={record.id} className="text-sm leading-5 text-slate-700">
              {record.title} · {formatLocaleDateTime(record.occurred_at, i18n.language)}
              {metadataText(record, 'clinic') ? ` · ${metadataText(record, 'clinic')}` : ''}
            </Text>
          ))}
        </Section>

        <Section title={t('vetSummary.recentAiChecks')}>
          {history.length === 0 ? <EmptyLine text={t('vetSummary.emptyAiChecks')} /> : null}
          {history.slice(0, 5).map((item) => (
            <Text key={item.id} className="text-sm leading-5 text-slate-700">
              {analysisPossibleFinding(item, t('results.safeFallbackFinding'))} · {formatLocaleDateTime(item.created_at, i18n.language)}
            </Text>
          ))}
        </Section>

        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm leading-5 text-amber-900">{t('vetSummary.disclaimer')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
