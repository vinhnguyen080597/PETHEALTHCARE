import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  createPetFeedPost,
  listPublishedPetFeedPostPage,
} = await import('../src/repositories/petFeedRepository.js');

test('listPublishedPetFeedPostPage returns cursor pages without duplicates', async () => {
  const userId = `pagination-user-${Date.now()}`;
  const created = [];

  for (let i = 0; i < 4; i += 1) {
    created.push(await createPetFeedPost(userId, {
      id: `pagination-post-${Date.now()}-${i}`,
      title: `Pagination listing ${i}`,
      species: 'cat',
      status: 'published',
    }, null, { isAdmin: true }));
  }

  const firstPage = await listPublishedPetFeedPostPage(userId, null, { limit: 2 });
  assert.equal(firstPage.data.length, 2);
  assert.equal(typeof firstPage.nextCursor, 'string');

  const secondPage = await listPublishedPetFeedPostPage(userId, null, { limit: 2, cursor: firstPage.nextCursor });
  assert.equal(secondPage.data.length, 2);

  const seenIds = new Set([...firstPage.data, ...secondPage.data].map((post) => post.id));
  assert.equal(seenIds.size, 4);
  for (const post of created) {
    assert.ok(seenIds.has(post.id));
  }
});
