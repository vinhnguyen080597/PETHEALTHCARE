import { ScrollView, Text, View } from 'react-native';
import type { Analysis } from '../types';

type HistoryScreenProps = {
  history: Analysis[];
};

export function HistoryScreen({ history }: HistoryScreenProps) {
  return (
    <ScrollView className="flex-1 px-4 pt-4">
      <Text className="mb-4 text-lg font-semibold">Diagnostic History</Text>
      {history.length === 0 ? <Text className="text-slate-600">No history yet.</Text> : null}
      {history.map((item) => (
        <View key={item.id} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
          <Text className="font-semibold">{item.diagnosis}</Text>
          <Text className="text-slate-600">
            {item.severity.toUpperCase()} - {(item.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
