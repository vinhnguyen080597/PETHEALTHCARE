import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateFarmReviewStatus,
  createBreederFarmReview,
  listAdminFarmReviews,
  resetBreederFarmReviewMemoryForTests,
} = await import('../src/repositories/breederFarmReviewsRepository.js');
const {
  FARM_REVIEW_PRIMARY_NOT_APPROVED,
} = await import('../src/utils/breederFarmReviews.js');

test('cannot approve a supplement while the primary is still pending', async () => {
  resetBreederFarmReviewMemoryForTests();
  const farmId = `farm-${Date.now()}`;
  const senId = `sen-${Date.now()}`;

  const primary = await createBreederFarmReview(senId, farmId, { rating: 5, body: 'Main' }, null);
  assert.equal(primary.kind, 'primary');
  const update = await createBreederFarmReview(senId, farmId, { rating: 1, body: 'Update' }, null);
  assert.equal(update.kind, 'supplement');

  const pending = await listAdminFarmReviews('pending', null);
  const pendingUpdate = pending.find((row) => row.id === update.review.id);
  assert.equal(pendingUpdate?.parent_status, 'pending');

  await assert.rejects(
    () => adminUpdateFarmReviewStatus(update.review.id, 'approved', 'admin', null),
    (err) => err.code === FARM_REVIEW_PRIMARY_NOT_APPROVED,
  );

  await adminUpdateFarmReviewStatus(primary.review.id, 'approved', 'admin', null);
  const stillPending = await listAdminFarmReviews('pending', null);
  const leftoverUpdate = stillPending.find((row) => row.id === update.review.id);
  assert.equal(leftoverUpdate?.status, 'pending');
  assert.equal(leftoverUpdate?.parent_status, 'approved');

  const approved = await adminUpdateFarmReviewStatus(update.review.id, 'approved', 'admin', null);
  assert.equal(approved.review.status, 'approved');
});

test('rejecting a primary also rejects leftover pending updates', async () => {
  resetBreederFarmReviewMemoryForTests();
  const farmId = `farm-reject-${Date.now()}`;
  const senId = `sen-reject-${Date.now()}`;
  const primary = await createBreederFarmReview(senId, farmId, { rating: 5, body: 'Main' }, null);
  const update = await createBreederFarmReview(senId, farmId, { rating: 1, body: 'Update' }, null);

  await adminUpdateFarmReviewStatus(primary.review.id, 'rejected', 'admin', null, {
    rejectionReason: 'Not suitable',
  });

  const pending = await listAdminFarmReviews('pending', null);
  assert.equal(pending.some((row) => row.id === update.review.id), false);
  const rejected = await listAdminFarmReviews('rejected', null);
  assert.equal(rejected.some((row) => row.id === primary.review.id), true);
  assert.equal(rejected.some((row) => row.id === update.review.id), true);
});
