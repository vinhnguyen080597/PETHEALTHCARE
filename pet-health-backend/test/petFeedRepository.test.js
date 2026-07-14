import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  cancelMyBreederVerificationRequest,
  createAnnouncementPost,
  getPetFeedPost,
  listPublishedPetFeedPostPage,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

test('listPublishedPetFeedPostPage returns cursor pages without duplicates', async () => {
  const userId = `pagination-user-${Date.now()}`;
  const created = [];

  for (let i = 0; i < 4; i += 1) {
    created.push(await createAnnouncementPost(userId, {
      title: `Announcement ${i}`,
      description: `Body ${i}`,
      category: 'general',
    }, null));
  }

  const firstPage = await listPublishedPetFeedPostPage(userId, null, { limit: 2, kind: 'announcement' });
  assert.equal(firstPage.data.length, 2);
  assert.equal(typeof firstPage.nextCursor, 'string');

  const secondPage = await listPublishedPetFeedPostPage(userId, null, { limit: 2, cursor: firstPage.nextCursor, kind: 'announcement' });
  assert.equal(secondPage.data.length, 2);

  const seenIds = new Set([...firstPage.data, ...secondPage.data].map((post) => post.id));
  assert.equal(seenIds.size, 4);
  for (const post of created) {
    assert.ok(seenIds.has(post.id));
  }
});

test('getPetFeedPost returns full media while list page stays slim', async () => {
  const userId = `detail-user-${Date.now()}`;
  const mediaUrls = [
    'https://cdn.example/pet-feed/photo-1.jpg',
    'https://cdn.example/pet-feed/photo-2.jpg',
    'https://cdn.example/pet-feed/photo-3.jpg',
  ];
  const longDescription = 'A'.repeat(400);

  const created = await createAnnouncementPost(userId, {
    title: 'Full media announcement',
    description: longDescription,
    category: 'general',
    mediaUrls,
  }, null);

  const listPage = await listPublishedPetFeedPostPage(userId, null, { limit: 50, kind: 'announcement' });
  const listItem = listPage.data.find((post) => post.id === created.id);
  assert.ok(listItem);
  assert.deepEqual(listItem.media_urls, [mediaUrls[0]]);
  assert.equal(listItem.media_count, 3);
  assert.equal(listItem.description.length, 280);

  const detail = await getPetFeedPost(userId, created.id, null);
  assert.ok(detail);
  assert.deepEqual(detail.media_urls, mediaUrls);
  assert.equal(detail.description, longDescription);
});

test('cancelMyBreederVerificationRequest withdraws pending requests only', async () => {
  const userId = `cancel-breeder-${Date.now()}`;
  const pending = await upsertMyBreederProfile(userId, {
    displayName: 'Pending Cattery',
    location: 'Ho Chi Minh City',
    primarySpecies: ['cat'],
  }, null);
  assert.equal(pending.verification_status, 'pending_review');

  const cancelled = await cancelMyBreederVerificationRequest(userId, null);
  assert.equal(cancelled.verification_status, 'unverified');

  await assert.rejects(
    () => cancelMyBreederVerificationRequest(userId, null),
    (error) => error?.code === 'BREEDER_CANCEL_NOT_ALLOWED',
  );
});
