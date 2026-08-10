import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  createPetFeedPost,
  createPetFeedPostComment,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');
const {
  countUnreadPetFeedNotifications,
  createConversationMessageNotification,
  createPostCommentNotification,
  listPetFeedNotifications,
  markPetFeedNotificationsRead,
  __resetPetFeedNotificationsMemoryForTests,
} = await import('../src/repositories/petFeedNotificationsRepository.js');

async function publishListing(ownerId, title) {
  await upsertMyBreederProfile(ownerId, {
    displayName: 'Owner',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(ownerId, 'verified');
  const post = await createPetFeedPost(ownerId, {
    title,
    species: 'cat',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/a.jpg'],
  }, null);
  return adminUpdatePetFeedPostStatus(post.id, 'published');
}

test('comment on own post does not create notification', async () => {
  __resetPetFeedNotificationsMemoryForTests();
  const ownerId = `notif-owner-${Date.now()}`;
  const post = await publishListing(ownerId, 'My kitten');
  const comment = await createPetFeedPostComment(ownerId, post.id, 'Self note', null);
  await createPostCommentNotification({
    recipientUserId: ownerId,
    actorUserId: ownerId,
    postId: post.id,
    commentId: comment.id,
    bodyPreview: comment.body,
    accessToken: null,
  });
  assert.equal(await countUnreadPetFeedNotifications(ownerId, null), 0);
});

test('comment on another user post creates unread notification', async () => {
  __resetPetFeedNotificationsMemoryForTests();
  const ownerId = `notif-owner2-${Date.now()}`;
  const commenterId = `notif-commenter-${Date.now()}`;
  const post = await publishListing(ownerId, 'Persian kitten');
  const comment = await createPetFeedPostComment(commenterId, post.id, 'Is this still available?', null);
  await createPostCommentNotification({
    recipientUserId: ownerId,
    actorUserId: commenterId,
    postId: post.id,
    commentId: comment.id,
    bodyPreview: comment.body,
    accessToken: null,
  });

  assert.equal(await countUnreadPetFeedNotifications(ownerId, null), 1);
  assert.equal(await countUnreadPetFeedNotifications(commenterId, null), 0);

  const list = await listPetFeedNotifications(ownerId, null);
  assert.equal(list.length, 1);
  assert.equal(list[0].is_unread, true);
  assert.equal(list[0].post_id, post.id);
  assert.match(list[0].body_preview, /available/i);

  await markPetFeedNotificationsRead(ownerId, null);
  assert.equal(await countUnreadPetFeedNotifications(ownerId, null), 0);
  const afterRead = await listPetFeedNotifications(ownerId, null);
  assert.equal(afterRead[0].is_unread, false);
});

test('listing approval creates unread notification for post owner', async () => {
  __resetPetFeedNotificationsMemoryForTests();
  const { createListingReviewNotification } = await import(
    '../src/repositories/petFeedNotificationsRepository.js'
  );
  const ownerId = `notif-listing-${Date.now()}`;
  const post = await publishListing(ownerId, 'Approved kitten');
  await createListingReviewNotification({
    recipientUserId: ownerId,
    actorUserId: 'admin',
    postId: post.id,
    type: 'listing_approved',
    bodyPreview: 'Listing approved',
    metadata: { title: post.title },
    accessToken: null,
  });
  assert.equal(await countUnreadPetFeedNotifications(ownerId, null), 1);
  const list = await listPetFeedNotifications(ownerId, null);
  assert.equal(list[0].type, 'listing_approved');
  assert.equal(list[0].post_id, post.id);
});

test('conversation message notifies the other participant', async () => {
  __resetPetFeedNotificationsMemoryForTests();
  const recipientId = `notif-dm-recv-${Date.now()}`;
  const actorId = `notif-dm-send-${Date.now()}`;
  const created = await createConversationMessageNotification({
    recipientUserId: recipientId,
    actorUserId: actorId,
    postId: 'post-1',
    conversationId: 'conv-1',
    messageId: 'msg-1',
    bodyPreview: 'Hello there',
    accessToken: null,
  });
  assert.ok(created);
  assert.equal(created.type, 'conversation_message');
  assert.equal(created.metadata?.conversation_id, 'conv-1');
  assert.equal(created.metadata?.cta_href, '/app/messages?c=conv-1');
  assert.equal(await countUnreadPetFeedNotifications(recipientId, null), 1);
  assert.equal(await countUnreadPetFeedNotifications(actorId, null), 0);

  const self = await createConversationMessageNotification({
    recipientUserId: actorId,
    actorUserId: actorId,
    postId: 'post-1',
    conversationId: 'conv-1',
    messageId: 'msg-2',
    bodyPreview: 'noop',
    accessToken: null,
  });
  assert.equal(self, null);
});
