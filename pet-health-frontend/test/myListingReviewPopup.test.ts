import test from 'node:test';
import assert from 'node:assert/strict';
import { opensMyListingReviewPopup } from '../src/utils/myListingReviewPopup.ts';

test('opensMyListingReviewPopup only for pending_review', () => {
  assert.equal(opensMyListingReviewPopup('pending_review'), true);
  assert.equal(opensMyListingReviewPopup('PENDING_REVIEW'), true);
  assert.equal(opensMyListingReviewPopup('published'), false);
  assert.equal(opensMyListingReviewPopup('draft'), false);
  assert.equal(opensMyListingReviewPopup(null), false);
});
