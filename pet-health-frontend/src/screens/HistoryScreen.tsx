import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatLocaleDateTime } from '../i18n/localeDate';
import type { Analysis, Severity } from '../types';

type HistoryScreenProps = {
  history: Analysis[];
  onSelectEntry: (entry: Analysis) => void;
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

/** List layout inspired by `figma/code/src/app/components/HistoryScreen.tsx`. */
export function HistoryScreen({ history, onSelectEntry }: HistoryScreenProps) {
  const { t, i18n } = useTranslation();
  return (
    <View className="flex-1 bg-gray-50">
      <View className="border-b border-gray-200 bg-white px-4 py-4">
        <Text className="text-lg font-semibold text-slate-900">{t('history.title')}</Text>
        <Text className="text-sm text-gray-600">{t('history.subtitle')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {history.length === 0 ? (
          <Text className="py-8 text-center text-gray-600">{t('history.empty')}</Text>
        ) : (
          history.map((item) => (
            <Pressable
              key={item.id}
              className="mb-3 flex-row gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
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
          ))
        )}
      </ScrollView>
    </View>
  );
}
