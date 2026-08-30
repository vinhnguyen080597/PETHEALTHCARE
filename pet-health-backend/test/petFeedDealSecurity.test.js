import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  confirmListingDeposit,
  createPetFeedPost,
  getPetFeedPost,
  getPublicPetFeedPost,
  updatePetFeedPost,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

async function seedVerifiedBreeder(userId) {
  await upsertMyBreederProfile(userId, {
    displayName: `Farm ${userId}`,
    location: 'HCM',
    metadata: {},
  }, null);
  await adminUpdateBreederProfileStatus(userId, 'verified');
}

test('C2: updatePetFeedPost ignores client metadata.deal injection', async () => {
  const breederId = `sec-c2-breeder-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createPetFeedPost(breederId, {
    title: 'Secure kitten',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
  }, null);
  const published = await adminUpdatePetFeedPostStatus(created.id, 'published');
  assert.equal(published.status, 'published');

  const updated = await updatePetFeedPost(breederId, created.id, {
    title: 'Secure kitten v2',
    metadata: {
      deal: {
        status: 'deposit_hold',
        sen_user_id: 'fake-sen',
        sen_email: 'attacker@evil.com',
      },
      soft_deposit_hold: true,
      soft_status: 'deposit_hold',
    },
  }, null);

  assert.equal(updated.status, 'published');
  assert.equal(updated.metadata?.deal, undefined);
  assert.equal(updated.deal, null);
});

test('C2: createPetFeedPost strips injected deal metadata', async () => {
  const breederId = `sec-c2-create-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  const created = await createPetFeedPost(breederId, {
    title: 'Injected deal',
    species: 'cat',
    breed: 'Mix',
    status: 'draft',
    mediaUrls: ['https://cdn.example/photo.jpg'],
    metadata: {
      deal: { status: 'deposit_hold' },
      soft_deposit_hold: true,
    },
  }, null);
  assert.equal(created.metadata?.deal, undefined);
  assert.equal(created.deal, null);
});

test('C1: public and stranger views redact Sen PII on deposit_hold listing', async () => {
  const breederId = `sec-c1-breeder-${Date.now()}`;
  const senId = `sec-c1-sen-${Date.now()}`;
  const strangerId = `sec-c1-stranger-${Date.now()}`;
  await seedVerifiedBreeder(breederId);

  const created = await createPetFeedPost(breederId, {
    title: 'Deposit hold listing',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
  }, null);
  await adminUpdatePetFeedPostStatus(created.id, 'published');

  await confirmListingDeposit(senId, created.id, { acknowledge: true }, null);
  const held = await confirmListingDeposit(breederId, created.id, { acknowledge: true }, null);
  assert.equal(held.post.status, 'deposit_hold');
  assert.equal(held.post.deal?.sen_user_id || held.post.metadata?.deal?.sen_user_id, senId);

  const publicDetail = await getPublicPetFeedPost(created.id);
  assert.equal(publicDetail?.status, 'deposit_hold');
  assert.equal(publicDetail?.deal?.sen_email, undefined);
  assert.equal(publicDetail?.deal?.sen_user_id, undefined);
  assert.equal(publicDetail?.metadata?.deal?.sen_email, undefined);

  const strangerView = await getPetFeedPost(strangerId, created.id, null);
  assert.ok(strangerView);
  assert.equal(strangerView.deal?.sen_email, undefined);
  assert.equal(strangerView.deal?.sen_user_id, undefined);

  const breederView = await getPetFeedPost(breederId, created.id, null);
  assert.equal(breederView.deal?.sen_user_id || breederView.metadata?.deal?.sen_user_id, senId);

  const senView = await getPetFeedPost(senId, created.id, null);
  assert.equal(senView.deal?.sen_user_id || senView.metadata?.deal?.sen_user_id, senId);
});
