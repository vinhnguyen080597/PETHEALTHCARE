import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Analysis, Severity } from '../types';
import { analysisCareGuidance, analysisConfidence, analysisObservedSigns, analysisPossibleFinding, analysisSeverity, hasUnsafeAiOutput } from '../utils/analysisDisplay';
import { severityCardClass } from '../utils/severityStyles';

type ResultsScreenProps = {
  result: Analysis;
  imageUri: string | null;
  warnings: string[];
  onBackHome: () => void;
  /** First-time setup: show primary "Finish" to My Pets instead of a back-only chrome. */
  variant?: 'default' | 'onboarding';
  onFinish?: () => void;
};

function severityIcon(severity: Severity) {
  if (severity === 'high') return { name: 'warning-outline' as const, color: '#dc2626' };
  if (severity === 'medium') return { name: 'alert-circle-outline' as const, color: '#d97706' };
  return { name: 'checkmark-circle-outline' as const, color: '#059669' };
}

/** Matches `figma/code/src/app/components/ResultsScreen.tsx` structure. */
export function ResultsScreen({
  result,
  imageUri,
  warnings,
  onBackHome,
  variant = 'default',
  onFinish,
}: ResultsScreenProps) {
  const { t } = useTranslation();
  const assessment = result.assessment;
  const severity = analysisSeverity(result);
  const confidence = analysisConfidence(result);
  const unsafeOutput = hasUnsafeAiOutput(result);
  const possibleFinding = analysisPossibleFinding(result, t('results.safeFallbackFinding'));
  const observedSigns = analysisObservedSigns(result);
  const careGuidance = analysisCareGuidance(result, t('results.safeFallbackGuidance'));
  const disclaimer = assessment?.safety?.disclaimer ?? result.disclaimer;
  const fixedDisclaimer = t('results.fixedDisclaimer');
  const confPct = Math.round(confidence * 100);
  const icon = severityIcon(severity);
  const onboarding = variant === 'onboarding';
  const severityLabel = t(`severity.${severity}`);
  const status = assessment?.status ?? result.status ?? 'ok';
  const evidence = assessment?.visual_evidence?.filter(Boolean) ?? result.evidence?.filter(Boolean) ?? [];
  const missingData = assessment?.missing_data?.filter(Boolean) ?? result.missing_data?.filter(Boolean) ?? [];
  const nextActionSummary = unsafeOutput ? '' : assessment?.next_action?.summary?.trim() ?? result.next_action?.summary?.trim() ?? '';
  const nextActionAdd =
    unsafeOutput ? [] : assessment?.next_action?.ask_user_to_add?.filter(Boolean) ?? result.next_action?.ask_user_to_add?.filter(Boolean) ?? [];

  return (
    <View testID="results-screen" className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 border-b border-gray-200 bg-white px-4 py-4">
        {!onboarding ? (
          <Pressable
            testID="results-back-button"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="rounded-lg p-2 active:bg-gray-100"
            onPress={onBackHome}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-900">
            {onboarding ? t('results.petCheck') : t('results.analysisResults')}
          </Text>
          <Text className="text-sm text-gray-600">
            {onboarding ? t('results.onboardingSubtitle') : t('results.aiTriage')}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: onboarding ? 100 : 24 }}
      >
        {imageUri ? (
          <View className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <Image source={{ uri: imageUri }} className="h-48 w-full" resizeMode="cover" />
          </View>
        ) : null}

        <View className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <View className="flex-row items-start gap-3">
            <Ionicons name="warning-outline" size={20} color="#d97706" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="mb-1 text-sm font-semibold text-amber-900">{t('results.importantDisclaimer')}</Text>
              <Text className="text-xs leading-relaxed text-amber-800">{fixedDisclaimer}</Text>
              {unsafeOutput ? <Text className="mt-2 text-xs leading-relaxed text-amber-800">{t('results.safeFallbackNotice')}</Text> : null}
            </View>
          </View>
        </View>

        <View className={`mb-6 rounded-xl border-2 p-4 ${severityCardClass(severity)}`}>
          <View className="mb-2 flex-row items-center gap-3">
            <Ionicons name={icon.name} size={24} color={icon.color} />
            <View className="flex-1">
              <Text className="mb-0.5 text-xs font-semibold uppercase opacity-70">{t('results.possibleFinding')}</Text>
              <Text className="text-lg font-semibold capitalize">{possibleFinding}</Text>
              <Text className="text-sm opacity-80">{t('results.severity', { level: severityLabel })}</Text>
            </View>
          </View>
          <Text className="mb-1 text-sm opacity-75">{t('results.confidence')}</Text>
          <View className="flex-row items-center gap-3">
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-white/60">
              <View className="h-full rounded-full bg-blue-600" style={{ width: `${confPct}%` }} />
            </View>
            <Text className="text-sm font-medium">{confPct}%</Text>
          </View>
        </View>

        {status === 'emergency_flag' ? (
          <View className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <View className="flex-row items-start gap-3">
              <Ionicons name="warning" size={20} color="#b91c1c" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="mb-1 text-sm font-semibold text-red-900">{t('results.emergencyTitle')}</Text>
                <Text className="text-xs leading-relaxed text-red-800">{t('results.emergencyBody')}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {status === 'need_more_data' || status === 'not_pet_or_unclear' ? (
          <View className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <View className="flex-row items-start gap-3">
              <Ionicons name="information-circle-outline" size={20} color="#1d4ed8" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="mb-1 text-sm font-semibold text-blue-900">{t('results.needMoreDataTitle')}</Text>
                <Text className="text-xs leading-relaxed text-blue-800">{t('results.needMoreDataBody')}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {evidence.length > 0 ? (
          <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text className="mb-3 text-base font-semibold text-slate-900">{t('results.visualEvidence')}</Text>
            {evidence.map((item, index) => (
              <View key={`${item}-${index}`} className="mb-2 flex-row items-start gap-2">
                <View className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                <Text className="flex-1 text-sm leading-relaxed text-gray-700">{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {missingData.length > 0 ? (
          <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text className="mb-3 text-base font-semibold text-slate-900">{t('results.missingData')}</Text>
            {missingData.map((item, index) => (
              <View key={`${item}-${index}`} className="mb-2 flex-row items-start gap-2">
                <View className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                <Text className="flex-1 text-sm leading-relaxed text-gray-700">{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {nextActionSummary || nextActionAdd.length > 0 ? (
          <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <Text className="mb-3 text-base font-semibold text-slate-900">{t('results.nextAction')}</Text>
            {nextActionSummary ? <Text className="mb-2 text-sm leading-relaxed text-gray-700">{nextActionSummary}</Text> : null}
            {nextActionAdd.map((item, index) => (
              <View key={`${item}-${index}`} className="mb-2 flex-row items-start gap-2">
                <View className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                <Text className="flex-1 text-sm leading-relaxed text-gray-700">{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text className="mb-3 text-base font-semibold text-slate-900">{t('results.identifiedSymptoms')}</Text>
          {observedSigns.map((symptom, index) => (
            <View key={`${symptom}-${index}`} className="mb-2 flex-row items-start gap-2">
              <View className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
              <Text className="flex-1 text-sm leading-relaxed text-gray-700">{symptom}</Text>
            </View>
          ))}
        </View>

        <View className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Text className="mb-3 text-base font-semibold text-slate-900">{t('results.recommendedTreatment')}</Text>
          <Text className="text-sm leading-relaxed text-gray-700">{careGuidance}</Text>
        </View>

        {disclaimer && disclaimer !== fixedDisclaimer && !unsafeOutput ? (
        <View className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <View className="flex-row items-start gap-3">
            <Ionicons name="warning-outline" size={20} color="#d97706" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="mb-1 text-sm font-semibold text-amber-900">{t('results.importantDisclaimer')}</Text>
              <Text className="text-xs leading-relaxed text-amber-800">{disclaimer}</Text>
            </View>
          </View>
        </View>
        ) : null}

        {warnings.map((warning) => (
          <View key={warning} className="mb-2 flex-row gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
            <Ionicons name="alert-circle-outline" size={18} color="#b45309" />
            <Text className="flex-1 text-sm text-amber-900">{warning}</Text>
          </View>
        ))}
      </ScrollView>

      {onboarding && onFinish ? (
        <View className="border-t border-gray-200 bg-white px-5 py-4">
          <Pressable
            testID="results-finish-button"
            className="rounded-xl bg-blue-600 py-4 active:bg-blue-700"
            onPress={onFinish}
            accessibilityRole="button"
            accessibilityLabel="Finish and go to My Pets"
          >
            <Text className="text-center text-base font-bold text-white">{t('results.finish')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
