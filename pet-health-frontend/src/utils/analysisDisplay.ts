import type { Analysis } from '../types';

type SafetyFlags = {
  is_definitive_diagnosis?: boolean;
  contains_medication_dosage?: boolean;
  policy_fallback?: boolean;
};

export function hasUnsafeAiOutput(analysis: Analysis): boolean {
  const safety = analysis.assessment?.safety as SafetyFlags | undefined;
  return Boolean(
    safety?.is_definitive_diagnosis ||
      safety?.contains_medication_dosage ||
      safety?.policy_fallback,
  );
}

export function analysisPossibleFinding(analysis: Analysis, fallback: string): string {
  if (hasUnsafeAiOutput(analysis)) return fallback;
  return analysis.assessment?.possible_finding?.trim() || analysis.diagnosis || fallback;
}

export function analysisObservedSigns(analysis: Analysis): string[] {
  return analysis.assessment?.observed_signs?.filter(Boolean) ?? analysis.symptoms ?? [];
}

export function analysisCareGuidance(analysis: Analysis, fallback: string): string {
  if (hasUnsafeAiOutput(analysis)) return fallback;
  return analysis.assessment?.care_guidance?.trim() || analysis.treatment || fallback;
}

export function analysisSeverity(analysis: Analysis) {
  return analysis.assessment?.severity ?? analysis.severity;
}

export function analysisConfidence(analysis: Analysis) {
  return analysis.assessment?.confidence ?? analysis.confidence;
}
