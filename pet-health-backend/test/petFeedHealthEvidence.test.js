import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertHealthEvidenceForReview,
  vaccineStatusRequiresHealthEvidence,
} from '../src/utils/petFeedHealthEvidence.js';

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

test('assertHealthEvidenceForReview rejects pending_review without evidence', () => {
  assert.throws(
    () =>
      assertHealthEvidenceForReview({
        status: 'pending_review',
        vaccineStatus: 'Basic vaccines completed',
        metadata: {},
      }),
    (err) => err?.code === 'PET_FEED_HEALTH_EVIDENCE_REQUIRED' && err?.status === 400,
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
