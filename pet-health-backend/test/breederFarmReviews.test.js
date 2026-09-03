import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFarmReviewAdminPendingPreview,
  buildFarmReviewedNotificationPreview,
  computeFarmReviewPool,
  countFarmReviewDisplayThreads,
  countFiveStarDirectReviews,
  filterApprovedFarmReviews,
  filterFarmReviewsForViewer,
  transparencyPointsForFarmReview,
  validateFarmReviewInput,
} from '../src/utils/breederFarmReviews.js';

test('computeFarmReviewPool: users B/C bundles + user D sale x2 → 4.75', () => {
  const reviews = [
    { kind: 'primary', reviewer_user_id: 'user-b', rating: 5, status: 'approved' },
    { kind: 'supplement', reviewer_user_id: 'user-b', rating: 4, status: 'approved' },
    { kind: 'primary', reviewer_user_id: 'user-c', rating: 5, status: 'approved' },
    { kind: 'supplement', reviewer_user_id: 'user-c', rating: 4, status: 'approved' },
    { kind: 'sale', reviewer_user_id: 'user-d', rating: 5, post_id: 'post-1', status: 'approved' },
  ];
  const result = computeFarmReviewPool(reviews);
  assert.equal(result.review_count, 4);
  assert.equal(result.review_avg, 4.75);
  assert.deepEqual(result.pool, [5, 5, 4.5, 4.5]);
});

test('validateFarmReviewInput requires rating 1-5', () => {
  assert.equal(validateFarmReviewInput({ rating: 0 }).ok, false);
  assert.equal(validateFarmReviewInput({ rating: 3, body: 'ok' }).ok, true);
});

test('buildFarmReviewAdminPendingPreview includes farm and rating', () => {
  const preview = buildFarmReviewAdminPendingPreview({
    farmName: 'Trại Mai',
    rating: 5,
    kind: 'primary',
  });
  assert.match(preview, /Trại Mai/);
  assert.match(preview, /5★/);
  assert.match(preview, /chờ admin duyệt/);
});

test('filterFarmReviewsForViewer only returns approved rows', () => {
  const rows = [
    { id: '1', status: 'approved', reviewer_user_id: 'u1' },
    { id: '2', status: 'pending', reviewer_user_id: 'u1' },
    { id: '3', status: 'pending', reviewer_user_id: 'u2' },
    { id: '4', status: 'rejected', reviewer_user_id: 'u3' },
  ];
  assert.equal(filterFarmReviewsForViewer(rows, 'u1').length, 1);
  assert.equal(filterFarmReviewsForViewer(rows, 'u1')[0].id, '1');
  assert.equal(filterApprovedFarmReviews(rows).length, 1);
});

test('countFarmReviewDisplayThreads counts threads not pool weight', () => {
  assert.equal(
    countFarmReviewDisplayThreads([
      { kind: 'sale', reviewer_user_id: 'user-a', rating: 4, status: 'approved' },
    ]),
    1,
  );
  assert.equal(
    countFarmReviewDisplayThreads([
      { kind: 'primary', reviewer_user_id: 'user-b', rating: 5, status: 'approved' },
      { kind: 'supplement', reviewer_user_id: 'user-b', rating: 4, status: 'approved' },
      { kind: 'sale', reviewer_user_id: 'user-c', rating: 5, status: 'approved' },
    ]),
    2,
  );
});

test('computeFarmReviewPool ignores pending reviews', () => {
  const reviews = [
    { kind: 'primary', reviewer_user_id: 'user-a', rating: 5, status: 'pending' },
    { kind: 'sale', reviewer_user_id: 'user-b', rating: 1, status: 'approved' },
  ];
  const result = computeFarmReviewPool(reviews);
  assert.equal(result.review_count, 2);
  assert.equal(result.review_avg, 1);
});

test('countFiveStarDirectReviews ignores sale reviews', () => {
  const reviews = [
    { kind: 'primary', rating: 5, status: 'approved' },
    { kind: 'sale', rating: 5, status: 'approved' },
    { kind: 'supplement', rating: 4, status: 'approved' },
  ];
  assert.equal(countFiveStarDirectReviews(reviews), 1);
});

test('transparency points are not awarded for farm reviews', () => {
  assert.equal(transparencyPointsForFarmReview(5), 0);
  assert.equal(transparencyPointsForFarmReview(4), 0);
});

test('buildFarmReviewedNotificationPreview omits transparency points', () => {
  const preview = buildFarmReviewedNotificationPreview({
    farmName: 'Trại Mai',
    rating: 5,
    body: 'Tuyệt vời',
  });
  assert.match(preview, /5★/);
  assert.match(preview, /Trại Mai/);
  assert.match(preview, /Tuyệt vời/);
  assert.equal(preview.includes('điểm minh bạch'), false);
});
