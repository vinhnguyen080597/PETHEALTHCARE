import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  adminUpdateBreederProfileStatus,
  adminUpdatePetFeedPostStatus,
  adminUpdatePetFeedReportStatus,
  cancelMyBreederVerificationRequest,
  createAnnouncementPost,
  createPetFeedPost,
  createPetFeedPostComment,
  deletePetFeedPostComment,
  getMyBreederProfile,
  getPetFeedPost,
  listPetFeedPostComments,
  listPublishedPetFeedPostPage,
  listPublicPetFeedPostPage,
  reportBreederProfile,
  reportPetFeedPost,
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
  assert.deepEqual(listItem.media_urls, mediaUrls);
  assert.equal(listItem.media_count, 3);
  assert.equal(listItem.description, longDescription);

  const detail = await getPetFeedPost(userId, created.id, null);
  assert.ok(detail);
  assert.deepEqual(detail.media_urls, mediaUrls);
  assert.equal(detail.description, longDescription);
});

test('list page exposes breeder review metrics on slim breeder_profile', async () => {
  const breederId = `review-breeder-${Date.now()}`;
  await upsertMyBreederProfile(breederId, {
    displayName: 'Review Farm',
    location: 'Hà Nội',
    avatarUrl: 'https://cdn.example/farm-avatar.jpg',
    metadata: { review_avg: 5, review_count: 2 },
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const created = await createPetFeedPost(breederId, {
    title: 'Kitten with reviews',
    species: 'cat',
    breed: 'Sphynx',
    gender: 'female',
    ageMonths: 3,
    location: 'Hà Nội',
    priceNote: '15tr',
    description: 'Healthy kitten with breeder reviews on the listing card.',
    vaccineStatus: 'unknown',
    mediaUrls: ['https://cdn.example/pet-feed/sphynx.jpg'],
    status: 'published',
    metadata: {},
  }, null);
  await adminUpdatePetFeedPostStatus(created.id, 'published');

  const listPage = await listPublishedPetFeedPostPage(null, null, { limit: 50, kind: 'listing' });
  const listItem = listPage.data.find((post) => post.id === created.id);
  assert.ok(listItem);
  assert.equal(listItem.breeder_profile?.metadata?.review_avg, 5);
  assert.equal(listItem.breeder_profile?.metadata?.review_count, 2);
  assert.equal(listItem.breeder_profile?.avatar_url, 'https://cdn.example/farm-avatar.jpg');

  const publicPage = await listPublicPetFeedPostPage({ limit: 50, kind: 'listing' });
  const publicItem = publicPage.data.find((post) => post.id === created.id);
  assert.ok(publicItem);
  assert.equal(publicItem.breeder_profile?.metadata?.review_avg, 5);
  assert.equal(publicItem.breeder_profile?.metadata?.review_count, 2);
  assert.equal(publicItem.breeder_profile?.avatar_url, 'https://cdn.example/farm-avatar.jpg');
  assert.ok(publicItem.breeder_profile?.metadata?.contact_presence);
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
  assert.deepEqual(listItem.media_urls, [listThumb, mediaUrls[0], mediaUrls[1]]);
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

test('comment replies, delete, and list comment_count', async () => {
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

  await deletePetFeedPostComment(readerId, root.id, null);
  const afterDelete = await listPetFeedPostComments(post.id, null);
  assert.equal(afterDelete.length, 0);
});

test('admin reviewed report appends compliance penalty once; dismiss does not', async () => {
  const breederId = `penalty-breeder-${Date.now()}`;
  const reporterId = `penalty-reporter-${Date.now()}`;
  const created = await upsertMyBreederProfile(breederId, {
    displayName: 'Penalty Farm',
    location: 'Hà Nội',
    contact: { phone: '0901111222' },
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const openReport = await reportBreederProfile(reporterId, created.id, { reason: 'inaccurate_listing', note: 'fake vaccine' }, null);
  const dismissed = await reportBreederProfile(reporterId, created.id, { reason: 'stock_photo_spam', note: 'noise' }, null);

  await adminUpdatePetFeedReportStatus(dismissed.id, 'dismissed');
  let profile = await getMyBreederProfile(breederId, null);
  assert.equal(profile.metadata?.compliance?.score ?? 100, 100);
  assert.equal(Array.isArray(profile.metadata?.compliance?.events) ? profile.metadata.compliance.events.length : 0, 0);

  await adminUpdatePetFeedReportStatus(openReport.id, 'reviewed');
  profile = await getMyBreederProfile(breederId, null);
  assert.equal(profile.metadata.compliance.score, 90);
  assert.equal(profile.metadata.compliance.events.length, 1);
  assert.equal(profile.metadata.compliance.events[0].reportId, openReport.id);
  assert.equal(profile.metadata.compliance.events[0].points, 10);

  await adminUpdatePetFeedReportStatus(openReport.id, 'reviewed');
  profile = await getMyBreederProfile(breederId, null);
  assert.equal(profile.metadata.compliance.events.length, 1);
  assert.equal(profile.metadata.compliance.score, 90);
});

test('admin reviewed post report applies penalty to listing owner breeder', async () => {
  const breederId = `post-penalty-breeder-${Date.now()}`;
  const reporterId = `post-penalty-reporter-${Date.now()}`;
  const created = await upsertMyBreederProfile(breederId, {
    displayName: 'Listing Farm',
    location: 'Đà Nẵng',
    contact: { phone: '0903333444' },
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const post = await createPetFeedPost(breederId, {
    title: 'Kitten for review',
    species: 'cat',
    breed: 'Persian',
    gender: 'female',
    ageMonths: 3,
    location: 'Đà Nẵng',
    priceNote: '5tr',
    description: 'Healthy kitten with clear photos and care notes for a new home.',
    vaccineStatus: 'unknown',
    mediaUrls: ['https://cdn.example/pet-feed/photo.jpg'],
    videoUrl: 'https://cdn.example/pet-feed/video.mp4',
    status: 'published',
    metadata: {},
  }, null);
  assert.equal(post.breeder_profile_id, created.id);

  const report = await reportPetFeedPost(reporterId, post.id, { reason: 'concealed_illness', note: 'fake papers' }, null);
  await adminUpdatePetFeedReportStatus(report.id, 'reviewed');

  const profile = await getMyBreederProfile(breederId, null);
  assert.equal(profile.metadata.compliance.score, 75);
  assert.equal(profile.metadata.compliance.events.length, 1);
  assert.equal(profile.metadata.compliance.events[0].reportId, report.id);
  assert.equal(profile.metadata.compliance.events[0].points, 25);
});

test('deposit_hold listings stay readable and commentable for Sen', async () => {
  const {
    adminUpdateBreederProfileStatus,
    adminUpdatePetFeedPostStatus,
    canViewerAccessPetFeedPost,
    createPetFeedPost,
    createPetFeedPostComment,
    getPetFeedPost,
    isPetFeedPostOpenForEngagement,
    upsertMyBreederProfile,
  } = await import('../src/repositories/petFeedRepository.js');

  assert.equal(isPetFeedPostOpenForEngagement('published'), true);
  assert.equal(isPetFeedPostOpenForEngagement('deposit_hold'), true);
  assert.equal(isPetFeedPostOpenForEngagement('sold'), false);
  assert.equal(
    canViewerAccessPetFeedPost(
      {
        user_id: 'owner',
        status: 'deposit_hold',
        metadata: {},
      },
      'sen-viewer',
    ),
    true,
  );
  assert.equal(
    canViewerAccessPetFeedPost(
      {
        user_id: 'owner',
        status: 'draft',
        metadata: {},
      },
      'sen-viewer',
    ),
    false,
  );

  const breederId = `dep-engage-breeder-${Date.now()}`;
  const senId = `dep-engage-sen-${Date.now()}`;
  await upsertMyBreederProfile(breederId, {
    displayName: 'Deposit Engage Farm',
    location: 'HCMC',
    primarySpecies: ['cat'],
  }, null);
  await adminUpdateBreederProfileStatus(breederId, 'verified');

  const created = await createPetFeedPost(breederId, {
    title: 'Deposit engage kitten',
    species: 'cat',
    breed: 'Mix',
    status: 'pending_review',
    mediaUrls: ['https://cdn.example/photo.jpg'],
    videoUrl: 'https://cdn.example/video.mp4',
  }, null);
  await adminUpdatePetFeedPostStatus(created.id, 'published');
  const held = await adminUpdatePetFeedPostStatus(created.id, 'deposit_hold');
  assert.equal(held.status, 'deposit_hold');

  const forSen = await getPetFeedPost(senId, created.id, null);
  assert.ok(forSen);
  assert.equal(forSen.status, 'deposit_hold');

  const comment = await createPetFeedPostComment(senId, created.id, 'Still coordinating pickup', null);
  assert.equal(comment.body, 'Still coordinating pickup');
});
