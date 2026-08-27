import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultWarrantyFormValues,
  formatDewormingDateLabel,
  toggleIdInList,
  warrantyFormToApiBody,
  warrantyPolicyToFormValues,
} from '../src/utils/warrantyPolicyForm.ts';
import { mapWarrantyPolicies, mapWarrantyPolicy } from '../src/utils/warrantyPolicy.ts';
import {
  resolveWarrantyFarmSpecies,
  warrantyInfectiousFieldKey,
  warrantyRapidTestEvidenceKey,
} from '../src/utils/warrantySpeciesCopy.ts';

test('mapWarrantyPolicy maps structured fields and skips invalid rows', () => {
  const policy = mapWarrantyPolicy({
    id: 'wp1',
    title: '14-day care',
    vaccine_shots_count: 2,
    vaccine_types: 'FVRCP',
    has_health_book: true,
    care_parvo_coverage_days: 14,
    medical_fee_support_percent: 50,
    buyer_guidelines: ['keep_farm_diet_3_5_days'],
    exclusions: ['accident_trauma'],
    evidence_required: ['symptom_video'],
    shipping_party: 'split',
    vet_requirement: 'licensed',
  });
  assert.ok(policy);
  assert.equal(policy?.id, 'wp1');
  assert.equal(policy?.title, '14-day care');
  assert.equal(policy?.vaccineShotsCount, 2);
  assert.equal(policy?.careParvoCoverageDays, 14);
  assert.equal(policy?.medicalFeeSupportPercent, 50);
  assert.deepEqual(policy?.buyerGuidelines, ['keep_farm_diet_3_5_days']);
  assert.equal(mapWarrantyPolicy({ id: 'x' }), null);
  assert.deepEqual(
    mapWarrantyPolicies([{ id: 'a', title: 'A' }, { id: '', title: 'B' }]).map((p) => p.id),
    ['a'],
  );
});

test('warranty form round-trips to API body', () => {
  const values = {
    ...defaultWarrantyFormValues(),
    title: ' Standard ',
    vaccineShotsCount: 3 as const,
    vaccineTypes: ' 5-in-1 ',
    medicalFeeSupportPercent: 100 as const,
  };
  const body = warrantyFormToApiBody(values);
  assert.equal(body.title, 'Standard');
  assert.equal(body.vaccine_shots_count, 3);
  assert.equal(body.vaccine_types, '5-in-1');
  assert.equal(body.medical_fee_support_percent, 100);
  assert.equal(body.has_health_book, true);

  const back = warrantyPolicyToFormValues({
    title: 'Standard',
    vaccineShotsCount: 3,
    vaccineTypes: '5-in-1',
    medicalFeeSupportPercent: 100,
    hasHealthBook: true,
    careParvoCoverageDays: 14,
    respiratorySkinCoverageDays: 3,
    congenitalCoverageDays: 30,
    reportWithinHours: 24,
    vetRequirement: 'licensed',
    buyerGuidelines: ['keep_farm_diet_3_5_days'],
    exclusions: ['accident_trauma'],
    allowEquivalentSwap: true,
    shippingParty: 'split',
    evidenceRequired: ['symptom_video'],
    breederResponseHours: 24,
    dewormingNote: '2026-01-15',
  });
  assert.equal(back.title, 'Standard');
  assert.equal(back.vaccineShotsCount, 3);
  assert.equal(back.medicalFeeSupportPercent, 100);
  assert.equal(formatDewormingDateLabel('2026-01-15'), '15-1-2026');
  assert.deepEqual(toggleIdInList(['a', 'b'], 'b'), ['a']);
  assert.deepEqual(toggleIdInList(['a'], 'c'), ['a', 'c']);
});

test('warranty species copy keys are nested-safe', () => {
  assert.equal(resolveWarrantyFarmSpecies({ primarySpecies: ['cat'] }), 'cat');
  assert.equal(resolveWarrantyFarmSpecies({ primarySpecies: ['dog', 'cat'] }), 'mixed');
  assert.equal(warrantyInfectiousFieldKey('mixed'), 'warranty.field.careParvo.mixed');
  assert.equal(warrantyRapidTestEvidenceKey('dog'), 'warranty.evidence.rapid_test_photo.dog');
});
