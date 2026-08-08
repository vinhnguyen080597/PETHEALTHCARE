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
  createPetFeedPostComment,
  getPublicBreederProfile,
  getPublicPetFeedPost,
  listPetFeedPostComments,
  listPublicPetFeedPostPage,
  listPublicVerifiedBreederProfiles,
  upsertMyBreederProfile,
} = await import('../src/repositories/petFeedRepository.js');

test('listPublicPetFeedPostPage returns published announcements without contact', async () => {
  const userId = `public-list-${Date.now()}`;
  const created = await createAnnouncementPost(userId, {
    title: 'Public news',
    description: 'B'.repeat(320),
    category: 'general',
    mediaUrls: [
      'https://cdn.example/a.jpg',
      'https://cdn.example/b.jpg',
    ],
  }, null);

  const page = await listPublicPetFeedPostPage({ limit: 50, kind: 'announcement' });
  const item = page.data.find((post) => post.id === created.id);
  assert.ok(item);
  assert.equal(item.media_urls.length, 1);
  assert.equal(item.description.length, 280);
  assert.deepEqual(item.contact, {});
  assert.equal(item.is_favorited, false);
});

test('getPublicPetFeedPost returns full published detail', async () => {
  const userId = `public-detail-${Date.now()}`;
  const mediaUrls = [
    'https://cdn.example/d1.jpg',
    'https://cdn.example/d2.jpg',
  ];
  const created = await createAnnouncementPost(userId, {
    title: 'Detail news',
    description: 'C'.repeat(350),
    category: 'community',
    mediaUrls,
  }, null);

  const detail = await getPublicPetFeedPost(created.id);
  assert.ok(detail);
  assert.deepEqual(detail.media_urls, mediaUrls);
  assert.equal(detail.description.length, 350);
});

test('public breeder directory and profile include only verified breeders', async () => {
  const userId = `public-breeder-${Date.now()}`;
  const profile = await upsertMyBreederProfile(userId, {
    displayName: 'Public Cattery',
    bio: 'Indoor cats',
    location: 'TP.HCM',
    contact: { zalo: '0901111222' },
    primarySpecies: ['cat'],
    mainBreeds: ['British Shorthair'],
    careEnvironment: 'Indoor',
  }, null);
  assert.ok(profile?.id);

  await adminUpdateBreederProfileStatus(userId, 'verified');
  const listing = await createPetFeedPost(userId, {
    title: 'Kitten listing',
    species: 'cat',
    breed: 'British Shorthair',
    gender: 'female',
    ageMonths: 3,
    location: 'TP.HCM',
    priceNote: '8.000.000',
    description: 'Healthy kitten',
    personality: ['Calm'],
    vaccineStatus: '2 shots',
    dewormingStatus: 'Done',
    paperwork: ['Vaccine book'],
    mediaUrls: ['https://cdn.example/kitten.jpg'],
    videoUrl: 'https://cdn.example/kitten.mp4',
    contact: { zalo: '0901111222' },
    status: 'pending_review',
    metadata: { health_evidence_urls: ['https://cdn.example/vaccine-book.jpg'] },
  }, null);
  assert.ok(listing?.id);
  await adminUpdatePetFeedPostStatus(listing.id, 'published');

  const breeders = await listPublicVerifiedBreederProfiles({ limit: 50 });
  const listed = breeders.data.find((row) => row.id === profile.id);
  assert.ok(listed);
  assert.equal(listed.verification_status, 'verified');
  assert.equal(listed.contact, undefined);
  assert.equal(listed.metadata?.active_listings, 1);
  assert.deepEqual(listed.metadata?.contact_presence, {
    zalo: true,
    phone: false,
    facebook: false,
    tiktok: false,
  });

  const detail = await getPublicBreederProfile(profile.id);
  assert.ok(detail);
  assert.equal(detail.profile.id, profile.id);
  assert.equal(detail.profile.contact?.zalo, '0901111222');
  assert.ok(detail.listings.some((post) => post.title === 'Kitten listing'));
  for (const post of detail.listings) {
    assert.deepEqual(post.contact, {});
  }
});

test('public published posts expose comments without auth token', async () => {
  const userId = `public-comments-${Date.now()}`;
  const created = await createAnnouncementPost(userId, {
    title: 'News with comments',
    description: 'D'.repeat(320),
    category: 'general',
    mediaUrls: ['https://cdn.example/news.jpg'],
  }, null);
  assert.ok(created?.id);

  await createPetFeedPostComment(userId, created.id, 'Public-safe question', null);
  const published = await getPublicPetFeedPost(created.id);
  assert.ok(published);

  const comments = await listPetFeedPostComments(created.id, null);
  assert.ok(comments.some((row) => row.body === 'Public-safe question'));
});
