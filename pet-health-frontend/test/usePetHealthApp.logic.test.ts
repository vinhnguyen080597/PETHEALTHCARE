import test from 'node:test';
import assert from 'node:assert/strict';
import { getAnalyzeBlockReason, mapAnalyzeFriendlyMessage } from '../src/hooks/usePetHealthApp.logic.ts';

function t(key: string, options?: Record<string, unknown>) {
  if (options && typeof options.seconds === 'number') {
    return `${key}:${options.seconds}`;
  }
  return key;
}

test('getAnalyzeBlockReason returns expected priority', () => {
  assert.equal(
    getAnalyzeBlockReason({
      hasPhotos: false,
      hasToken: true,
      hasSelectedPet: true,
      analysisSubmitting: false,
      analysisCooldownSeconds: 0,
    }),
    'photos_required',
  );

  assert.equal(
    getAnalyzeBlockReason({
      hasPhotos: true,
      hasToken: false,
      hasSelectedPet: true,
      analysisSubmitting: false,
      analysisCooldownSeconds: 0,
    }),
    'missing_session',
  );

  assert.equal(
    getAnalyzeBlockReason({
      hasPhotos: true,
      hasToken: true,
      hasSelectedPet: true,
      analysisSubmitting: true,
      analysisCooldownSeconds: 10,
    }),
    'in_progress',
  );
});

test('mapAnalyzeFriendlyMessage maps AnalyzeRequestError codes', () => {
  const err = Object.assign(new Error('backend'), {
    code: 'ANALYSIS_RATE_LIMIT_DAY',
    retryAfterSeconds: 42,
  });

  const msg = mapAnalyzeFriendlyMessage({
    error: err,
    analysisCooldownSeconds: 0,
    t,
  });

  assert.equal(msg, 'alerts.analysisRateLimitFriendly.message:42');
});

test('mapAnalyzeFriendlyMessage maps model-not-found raw text fallback', () => {
  const msg = mapAnalyzeFriendlyMessage({
    error: new Error('models/gemini-x not found in generateContent'),
    analysisCooldownSeconds: 0,
    t,
  });

  assert.equal(msg, 'alerts.analysisModelUnavailableFriendly.message');
});

