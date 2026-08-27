import test from 'node:test';
import assert from 'node:assert/strict';
import {
  breedRecognitionErrorI18nKey,
  breedRecognitionErrorMessage,
} from '../src/utils/breedRecognitionErrors.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('maps duplicate image and credit codes to i18n keys', () => {
  assert.equal(
    breedRecognitionErrorI18nKey('AI_PAYLOAD_DUPLICATE_IMAGE'),
    'breedRecognition.errors.duplicateImage',
  );
  assert.equal(breedRecognitionErrorI18nKey('AI_CREDITS_EXHAUSTED'), 'alerts.aiCreditsExhaustedBreed.message');
  assert.equal(breedRecognitionErrorI18nKey('UNKNOWN'), null);
});

test('breedRecognitionErrorMessage prefers localized duplicate copy', () => {
  const err = Object.assign(new Error('Duplicate photos are not useful for AI analysis. Please upload different views.'), {
    code: 'AI_PAYLOAD_DUPLICATE_IMAGE',
  });
  assert.equal(
    breedRecognitionErrorMessage(err, (key) => key),
    'breedRecognition.errors.duplicateImage',
  );
});

test('breed recognition error copy exists EN/VI', () => {
  assert.match(en.breedRecognition.errors.duplicateImage, /Duplicate/i);
  assert.match(vi.breedRecognition.errors.duplicateImage, /trùng|khác nhau/i);
  assert.ok(en.breedRecognition.analyzeFailedTitle);
  assert.ok(vi.breedRecognition.analyzeFailedTitle);
});
