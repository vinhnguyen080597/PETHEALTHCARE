import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  cancelMyBreederVerificationRequest,
  createAnnouncementPost,
  createPetFeedPostComment,
  deletePetFeedPostComment,
  getPetFeedPost,
  listPetFeedPostComments,
  listPublishedPetFeedPostPage,
  reportPetFeedComment,
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

test('list page prefers metadata.list_thumb_url when present', async () => {
  const userId = `thumb-user-${Date.now()}`;
  const mediaUrls = [
    'https://cdn.example/pet-feed/photo-full.jpg',
    'https://cdn.example/pet-feed/photo-2.jpg',
  ];
  const listThumb = 'https://cdn.example/pet-feed/thumb-720.jpg';
  const created = await createAnnouncementPost(userId, {
    title: 'Thumb announcement',
    description: 'Has list thumb',
    category: 'general',
    mediaUrls,
    metadata: { list_thumb_url: listThumb },
  }, null);

  const listPage = await listPublishedPetFeedPostPage(userId, null, { limit: 50, kind: 'announcement' });
  const listItem = listPage.data.find((post) => post.id === created.id);
  assert.ok(listItem);
  assert.deepEqual(listItem.media_urls, [listThumb]);
  assert.equal(listItem.media_count, 2);
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

test('listPetFeedPostComments returns comments in chronological order', async () => {
  const authorId = `comment-author-${Date.now()}`;
  const readerId = `comment-reader-${Date.now()}`;
  const post = await createAnnouncementPost(authorId, {
    title: 'Commentable post',
    description: 'Has comments',
    category: 'general',
  }, null);

  await createPetFeedPostComment(readerId, post.id, 'First question', null);
  await createPetFeedPostComment(authorId, post.id, 'Thanks for asking', null);

  const comments = await listPetFeedPostComments(post.id, null);
  assert.equal(comments.length, 2);
  assert.equal(comments[0].body, 'First question');
  assert.equal(comments[1].body, 'Thanks for asking');
  assert.equal(comments[0].post_id, post.id);
});

test('comment replies, delete, report, and list comment_count', async () => {
  const authorId = `thread-author-${Date.now()}`;
  const readerId = `thread-reader-${Date.now()}`;
  const post = await createAnnouncementPost(authorId, {
    title: 'Threaded comments',
    description: 'Has replies',
    category: 'general',
  }, null);

  const root = await createPetFeedPostComment(readerId, post.id, 'Root question', null);
  const reply = await createPetFeedPostComment(authorId, post.id, 'Root answer', null, { parentId: root.id });
  assert.equal(reply.parent_id, root.id);

  await assert.rejects(
    () => createPetFeedPostComment(readerId, post.id, 'Too deep', null, { parentId: reply.id }),
    (error) => error?.code === 'PET_FEED_COMMENT_NESTING_UNSUPPORTED',
  );

  const listed = await listPublishedPetFeedPostPage(readerId, null, { limit: 50, kind: 'announcement' });
  const listItem = listed.data.find((item) => item.id === post.id);
  assert.ok(listItem);
  assert.equal(listItem.comment_count, 2);

  const report = await reportPetFeedComment(authorId, root.id, { reason: 'abusive_content', note: 'spam' }, null);
  assert.equal(report.target_type, 'comment');
  assert.equal(report.comment_id, root.id);

  await deletePetFeedPostComment(readerId, root.id, null);
  const afterDelete = await listPetFeedPostComments(post.id, null);
  assert.equal(afterDelete.length, 0);
});
