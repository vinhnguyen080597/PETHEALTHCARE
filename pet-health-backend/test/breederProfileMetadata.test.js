import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeBreederProfileMetadata,
  sanitizeBreederProfileMetadata,
  toPublicBreederMetadata,
  hasApprovedLegalEntityTag,
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

test('toPublicBreederMetadata strips identity and license URL, keeps tag', () => {
  const publicMeta = toPublicBreederMetadata({
    legal_entity_tag: 'household_business',
    business_license_verified: true,
    business_license_url: 'https://cdn.example/secret.jpg',
    business_license_pending_url: 'https://cdn.example/pending.jpg',
    identity: { tax_id: '0123456789', legal_name: 'Secret' },
  });
  assert.equal(publicMeta.legal_entity_tag, 'household_business');
  assert.equal(publicMeta.business_license_verified, true);
  assert.equal(publicMeta.business_license_url, undefined);
  assert.equal(publicMeta.business_license_pending_url, undefined);
  assert.equal(publicMeta.identity, undefined);
  assert.equal(hasApprovedLegalEntityTag(publicMeta), true);
});
