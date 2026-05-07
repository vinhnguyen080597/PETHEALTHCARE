import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type AnalysisProgressStage = 'uploading' | 'analyzing' | 'saving' | 'failed';

type AnalysisProgressScreenProps = {
  stage: AnalysisProgressStage;
  petName: string;
  message?: string;
};

function stageIndex(stage: AnalysisProgressStage): number {
  if (stage === 'uploading') return 0;
  if (stage === 'analyzing') return 1;
  return 2;
}

export function AnalysisProgressScreen({ stage, petName, message }: AnalysisProgressScreenProps) {
  const { t } = useTranslation();
  const current = stage === 'failed' ? 2 : stageIndex(stage);
  const labels = [
    t('analysisProgress.stages.uploading'),
    t('analysisProgress.stages.analyzing'),
    t('analysisProgress.stages.saving'),
  ];
  const failed = stage === 'failed';

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
        <Ionicons name="pulse" size={40} color="#2563eb" />
      </View>
      <Text className="text-center text-2xl font-bold text-slate-900">{t('analysisProgress.title')}</Text>
      <Text className="mt-2 text-center text-sm text-slate-500">
        {t('analysisProgress.subtitle', { name: petName })}
      </Text>

      <View className="mt-8 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5">
        <View className="mb-4">
          {failed ? (
            <Ionicons name="alert-circle-outline" size={36} color="#dc2626" />
          ) : (
            <ActivityIndicator size="large" color="#2563eb" />
          )}
        </View>
        <Text className={`mb-4 text-center text-base font-semibold ${failed ? 'text-red-700' : 'text-slate-800'}`}>
          {failed ? t('analysisProgress.failedTitle') : labels[current]}
        </Text>
        {failed ? (
          <Text className="mb-4 text-center text-sm text-red-600">
            {t('analysisProgress.failedBody')}
            {message ? `\n${message}` : ''}
          </Text>
        ) : null}

        <View className="mb-3 flex-row gap-2">
          {[0, 1, 2].map((idx) => (
            <View
              key={idx}
              className={`h-2 flex-1 rounded-full ${idx <= current ? 'bg-blue-600' : 'bg-slate-200'}`}
            />
          ))}
        </View>

        <View className="gap-2">
          {labels.map((label, idx) => (
            <Text key={label} className={`text-sm ${idx <= current ? 'text-slate-800' : 'text-slate-400'}`}>
              {idx + 1}. {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

