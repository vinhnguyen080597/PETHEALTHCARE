import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDealReviewedNotificationPreview,
  formatReviewAverage,
  isSenConfirmedDeal,
  normalizeDealReviewRating,
  transparencyPointsForDealReview,
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

test('transparency points are not awarded for reviews', () => {
  assert.equal(transparencyPointsForDealReview(5), 0);
  assert.equal(transparencyPointsForDealReview(4), 0);
});

test('buildDealReviewedNotificationPreview includes note without transparency points', () => {
  const preview = buildDealReviewedNotificationPreview({
    title: 'Persian kitten',
    rating: 5,
    body: 'Rất tuyệt vời',
  });
  assert.match(preview, /5★/);
  assert.equal(preview.includes('điểm minh bạch'), false);
  assert.match(preview, /Rất tuyệt vời/);
  assert.match(preview, /Persian kitten/);

  const fourStar = buildDealReviewedNotificationPreview({
    title: 'Cat',
    rating: 4,
    body: '',
  });
  assert.match(fourStar, /4★/);
  assert.equal(fourStar.includes('điểm minh bạch'), false);
});
