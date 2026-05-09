export type AnalyzeBlockReason = 'photos_required' | 'missing_session' | 'in_progress' | 'cooldown' | 'ok';
type AnalyzeLikeError = Error & { code?: string; retryAfterSeconds?: number };

export function getAnalyzeBlockReason(params: {
  hasPhotos: boolean;
  hasToken: boolean;
  hasSelectedPet: boolean;
  analysisSubmitting: boolean;
  analysisCooldownSeconds: number;
}): AnalyzeBlockReason {
  if (!params.hasPhotos) return 'photos_required';
  if (!params.hasToken || !params.hasSelectedPet) return 'missing_session';
  if (params.analysisSubmitting) return 'in_progress';
  if (params.analysisCooldownSeconds > 0) return 'cooldown';
  return 'ok';
}

export function mapAnalyzeFriendlyMessage(params: {
  error: unknown;
  analysisCooldownSeconds: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}): string {
  const { error, analysisCooldownSeconds, t } = params;
  let message = error instanceof Error ? error.message : t('common.unknownError');

  const analyzeError = error && typeof error === 'object' ? (error as AnalyzeLikeError) : null;
  if (analyzeError?.code) {
    if (analyzeError.code === 'ANALYSIS_COOLDOWN') {
      return t('alerts.analysisCooldownFriendly.message', {
        seconds: analyzeError.retryAfterSeconds ?? analysisCooldownSeconds,
      });
    }
    if (analyzeError.code === 'ANALYSIS_IN_PROGRESS') {
      return t('alerts.analysisInProgressFriendly.message');
    }
    if (analyzeError.code === 'ANALYSIS_RATE_LIMIT_HOUR' || analyzeError.code === 'ANALYSIS_RATE_LIMIT_DAY') {
      return t('alerts.analysisRateLimitFriendly.message', { seconds: analyzeError.retryAfterSeconds ?? 0 });
    }
    if (analyzeError.code === 'AI_MODEL_UNAVAILABLE') {
      return t('alerts.analysisModelUnavailableFriendly.message');
    }
    if (analyzeError.code === 'AI_QUOTA_EXCEEDED') {
      return t('alerts.analysisQuotaFriendly.message');
    }
    if (analyzeError.code === 'INTERNAL_ERROR') {
      return t('alerts.systemErrorFriendly.message');
    }
  }

  if (/models\/|not found.*generatecontent|NOT_FOUND/i.test(message)) {
    message = t('alerts.analysisModelUnavailableFriendly.message');
  }
  return message;
}

