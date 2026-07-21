import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  createAnnouncementPost,
  createPetFeedPost,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');
const {
  listPetFeedConversationMessages,
  listPetFeedConversations,
  openPetFeedConversation,
  sendPetFeedConversationMessage,
} = await import('../src/repositories/petFeedMessagingRepository.js');

test('open conversation rejects announcements', async () => {
  const breederId = `msg-ann-${Date.now()}`;
  const senId = `msg-ann-sen-${Date.now()}`;
  const announcement = await createAnnouncementPost(breederId, {
    title: 'News',
    description: 'Not messageable',
    category: 'general',
  }, null);
  await assert.rejects(
    () => openPetFeedConversation(senId, announcement.id, null),
    (error) => error?.code === 'PET_FEED_POST_NOT_FOUND',
  );
});

test('sen and breeder can exchange messages on a listing', async () => {
  const breederId = `msg-breeder-${Date.now()}`;
  const senId = `msg-sen-${Date.now()}`;

  await upsertMyBreederProfile(breederId, {
    displayName: 'Message Cattery',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const post = await createPetFeedPost(breederId, {
    title: 'Kitten for chat',
    species: 'cat',
    breed: 'British',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
    videoUrl: 'https://cdn.example/video.mp4',
  }, null);
  const published = await adminUpdatePetFeedPostStatus(post.id, 'published');
  assert.equal(published.status, 'published');

  await assert.rejects(
    () => openPetFeedConversation(breederId, published.id, null),
    (error) => error?.code === 'PET_FEED_MESSAGE_SELF',
  );

  const conversation = await openPetFeedConversation(senId, published.id, null);
  assert.equal(conversation.post_id, published.id);
  assert.equal(conversation.sen_user_id, senId);
  assert.equal(conversation.breeder_user_id, breederId);
  assert.ok(conversation.post_title);

  const again = await openPetFeedConversation(senId, post.id, null);
  assert.equal(again.id, conversation.id);

  const first = await sendPetFeedConversationMessage(senId, conversation.id, 'Is this baby still available?', null);
  assert.equal(first.body, 'Is this baby still available?');
  const second = await sendPetFeedConversationMessage(breederId, conversation.id, 'Yes, still available.', null);
  assert.equal(second.sender_user_id, breederId);

  const messages = await listPetFeedConversationMessages(senId, conversation.id, null);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].body, 'Is this baby still available?');
  assert.equal(messages[1].body, 'Yes, still available.');

  const senInbox = await listPetFeedConversations(senId, null);
  const breederInbox = await listPetFeedConversations(breederId, null);
  assert.ok(senInbox.some((item) => item.id === conversation.id));
  assert.ok(breederInbox.some((item) => item.id === conversation.id));
  const inboxRow = senInbox.find((item) => item.id === conversation.id);
  assert.match(inboxRow.last_message_preview, /available/i);
});
