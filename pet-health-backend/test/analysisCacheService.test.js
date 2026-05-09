import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysisCacheKey, getCachedAnalysis, setCachedAnalysis } from '../src/services/analysisCacheService.js';

function mockFile(content) {
  return { buffer: Buffer.from(content), mimetype: 'image/jpeg', size: Buffer.byteLength(content) };
}

test('buildAnalysisCacheKey changes when locale changes', () => {
  const common = {
    userId: 'u1',
    petId: 'p1',
    primary: mockFile('same-image'),
    extras: [],
    video: null,
  };

  const enKey = buildAnalysisCacheKey({
    ...common,
    body: { locale: 'en', symptomDescription: 'itchy ear' },
  });
  const viKey = buildAnalysisCacheKey({
    ...common,
    body: { locale: 'vi', symptomDescription: 'itchy ear' },
  });

  assert.notEqual(enKey, viKey);
});

test('cache stores and returns analysis payload', () => {
  const key = `test:${Date.now()}`;
  const payload = { diagnosis: 'ok', severity: 'low' };
  setCachedAnalysis(key, payload);

  const hit = getCachedAnalysis(key);
  assert.ok(hit);
  assert.deepEqual(hit.analysis, payload);
  assert.equal(typeof hit.ageMs, 'number');
});

