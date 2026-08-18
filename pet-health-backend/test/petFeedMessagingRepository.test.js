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
  openPetFeedConversationForBreeder,
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
  assert.ok(conversation.post_summary);
  assert.equal(conversation.post_summary.id, published.id);
  assert.equal(conversation.post_summary.breed, 'British');
  assert.ok(conversation.post_summary.thumb_url);
  assert.equal(conversation.peer_display_name, 'Message Cattery');
  assert.equal(conversation.farm_display_name, 'Message Cattery');
  assert.equal(conversation.last_message_preview, 'Kitten for chat');

  const seeded = await listPetFeedConversationMessages(senId, conversation.id, null);
  assert.equal(seeded.length, 1);
  assert.equal(seeded[0].listing_share?.id, published.id);
  assert.equal(seeded[0].listing_share?.title, 'Kitten for chat');
  assert.equal(seeded[0].body, '');

  const again = await openPetFeedConversation(senId, post.id, null);
  assert.equal(again.id, conversation.id);
  const stillOne = await listPetFeedConversationMessages(senId, conversation.id, null);
  assert.equal(stillOne.length, 1);

  const first = await sendPetFeedConversationMessage(senId, conversation.id, 'Is this baby still available?', null);
  assert.equal(first.body, 'Is this baby still available?');
  const second = await sendPetFeedConversationMessage(breederId, conversation.id, 'Yes, still available.', null);
  assert.equal(second.sender_user_id, breederId);

  let senInbox = await listPetFeedConversations(senId, null);
  let breederInbox = await listPetFeedConversations(breederId, null);
  assert.equal(senInbox.find((item) => item.id === conversation.id)?.has_unread, true);
  assert.equal(breederInbox.find((item) => item.id === conversation.id)?.has_unread, false);

  const messages = await listPetFeedConversationMessages(senId, conversation.id, null);
  assert.equal(messages.length, 3);
  assert.equal(messages[0].listing_share?.id, published.id);
  assert.equal(messages[1].body, 'Is this baby still available?');
  assert.equal(messages[2].body, 'Yes, still available.');

  senInbox = await listPetFeedConversations(senId, null);
  breederInbox = await listPetFeedConversations(breederId, null);
  assert.ok(senInbox.some((item) => item.id === conversation.id));
  assert.ok(breederInbox.some((item) => item.id === conversation.id));
  const inboxRow = senInbox.find((item) => item.id === conversation.id);
  assert.match(inboxRow.last_message_preview, /available/i);
  assert.equal(inboxRow.has_unread, false);
});

