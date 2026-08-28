import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetFeedPost } from '../src/types.ts';
import {
  isListingNewOnFloor,
  listingBreederFooterMetrics,
  listingHotBadges,
  listingSpeciesEmoji,
  listingTrustTags,
  listingWarrantyCoverageDays,
  parseListingEscrowEnabled,
} from '../src/utils/marketplaceListingCard.ts';

function post(overrides: Partial<PetFeedPost> = {}): PetFeedPost {
  return {
    id: 'p1',
    user_id: 'u1',
    breeder_profile_id: null,
    title: 'Test',
    species: 'cat',
    breed: 'Meo ta',
    gender: 'male',
    age_months: 2,
    location: 'An Giang',
    price_note: '333333 VND',
    description: '',
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: [],
    video_url: null,
    contact: {},
    status: 'published',
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test('listingSpeciesEmoji maps common species', () => {
  assert.equal(listingSpeciesEmoji('cat'), '🐱');
  assert.equal(listingSpeciesEmoji('dog'), '🐶');
});

test('listingHotBadges uses saves, new, and video signals', () => {
  const now = Date.parse('2026-08-15T12:00:00.000Z');
  const badges = listingHotBadges(
    {
      created_at: '2026-08-15T10:00:00.000Z',
      favorite_count: 2,
      video_url: 'https://example.com/v.mp4',
    },
    now,
  );
  assert.deepEqual(badges.map((b) => b.kind), ['saves', 'new', 'video']);
  assert.equal(isListingNewOnFloor({ created_at: '2026-08-10T10:00:00.000Z' }, now), false);
});

test('listingTrustTags prefers warranty and escrow from real fields', () => {
  const postWithEscrow = {
    ...post(),
    vaccine_status: 'Đủ mũi',
    metadata: { escrow_enabled: true },
    warranty_policy: {
      care_parvo_coverage_days: 30,
    },
  } as PetFeedPost;
  assert.deepEqual(
    listingTrustTags(postWithEscrow, { showEscrowTag: true }).map((tag) => tag.kind),
    ['warranty', 'escrow'],
  );
  const withoutEscrow = listingTrustTags(postWithEscrow, { showEscrowTag: false }).map((tag) => tag.kind);
  assert.ok(withoutEscrow.includes('warranty'));
  assert.ok(!withoutEscrow.includes('escrow'));
  assert.equal(listingWarrantyCoverageDays({ careParvoCoverageDays: 30 }), 30);
  assert.equal(parseListingEscrowEnabled({ accept_escrow: true }), true);
});

test('listingBreederFooterMetrics formats rating and trust score for card footer', () => {
  const withReviews = listingBreederFooterMetrics(
    {
      breeder_profile: {
        metadata: { review_avg: 5, review_count: 2 },
      } as PetFeedPost['breeder_profile'],
    },
    66.4,
  );
  assert.equal(withReviews.ratingText, '5.0/5 (2)');
  assert.equal(withReviews.trustScore, 66);

  const noReviews = listingBreederFooterMetrics({ breeder_profile: null }, 30);
  assert.equal(noReviews.ratingText, null);
  assert.equal(noReviews.trustScore, 30);
});

test('pet feed card i18n has EN/VI parity', async () => {
  const en = (await import('../src/i18n/locales/en.json', { with: { type: 'json' } })).default;
  const vi = (await import('../src/i18n/locales/vi.json', { with: { type: 'json' } })).default;
  for (const key of ['saves', 'new', 'video', 'warranty', 'escrow', 'chat', 'reserved', 'depositHold'] as const) {
    assert.ok(en.petFeed.card[key], `missing EN petFeed.card.${key}`);
    assert.ok(vi.petFeed.card[key], `missing VI petFeed.card.${key}`);
  }
});
