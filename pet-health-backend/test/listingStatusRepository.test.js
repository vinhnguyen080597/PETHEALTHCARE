import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { ensureAccountProfile } = await import('../src/repositories/accountRepository.js');
const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  createPetFeedPost,
  getMyBreederProfile,
  updateOwnerListingStatus,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

async function seedVerifiedBreeder(breederId) {
  await upsertMyBreederProfile(
    breederId,
    {
      displayName: 'Status Farm',
      location: 'Hà Nội',
      verificationStatus: 'pending_review',
    },
    null,
  );
  await adminUpdateBreederProfileStatus(breederId, 'verified');
  return getMyBreederProfile(breederId, null);
}

test('updateOwnerListingStatus marks sold on-platform and resolves buyer', async () => {
  const breederId = `status-breeder-${Date.now()}`;
  const buyerId = `status-buyer-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  await ensureAccountProfile({
    userId: buyerId,
    email: 'buyer-status@example.com',
    loginIdentifier: 'buyer-status@example.com',
    displayName: 'Buyer',
    primaryRole: 'sen',
  });

  let post = await createPetFeedPost(
    breederId,
    { title: 'Golden pup', species: 'dog', status: 'draft' },
    null,
  );
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');

  const result = await updateOwnerListingStatus(
    breederId,
    post.id,
    {
      status: 'sold',
      saleChannel: 'on_platform',
      buyerEmail: 'buyer-status@example.com',
    },
    null,
  );

  assert.ok(result);
  assert.equal(result.post.status, 'sold');
  assert.equal(result.post.metadata.sale_channel, 'on_platform');
  assert.equal(result.post.metadata.buyer_user_id, buyerId);
  assert.equal(result.notifyBuyerUserId, buyerId);
});

test('updateOwnerListingStatus sets deposit_hold without sale metadata', async () => {
  const breederId = `hold-breeder-${Date.now()}`;
  await seedVerifiedBreeder(breederId);
  let post = await createPetFeedPost(
    breederId,
    { title: 'Cat', species: 'cat', status: 'draft' },
    null,
  );
  post = await adminUpdatePetFeedPostStatus(post.id, 'published');

  const result = await updateOwnerListingStatus(
    breederId,
    post.id,
    { status: 'deposit_hold' },
    null,
  );

  assert.ok(result);
  assert.equal(result.post.status, 'deposit_hold');
  assert.equal(result.post.metadata.sale_channel, undefined);
  assert.equal(result.notifyBuyerUserId, null);
});
