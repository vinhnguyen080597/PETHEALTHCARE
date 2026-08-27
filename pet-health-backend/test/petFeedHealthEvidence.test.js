import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

import {
  assertHealthEvidenceForReview,
  vaccineStatusRequiresHealthEvidence,
} from '../src/utils/petFeedHealthEvidence.js';

const {
  adminUpdateBreederProfileStatus,
  createPetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

test('vaccineStatusRequiresHealthEvidence matches common labels', () => {
  assert.equal(vaccineStatusRequiresHealthEvidence('unknown'), false);
  assert.equal(vaccineStatusRequiresHealthEvidence('Not vaccinated yet'), false);
  assert.equal(vaccineStatusRequiresHealthEvidence('Basic vaccines completed'), true);
});

test('assertHealthEvidenceForReview allows drafts without evidence', () => {
  assert.doesNotThrow(() =>
    assertHealthEvidenceForReview({
      status: 'draft',
      vaccineStatus: 'Basic vaccines completed',
      metadata: {},
    }),
  );
});

test('assertHealthEvidenceForReview allows pending_review without evidence', () => {
  assert.doesNotThrow(() =>
    assertHealthEvidenceForReview({
      status: 'pending_review',
      vaccineStatus: 'Basic vaccines completed',
      metadata: {},
    }),
  );
});

test('assertHealthEvidenceForReview accepts pending_review with evidence urls', () => {
  assert.doesNotThrow(() =>
    assertHealthEvidenceForReview({
      status: 'pending_review',
      vaccineStatus: 'Basic vaccines completed',
      metadata: { health_evidence_urls: ['https://example.com/book.jpg'] },
    }),
  );
});

test('text-only listing update can resubmit vaccinated listing without evidence', async () => {
  const userId = `edit-vax-${Date.now()}`;
  await upsertMyBreederProfile(userId, {
    displayName: `Farm ${userId}`,
    location: 'HCM',
    metadata: {},
  }, null);
  await adminUpdateBreederProfileStatus(userId, 'verified');
  const created = await createPetFeedPost(userId, {
    title: 'Kitten',
    species: 'cat',
    breed: 'British Shorthair',
    status: 'draft',
    vaccineStatus: 'Đã tiêm cơ bản',
    mediaUrls: ['https://cdn.example.com/p.jpg'],
  }, null);

  const updated = await updatePetFeedPost(userId, created.id, {
    title: 'Kitten updated',
    vaccineStatus: 'Đã tiêm cơ bản',
    status: 'pending_review',
  }, null);
  assert.equal(updated.status, 'pending_review');
  assert.equal(updated.vaccine_status, 'Đã tiêm cơ bản');
});
