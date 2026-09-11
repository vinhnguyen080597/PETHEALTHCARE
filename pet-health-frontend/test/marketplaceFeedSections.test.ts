import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetFeedPost } from '../src/types.ts';
import {
  listingInterestScore,
  pickTopInterestedListings,
} from '../src/utils/marketplaceFeedSections.ts';
import { LISTING_CARD_RAIL_IMAGE_HEIGHT } from '../src/utils/marketplaceListingCard.ts';
import { isListingOpenForSale } from '../src/utils/farmPets.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

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
    favorite_count: 0,
    created_at: '2026-08-10T12:00:00.000Z',
    ...overrides,
  };
}

test('pickTopInterestedListings ranks by saves then stable id', () => {
  const now = Date.parse('2026-08-16T12:00:00.000Z');
  const rows = [
    post({ id: 'a', favorite_count: 2, created_at: '2026-08-10T12:00:00.000Z' }),
    post({ id: 'b', favorite_count: 20, created_at: '2026-08-10T12:00:00.000Z' }),
    post({ id: 'c', favorite_count: 0, created_at: '2026-08-16T10:00:00.000Z' }),
    post({ id: 'sold', favorite_count: 99, status: 'sold', created_at: '2026-08-10T12:00:00.000Z' }),
    post({
      id: 'zero',
      favorite_count: 0,
      video_url: null,
      created_at: '2026-07-01T12:00:00.000Z',
    }),
  ];
  assert.equal(pickTopInterestedListings(rows, 1, now)[0]?.id, 'b');
  assert.deepEqual(
    pickTopInterestedListings(rows, 8, now).map((item) => item.id),
    ['b', 'c', 'a'],
  );
  assert.ok(listingInterestScore(rows[1], now) > listingInterestScore(rows[0], now));
  assert.equal(listingInterestScore(rows[4], now), 0);
  assert.equal(isListingOpenForSale(post({ status: 'sold' })), false);
  assert.equal(isListingOpenForSale(post({ status: 'published' })), true);
});

test('rail image height matches web compact listing cards', () => {
  assert.equal(LISTING_CARD_RAIL_IMAGE_HEIGHT, 160);
});

test('top interested section i18n exists in EN and VI', () => {
  assert.equal(vi.petFeed.section.top.title, 'Top bé được quan tâm');
  assert.equal(en.petFeed.section.top.title, 'Most loved today');
  assert.ok(vi.petFeed.section.top.subtitle);
  assert.equal(vi.petFeed.section.results, 'kết quả');
});
