import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFarmReviewPool,
  parseSaleReviewFlag,
  validateFarmReviewInput,
} from '../src/utils/farmReview.ts';

test('computeFarmReviewPool matches B/C/D example', () => {
  const result = computeFarmReviewPool([
    { kind: 'primary', reviewer_user_id: 'user-b', rating: 5 },
    { kind: 'supplement', reviewer_user_id: 'user-b', rating: 4 },
    { kind: 'primary', reviewer_user_id: 'user-c', rating: 5 },
    { kind: 'supplement', reviewer_user_id: 'user-c', rating: 4 },
    { kind: 'sale', reviewer_user_id: 'user-d', rating: 5 },
  ]);
  assert.equal(result.review_count, 4);
  assert.equal(result.review_avg, 4.75);
});

test('validateFarmReviewInput requires rating', () => {
  assert.match(validateFarmReviewInput({ rating: 0 }) || '', /1 and 5/);
  assert.equal(validateFarmReviewInput({ rating: 4, body: 'ok' }), null);
});

test('parseSaleReviewFlag', () => {
  assert.equal(parseSaleReviewFlag('1'), true);
  assert.equal(parseSaleReviewFlag(''), false);
});
