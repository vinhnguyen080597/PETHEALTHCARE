import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { Analysis } from '../types';
import { severityCardClass } from '../utils/severityStyles';

type ResultsScreenProps = {
  result: Analysis;
  imageUri: string | null;
  warnings: string[];
  onBackHome: () => void;
};

export function ResultsScreen({ result, imageUri, warnings, onBackHome }: ResultsScreenProps) {
  return (
    <ScrollView className="flex-1 bg-slate-50 px-4 pt-4">
      <Pressable className="mb-4 self-start rounded-lg border border-slate-300 bg-white px-3 py-2" onPress={onBackHome}>
        <Text>Back to Home</Text>
      </Pressable>
      {imageUri ? <Image source={{ uri: imageUri }} className="mb-4 h-52 w-full rounded-xl" resizeMode="cover" /> : null}
      <View className={`mb-4 rounded-xl border p-4 ${severityCardClass(result.severity)}`}>
        <Text className="text-lg font-semibold">{result.diagnosis}</Text>
        <Text className="mt-1">Severity: {result.severity}</Text>
        <Text className="mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</Text>
      </View>
      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="mb-2 font-semibold">Symptoms</Text>
        {result.symptoms.map((symptom, index) => (
          <Text key={`${symptom}-${index}`} className="text-slate-700">
            - {symptom}
          </Text>
        ))}
      </View>
      <View className="mb-4 rounded-xl bg-white p-4">
        <Text className="mb-2 font-semibold">Recommended Treatment</Text>
        <Text className="text-slate-700">{result.treatment}</Text>
      </View>
      <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Text className="font-semibold text-amber-800">Disclaimer</Text>
        <Text className="mt-1 text-amber-700">{result.disclaimer}</Text>
      </View>
      {warnings.map((warning) => (
        <Text key={warning} className="mb-2 text-sm text-amber-700">
          Warning: {warning}
        </Text>
      ))}
    </ScrollView>
  );
}
