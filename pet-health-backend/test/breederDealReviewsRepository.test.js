import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  confirmListingComplete,
  createPetFeedPost,
  getMyBreederProfile,
  requestListingComplete,
  confirmListingDeposit,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');
const {
  createBreederDealReview,
  getBreederDealReviewAggregate,
  resetBreederDealReviewMemoryForTests,
} = await import('../src/repositories/breederDealReviewsRepository.js');

test('sen confirm completion + 5-star review updates breeder transparency counts', async () => {
  resetBreederDealReviewMemoryForTests();
  const breederId = `review-breeder-${Date.now()}`;
  const senId = `review-sen-${Date.now()}`;
  await upsertMyBreederProfile(breederId, {
    displayName: 'Review Farm',
    location: 'Hà Nội',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);

  let post = await createPetFeedPost(breederId, {
    title: 'Puppy',
    species: 'dog',
    status: 'draft',
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');

  await confirmListingDeposit(senId, post.id, { acknowledge: true }, null);
  await confirmListingDeposit(breederId, post.id, { acknowledge: true }, null);
  await requestListingComplete(breederId, post.id, {
    handoffPhotoUrls: ['https://cdn.example/handoff.jpg'],
  }, null);
  const done = await confirmListingComplete(senId, post.id, null);
  assert.equal(done.review_eligible, true);

  const reviewResult = await createBreederDealReview(senId, post.id, { rating: 5, body: 'Great!' }, null);
  assert.equal(reviewResult.review.rating, 5);
  assert.equal(reviewResult.transparency_points_awarded, 2);
  assert.equal(reviewResult.notify_user_id, breederId);

  const agg = await getBreederDealReviewAggregate(profile.id, null);
  assert.equal(agg.review_count, 1);
  assert.equal(agg.five_star_review_count, 1);
  assert.equal(agg.sen_confirmed_completions, 1);
  assert.equal(agg.review_avg, 5);

  const refreshed = await getMyBreederProfile(breederId, null);
  assert.equal(refreshed.metadata?.five_star_review_count, 1);
  assert.equal(refreshed.metadata?.review_count, 1);
});

test('duplicate review is rejected', async () => {
  resetBreederDealReviewMemoryForTests();
  const breederId = `dup-breeder-${Date.now()}`;
  const senId = `dup-sen-${Date.now()}`;
  await upsertMyBreederProfile(breederId, {
    displayName: 'Dup Farm',
    location: 'Đà Nẵng',
    verificationStatus: 'pending_review',
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  const profile = await getMyBreederProfile(breederId, null);
  let post = await createPetFeedPost(breederId, {
    title: 'Kitten',
    species: 'cat',
    status: 'draft',
  }, null);
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');
  await confirmListingDeposit(senId, post.id, { acknowledge: true }, null);
  await confirmListingDeposit(breederId, post.id, { acknowledge: true }, null);
  await requestListingComplete(breederId, post.id, {
    handoffPhotoUrls: ['https://cdn.example/handoff.jpg'],
  }, null);
  await confirmListingComplete(senId, post.id, null);
  await createBreederDealReview(senId, post.id, { rating: 4 }, null);
  await assert.rejects(
    () => createBreederDealReview(senId, post.id, { rating: 5 }, null),
    (err) => err.code === 'REVIEW_ALREADY_EXISTS',
  );
});
