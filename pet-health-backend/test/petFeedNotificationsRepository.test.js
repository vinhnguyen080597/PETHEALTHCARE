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

test('listing rejection notification surfaces admin reason from the post', async () => {
  __resetPetFeedNotificationsMemoryForTests();
  const { createListingReviewNotification } = await import(
    '../src/repositories/petFeedNotificationsRepository.js'
  );
  const ownerId = `notif-listing-reject-${Date.now()}`;
  await upsertMyBreederProfile(ownerId, {
    displayName: 'Owner',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(ownerId, 'verified');
  const created = await createPetFeedPost(ownerId, {
    title: 'gà bé mèo con',
    species: 'cat',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/a.jpg'],
  }, null);
  const rejected = await adminUpdatePetFeedPostStatus(created.id, 'archived', {
    rejectionReason: 'Thiếu sổ tiêm và ảnh môi trường',
    adminAction: 'Bổ sung sổ tiêm',
  });
  assert.equal(rejected.status, 'archived');

  await createListingReviewNotification({
    recipientUserId: ownerId,
    actorUserId: 'admin',
    postId: rejected.id,
    type: 'listing_rejected',
    bodyPreview: `Bài đăng "${rejected.title}" chưa được duyệt.`,
    metadata: { title: rejected.title },
    accessToken: null,
  });

  const list = await listPetFeedNotifications(ownerId, null);
  assert.equal(list[0].type, 'listing_rejected');
  assert.equal(list[0].rejection_reason, 'Thiếu sổ tiêm và ảnh môi trường');
  assert.equal(list[0].admin_action, 'Bổ sung sổ tiêm');
  assert.equal(list[0].body_preview, 'Thiếu sổ tiêm và ảnh môi trường');
});
