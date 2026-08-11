import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  archiveMyPetFeedPost,
  createPetFeedPost,
  getPublicBreederProfile,
  listMyPetFeedPosts,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

async function seedVerifiedBreeder(userId) {
  const profile = await upsertMyBreederProfile(userId, {
    displayName: `Farm ${userId}`,
    location: 'HCM',
    metadata: {},
  }, null);
  await adminUpdateBreederProfileStatus(userId, 'verified');
  return profile;
}

async function publishListing(userId, title, metadata = {}) {
  const created = await createPetFeedPost(userId, {
    title,
    species: 'dog',
    breed: 'Poodle',
    status: 'draft',
    mediaUrls: ['https://cdn.example.com/p.jpg'],
    metadata,
  }, null);
  return adminUpdatePetFeedPostStatus(created.id, 'published');
}

test('owner can archive a published listing and it leaves my posts', async () => {
  const userId = `del-pub-${Date.now()}`;
  await seedVerifiedBreeder(userId);
  const post = await publishListing(userId, 'Live pup');

  const archived = await archiveMyPetFeedPost(userId, post.id, null);
  assert.equal(archived.status, 'archived');
  assert.equal(archived.metadata.owner_deleted, true);
  assert.ok(archived.metadata.owner_deleted_at);

  const mine = await listMyPetFeedPosts(userId, null);
  assert.equal(mine.some((row) => row.id === post.id), false);
});

test('owner cannot archive a listing on deposit hold', async () => {
  const userId = `del-hold-${Date.now()}`;
  await seedVerifiedBreeder(userId);
  const post = await publishListing(userId, 'Held pup');
  await adminUpdatePetFeedPostStatus(post.id, 'deposit_hold');

  await assert.rejects(
    () => archiveMyPetFeedPost(userId, post.id, null),
    (err) => err.code === 'LISTING_DELETE_DEPOSIT_HOLD',
  );
});

test('sold listing can be deleted after 7 days and leaves the farm', async () => {
  const userId = `del-sold-${Date.now()}`;
  const profile = await seedVerifiedBreeder(userId);
  const completedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const post = await publishListing(userId, 'Rehomed pup', {
    sold: true,
    listing_outcome: 'sold',
    deal: { status: 'completed', completed_at: completedAt },
  });
  await adminUpdatePetFeedPostStatus(post.id, 'sold');

  const before = await getPublicBreederProfile(profile.id);
  assert.ok(before.listings.some((row) => row.id === post.id));

  const archived = await archiveMyPetFeedPost(userId, post.id, null);
  assert.equal(archived.status, 'archived');
  assert.equal(archived.metadata.owner_deleted, true);

  const after = await getPublicBreederProfile(profile.id);
  assert.equal(after.listings.some((row) => row.id === post.id), false);
  assert.equal(after.profile.metadata?.pets_rehomed, 0);
});

test('sold listing cannot be deleted before 7 days', async () => {
  const userId = `del-sold-wait-${Date.now()}`;
  await seedVerifiedBreeder(userId);
  const completedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const post = await publishListing(userId, 'Just sold pup', {
    sold: true,
    deal: { status: 'completed', completed_at: completedAt },
  });
  await adminUpdatePetFeedPostStatus(post.id, 'sold');

  await assert.rejects(
    () => archiveMyPetFeedPost(userId, post.id, null),
    (err) => err.code === 'LISTING_DELETE_SOLD_COOLDOWN',
  );
});