test('sen can open conversation on deposit_hold listing', async () => {
  const breederId = `msg-dep-breeder-${Date.now()}`;
  const senId = `msg-dep-sen-${Date.now()}`;

  await upsertMyBreederProfile(breederId, {
    displayName: 'Deposit Chat Farm',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const post = await createPetFeedPost(breederId, {
    title: 'Deposit chat kitten',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
    videoUrl: 'https://cdn.example/video.mp4',
  }, null);
  await adminUpdatePetFeedPostStatus(post.id, 'published');
  const held = await adminUpdatePetFeedPostStatus(post.id, 'deposit_hold');
  assert.equal(held.status, 'deposit_hold');

  const conversation = await openPetFeedConversation(senId, held.id, null);
  assert.equal(conversation.post_id, held.id);
  const message = await sendPetFeedConversationMessage(
    senId,
    conversation.id,
    'When can I pick up?',
    null,
  );
  assert.equal(message.body, 'When can I pick up?');
});

test('chat messages can be media-only and keep a photo preview', async () => {
  const breederId = `msg-media-breeder-${Date.now()}`;
  const senId = `msg-media-sen-${Date.now()}`;

  await upsertMyBreederProfile(breederId, {
    displayName: 'Media Chat Farm',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const post = await createPetFeedPost(breederId, {
    title: 'Media chat kitten',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
  }, null);
  const published = await adminUpdatePetFeedPostStatus(post.id, 'published');
  const conversation = await openPetFeedConversation(senId, published.id, null);

  await assert.rejects(
    () => sendPetFeedConversationMessage(senId, conversation.id, '   ', null),
    (error) => error?.code === 'PET_FEED_MESSAGE_EMPTY',
  );

  const photo = await sendPetFeedConversationMessage(senId, conversation.id, '', null, {
    mediaUrls: ['https://cdn.example/chat.jpg', 'javascript:alert(1)'],
  });
  assert.equal(photo.body, '');
  assert.deepEqual(photo.media_urls, ['https://cdn.example/chat.jpg']);

  const video = await sendPetFeedConversationMessage(senId, conversation.id, '', null, {
    mediaUrls: ['https://cdn.example/clip.mp4'],
  });
  assert.equal(video.media_urls[0], 'https://cdn.example/clip.mp4');

  const inbox = await listPetFeedConversations(senId, null);
  const row = inbox.find((item) => item.id === conversation.id);
  assert.equal(row.last_message_preview, '[Video]');

  const captioned = await sendPetFeedConversationMessage(
    senId,
    conversation.id,
    'Look at this',
    null,
    { mediaUrls: ['https://cdn.example/chat2.jpg'] },
  );
  assert.equal(captioned.body, 'Look at this');
  const after = await listPetFeedConversations(senId, null);
  assert.equal(after.find((item) => item.id === conversation.id)?.last_message_preview, 'Look at this');
});

test('sen can open a direct farm conversation without a listing id', async () => {
  const breederId = `msg-farm-breeder-${Date.now()}`;
  const senId = `msg-farm-sen-${Date.now()}`;

  const profile = await upsertMyBreederProfile(breederId, {
    displayName: 'Directory Cattery',
    location: 'Hanoi',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const first = await openPetFeedConversationForBreeder(senId, profile.id, null);
  assert.equal(first.post_id, null);
  assert.equal(first.breeder_profile_id, profile.id);
  assert.equal(first.sen_user_id, senId);
  assert.equal(first.breeder_user_id, breederId);
  assert.equal(first.peer_display_name, 'Directory Cattery');
  assert.equal(first.farm_display_name, 'Directory Cattery');

  const breederView = await listPetFeedConversations(breederId, null);
  assert.equal(breederView.find((item) => item.id === first.id)?.peer_display_name, 'Pet Health user');

  const soldPost = await createPetFeedPost(breederId, {
    title: 'Already rehomed',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/sold.jpg'],
  }, null);
  await adminUpdatePetFeedPostStatus(soldPost.id, 'published');
  await adminUpdatePetFeedPostStatus(soldPost.id, 'sold');

  const again = await openPetFeedConversationForBreeder(senId, profile.id, null);
  assert.equal(again.id, first.id);
  assert.equal(again.post_id, null);

  const livePost = await createPetFeedPost(breederId, {
    title: 'Open kitten',
    species: 'cat',
    breed: 'British',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/live.jpg'],
  }, null);
  await adminUpdatePetFeedPostStatus(livePost.id, 'published');

  const conversation = await openPetFeedConversationForBreeder(senId, profile.id, null);
  assert.equal(conversation.id, first.id);
  assert.equal(conversation.post_id, null);
  assert.equal(conversation.breeder_profile_id, profile.id);
  assert.equal(conversation.sen_user_id, senId);
  assert.equal(conversation.breeder_user_id, breederId);

  const sent = await sendPetFeedConversationMessage(senId, first.id, 'Hello farm', null);
  assert.equal(sent.body, 'Hello farm');
  const farmMessages = await listPetFeedConversationMessages(senId, first.id, null);
  assert.equal(farmMessages.length, 1);

  const fromListing = await openPetFeedConversation(senId, livePost.id, null);
  assert.equal(fromListing.id, first.id);
  assert.equal(fromListing.post_id, livePost.id);
  const afterListing = await listPetFeedConversationMessages(senId, first.id, null);
  assert.equal(afterListing.length, 2);
  assert.equal(afterListing[0].body, 'Hello farm');
  assert.equal(afterListing[1].listing_share?.id, livePost.id);
});

test('one sen and one farm share a single thread across listings', async () => {
  const breederId = `msg-one-farm-${Date.now()}`;
  const senId = `msg-one-farm-sen-${Date.now()}`;
  const profile = await upsertMyBreederProfile(breederId, {
    displayName: 'One Thread Farm',
    location: 'Da Nang',
    primarySpecies: ['dog'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const firstPost = await createPetFeedPost(breederId, {
    title: 'First puppy',
    species: 'dog',
    breed: 'Corgi',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/one.jpg'],
  }, null);
  const firstPublished = await adminUpdatePetFeedPostStatus(firstPost.id, 'published');
  const secondPost = await createPetFeedPost(breederId, {
    title: 'Second puppy',
    species: 'dog',
    breed: 'Poodle',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/two.jpg'],
  }, null);
  const secondPublished = await adminUpdatePetFeedPostStatus(secondPost.id, 'published');

  const firstThread = await openPetFeedConversation(senId, firstPublished.id, null);
  await sendPetFeedConversationMessage(senId, firstThread.id, 'About the first baby', null);
  const secondThread = await openPetFeedConversation(senId, secondPublished.id, null);
  assert.equal(secondThread.id, firstThread.id);
  assert.equal(secondThread.post_id, secondPublished.id);

  const farmThread = await openPetFeedConversationForBreeder(senId, profile.id, null);
  assert.equal(farmThread.id, firstThread.id);
  assert.equal(farmThread.post_id, secondPublished.id);

  const messages = await listPetFeedConversationMessages(senId, firstThread.id, null);
  assert.equal(messages.length, 3);
  assert.equal(messages[0].listing_share?.id, firstPublished.id);
  assert.equal(messages[1].body, 'About the first baby');
  assert.equal(messages[2].listing_share?.id, secondPublished.id);
});
