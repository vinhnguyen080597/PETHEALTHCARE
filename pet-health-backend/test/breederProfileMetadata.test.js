import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeBreederProfileMetadata,
  sanitizeBreederProfileMetadata,
  verificationStatusAfterProfileSave,
} from '../src/utils/breederProfileMetadata.js';

test('sanitizeBreederProfileMetadata removes deprecated breeder form keys', () => {
  assert.deepEqual(
    sanitizeBreederProfileMetadata({
      breederType: 'home_breeder',
      scaleRange: '1_3',
      breedingPetRange: 'none',
      careChecklist: ['vaccination_schedule'],
      transparencyCommitments: ['accurate_information'],
    }),
    {
      breederType: 'home_breeder',
      transparencyCommitments: ['accurate_information'],
    },
  );
});

test('verificationStatusAfterProfileSave keeps verified kennels published', () => {
  assert.equal(verificationStatusAfterProfileSave('verified'), 'verified');
  assert.equal(verificationStatusAfterProfileSave('suspended'), 'suspended');
  assert.equal(verificationStatusAfterProfileSave('pending_review'), 'pending_review');
  assert.equal(verificationStatusAfterProfileSave('unverified'), 'pending_review');
  assert.equal(verificationStatusAfterProfileSave('rejected'), 'pending_review');
  assert.equal(verificationStatusAfterProfileSave(''), 'pending_review');
});

test('mergeBreederProfileMetadata keeps trust awards when form omits them', () => {
  const merged = mergeBreederProfileMetadata(
    {
      social_facebook_trust_awarded: true,
      warranty_policy_trust_awarded: true,
      verified_base_trust_awarded: true,
      cover_url: 'https://cdn.example/cover.jpg',
      scaleRange: '1_3',
    },
    {
      breederType: 'home_breeder',
      transparencyCommitments: ['accurate_information'],
    },
  );
  assert.equal(merged.social_facebook_trust_awarded, true);
  assert.equal(merged.warranty_policy_trust_awarded, true);
  assert.equal(merged.verified_base_trust_awarded, true);
  assert.equal(merged.cover_url, 'https://cdn.example/cover.jpg');
  assert.equal(merged.breederType, 'home_breeder');
  assert.equal(merged.scaleRange, undefined);
});
