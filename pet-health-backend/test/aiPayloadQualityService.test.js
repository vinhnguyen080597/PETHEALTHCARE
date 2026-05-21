import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHealthAnalysisPayload,
  validateTranslationRequestPayload,
} from '../src/services/aiPayloadQualityService.js';

function jpegFile(label = 'photo.jpg', seed = 1) {
  const buffer = Buffer.alloc(256, seed);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  buffer[3] = 0xe0;
  buffer[254] = 0xff;
  buffer[255] = 0xd9;
  return {
    fieldname: label,
    originalname: label,
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
  };
}

test('validateHealthAnalysisPayload sanitizes owner context', () => {
  const result = validateHealthAnalysisPayload({
    body: {
      weightKg: ' 4,25 ',
      vaccinated: 'YES',
      vaccineType: '  core   vaccines ',
      neutered: ' no ',
      medicalHistory: '  cough\nfor two days ',
      symptomDescription: '  tired   and eating less ',
      locale: 'vi-VN',
    },
    primary: jpegFile('image', 1),
    extras: [jpegFile('extra', 2)],
  });

  assert.equal(result.outputLocale, 'vi');
  assert.equal(result.body.weightKg, '4.25');
  assert.equal(result.body.vaccinated, 'yes');
  assert.equal(result.body.medicalHistory, 'cough for two days');
  assert.equal(result.imageCount, 2);
});

test('validateHealthAnalysisPayload rejects spoofed image content', () => {
  assert.throws(
    () =>
      validateHealthAnalysisPayload({
        body: {},
        primary: {
          ...jpegFile('image', 1),
          buffer: Buffer.alloc(256, 1),
        },
      }),
    /content does not match/,
  );
});

test('validateTranslationRequestPayload rejects oversized batches', () => {
  assert.throws(
    () =>
      validateTranslationRequestPayload({
        targetLocale: 'vi',
        analysisIds: Array.from({ length: 25 }, (_, i) => `a${i}`),
      }),
    /Too many analysisIds/,
  );
});
