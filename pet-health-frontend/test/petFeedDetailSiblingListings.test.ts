import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetFeedPost } from '../src/types.ts';
import {
  rankSimilarListing,
  similarForSaleListings,
} from '../src/utils/petFeedDetailSiblingListings.ts';

function post(overrides: Partial<PetFeedPost> & Pick<PetFeedPost, 'id'>): PetFeedPost {
  return {
    user_id: 'u1',
    breeder_profile_id: 'b1',
    title: 'Kitten',
    species: 'cat',
    pet_type: 'cat',
    breed: 'Persian',
    gender: 'female',
    age_months: 3,
    location: 'Ho Chi Minh',
    price_note: '5tr',
    description: '',
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: ['https://cdn.example/a.jpg'],
    video_url: null,
    contact: {},
    status: 'published',
    metadata: {},
    breeder_profile: null,
    is_favorited: false,
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

test('similarForSaleListings prioritizes same species same farm, then breed, then location', () => {
  const current = post({ id: 'p1', title: 'Current' });
  const results = similarForSaleListings(
    [
      current,
      post({ id: 'p2', title: 'Same farm species', created_at: '2026-08-05T00:00:00.000Z' }),
      post({
        id: 'p3',
        title: 'Other farm same species',
        breeder_profile_id: 'b2',
        user_id: 'u2',
        created_at: '2026-08-06T00:00:00.000Z',
      }),
      post({
        id: 'p4',
        title: 'Same farm different breed',
        breed: 'British',
        created_at: '2026-08-07T00:00:00.000Z',
      }),
      post({
        id: 'p5',
        title: 'Other farm same breed',
        breeder_profile_id: 'b3',
        user_id: 'u3',
        created_at: '2026-08-08T00:00:00.000Z',
      }),
      post({
        id: 'p6',
        title: 'Location only',
        species: 'dog',
        pet_type: 'dog',
        breed: 'Corgi',
        breeder_profile_id: 'b4',
        user_id: 'u4',
        location: 'Ho Chi Minh District 7',
        created_at: '2026-08-09T00:00:00.000Z',
      }),
      post({
        id: 'p7',
        title: 'Unrelated',
        species: 'dog',
        pet_type: 'dog',
        breed: 'Husky',
        breeder_profile_id: 'b5',
        user_id: 'u5',
        location: 'Da Nang',
        created_at: '2026-08-10T00:00:00.000Z',
      }),
      post({ id: 'p8', title: 'Sold', status: 'sold', metadata: { sold: true } }),
    ],
    current,
  );

  assert.deepEqual(results.map((item) => item.id), ['p2', 'p4', 'p5', 'p3', 'p6']);
});

test('rankSimilarListing returns null when no species, breed, or location overlap', () => {
  const current = post({ id: 'p1' });
  const unrelated = post({
    id: 'p2',
    species: 'dog',
    pet_type: 'dog',
    breed: 'Husky',
    location: 'Da Nang',
    breeder_profile_id: 'b9',
    user_id: 'u9',
  });
  assert.equal(rankSimilarListing(unrelated, current), null);
});
