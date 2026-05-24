import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyFieldsFromAssessment, normalizeHealthAssessment } from '../src/services/healthAssessmentContract.js';

test('normalizeHealthAssessment maps clean AI schema to legacy-safe fields', () => {
  const assessment = normalizeHealthAssessment(
    {
      schema_version: 'health_assessment.v1',
      output_locale: 'en',
      status: 'ok',
      severity: 'low',
      confidence: 0.82,
      possible_finding: 'Possible mild skin irritation',
      observed_signs: ['Small red area'],
      visual_evidence: ['Localized redness in the photo'],
      missing_data: ['Duration of signs'],
      care_guidance: 'Monitor the area and contact a veterinarian if it spreads or worsens.',
      red_flags: [],
      next_action: { urgency: 'self_monitor', summary: 'Monitor at home', ask_user_to_add: ['Add a close-up photo'] },
      candidates: [{ name: 'Possible irritation', confidence: 0.72, rationale: 'Visible redness' }],
      safety: {
        is_definitive_diagnosis: false,
        contains_medication_dosage: false,
        requires_vet_attention: false,
        disclaimer:
          'This information is for reference only and does not replace diagnosis or treatment from a licensed veterinarian.',
      },
    },
    'en',
  );

  assert.equal(assessment.schema_version, 'health_assessment.v1');
  assert.equal(assessment.possible_finding, 'Possible mild skin irritation');
  assert.equal(assessment.next_action.urgency, 'self_monitor');

  const legacy = legacyFieldsFromAssessment(assessment);
  assert.equal(legacy.diagnosis, assessment.possible_finding);
  assert.deepEqual(legacy.symptoms, assessment.observed_signs);
  assert.equal(legacy.treatment, assessment.care_guidance);
});

test('normalizeHealthAssessment falls back when care guidance contains unsafe dosage', () => {
  const assessment = normalizeHealthAssessment(
    {
      status: 'ok',
      severity: 'low',
      confidence: 0.9,
      possible_finding: 'Possible pain',
      observed_signs: ['Limping'],
      care_guidance: 'Give ibuprofen 200mg and wait several days before seeing a vet.',
      next_action: { urgency: 'self_monitor', summary: 'Wait', ask_user_to_add: [] },
    },
    'en',
  );

  assert.equal(assessment.status, 'need_more_data');
  assert.equal(assessment.confidence, 0);
  assert.equal(assessment.safety.policy_fallback, true);
  assert.equal(assessment.safety.contains_medication_dosage, false);
  assert.match(assessment.care_guidance, /veterinarian/i);
});

test('normalizeHealthAssessment softens definitive Vietnamese finding', () => {
  const assessment = normalizeHealthAssessment(
    {
      status: 'ok',
      severity: 'medium',
      confidence: 0.7,
      diagnosis: 'chắc chắn mắc viêm da',
      symptoms: ['đỏ da'],
      treatment: 'Theo dõi và thăm khám thú y nếu dấu hiệu nặng hơn.',
    },
    'vi',
  );

  assert.match(assessment.possible_finding, /^Dấu hiệu có thể phù hợp với/);
  assert.equal(assessment.safety.is_definitive_diagnosis, false);
});
