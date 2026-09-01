import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAddFarmReviewPhoto,
  computeFarmReviewPool,
  farmReviewedBreederProfileId,
  FARM_REVIEW_MAX_PHOTOS,
  mapFarmReviewThreads,
  normalizeFarmReviewPhotoUrls,
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

test('validateFarmReviewInput normalizes photo urls', () => {
  const urls = Array.from({ length: FARM_REVIEW_MAX_PHOTOS + 1 }, (_, i) => `https://cdn.example/${i}.jpg`);
  assert.equal(normalizeFarmReviewPhotoUrls(urls).length, FARM_REVIEW_MAX_PHOTOS);
  assert.equal(
    normalizeFarmReviewPhotoUrls(['https://a.test/1.jpg', 'ftp://bad', '']).length,
    1,
  );
  assert.equal(canAddFarmReviewPhoto(FARM_REVIEW_MAX_PHOTOS), false);
  assert.equal(canAddFarmReviewPhoto(0), true);
});

test('parseSaleReviewFlag', () => {
  assert.equal(parseSaleReviewFlag('1'), true);
  assert.equal(parseSaleReviewFlag(''), false);
});

test('mapFarmReviewThreads keeps supplement rows', () => {
  const threads = mapFarmReviewThreads([
    {
      id: 'r1',
      rating: 5,
      body: 'Great',
      supplements: [{ id: 's1', rating: 4, body: 'Follow-up' }],
    },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0]?.supplements.length, 1);
  assert.equal(threads[0]?.supplements[0]?.rating, 4);
});

test('farmReviewedBreederProfileId resolves breeder profile', () => {
  assert.equal(
    farmReviewedBreederProfileId({
      type: 'farm_reviewed',
      breeder_profile_id: 'farm-1',
    }),
    'farm-1',
  );
  assert.equal(
    farmReviewedBreederProfileId({
      type: 'farm_reviewed',
      metadata: { breeder_profile_id: 'farm-2' },
    }),
    'farm-2',
  );
  assert.equal(farmReviewedBreederProfileId({ type: 'post_comment' }), null);
});
