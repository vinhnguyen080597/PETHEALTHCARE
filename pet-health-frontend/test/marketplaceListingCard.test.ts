import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetFeedPost } from '../src/types.ts';
import {
  formatListingCardPostedDate,
  isListingNewOnFloor,
  isOwnListingPost,
  listingBreederFooterMetrics,
  listingCardShowsEditAction,
  LISTING_CARD_IMAGE_HEIGHT,
  listingHotBadges,
  listingSpeciesEmoji,
  listingWarrantyCoverageDays,
  readListingWarrantyPolicy,
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

test('listing card image height matches pet feed detail hero', () => {
  assert.equal(LISTING_CARD_IMAGE_HEIGHT, 288);
});

test('formatListingCardPostedDate returns locale short date', () => {
  assert.equal(
    formatListingCardPostedDate('2026-08-30T10:00:00.000Z', 'vi'),
    new Date('2026-08-30T10:00:00.000Z').toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  );
  assert.equal(formatListingCardPostedDate('', 'vi'), '');
});

test('listingHotBadges uses saves and new signals without video tag', () => {
  const now = Date.parse('2026-08-15T12:00:00.000Z');
  const badges = listingHotBadges(
    {
      created_at: '2026-08-15T10:00:00.000Z',
      favorite_count: 2,
    },
    now,
  );
  assert.deepEqual(badges.map((b) => b.kind), ['saves', 'new']);
  assert.equal(isListingNewOnFloor({ created_at: '2026-08-10T10:00:00.000Z' }, now), false);
});

test('listingWarrantyCoverageDays reads policy coverage from post metadata', () => {
  const postWithWarranty = {
    ...post(),
    warranty_policy: {
      care_parvo_coverage_days: 30,
    },
  } as PetFeedPost;
  assert.equal(listingWarrantyCoverageDays(readListingWarrantyPolicy(postWithWarranty)), 30);
  assert.equal(listingWarrantyCoverageDays({ careParvoCoverageDays: 30 }), 30);
});

test('listingCardShowsEditAction only for own posts with an edit handler', () => {
  assert.equal(isOwnListingPost('u1', { user_id: 'u1' }), true);
  assert.equal(isOwnListingPost('u2', { user_id: 'u1' }), false);
  assert.equal(listingCardShowsEditAction(true, true), true);
  assert.equal(listingCardShowsEditAction(true, false), false);
  assert.equal(listingCardShowsEditAction(false, true), false);
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
  for (const key of ['saves', 'new', 'video', 'warranty', 'escrow', 'chat'] as const) {
    assert.ok(en.petFeed.card[key], `missing EN petFeed.card.${key}`);
    assert.ok(vi.petFeed.card[key], `missing VI petFeed.card.${key}`);
  }
});
