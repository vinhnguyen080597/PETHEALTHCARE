import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReviewAverage,
  isSenConfirmedDeal,
  normalizeDealReviewRating,
  validateDealReviewInput,
} from '../src/utils/breederDealReviews.js';

test('validateDealReviewInput requires rating 1-5', () => {
  assert.equal(validateDealReviewInput({ rating: 5 }).ok, true);
  assert.equal(validateDealReviewInput({ rating: 0 }).ok, false);
});

test('isSenConfirmedDeal excludes system auto-complete', () => {
  assert.equal(
    isSenConfirmedDeal({ sen_confirmed_complete_at: '2026-01-01', completed_by_system: true }),
    false,
  );
  assert.equal(
    isSenConfirmedDeal({ sen_confirmed_complete_at: '2026-01-01' }),
    true,
  );
});

test('formatReviewAverage', () => {
  assert.deepEqual(formatReviewAverage(0, 0), { average: 0, count: 0, label: '' });
  assert.equal(formatReviewAverage(4.666, 3).average, 4.7);
});

test('normalizeDealReviewRating rounds', () => {
  assert.equal(normalizeDealReviewRating(4.6), 5);
});
