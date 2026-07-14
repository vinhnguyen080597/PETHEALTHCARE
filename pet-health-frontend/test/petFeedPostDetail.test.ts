import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetFeedPost } from '../src/types.ts';
import { resolvePetFeedPostDetailView } from '../src/utils/petFeedPostDetail.ts';

function post(overrides: Partial<PetFeedPost> = {}): PetFeedPost {
  return {
    id: 'post-1',
    user_id: 'user-1',
    breeder_profile_id: null,
    title: 'Listing',
    species: 'cat',
    breed: '',
    gender: '',
    age_months: null,
    location: '',
    price_note: '',
    description: 'short',
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
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('returns null when no post is selected', () => {
  assert.equal(resolvePetFeedPostDetailView(null, post(), post({ media_urls: ['a', 'b'] })), null);
});

test('falls back to list post while detail has not loaded', () => {
  const listPost = post({ is_favorited: true, media_urls: ['https://cdn.example/first.jpg'] });
  assert.equal(resolvePetFeedPostDetailView('post-1', listPost, null), listPost);
});

test('uses detail post and overlays is_favorited from list', () => {
  const listPost = post({ is_favorited: true, media_urls: ['https://cdn.example/first.jpg'] });
  const detailPost = post({
    is_favorited: false,
    media_urls: ['https://cdn.example/first.jpg', 'https://cdn.example/second.jpg'],
    description: 'full description',
  });
  const view = resolvePetFeedPostDetailView('post-1', listPost, detailPost);
  assert.ok(view);
  assert.equal(view.is_favorited, true);
  assert.deepEqual(view.media_urls, detailPost.media_urls);
  assert.equal(view.description, 'full description');
});

test('uses detail post alone when list row is missing', () => {
  const detailPost = post({ media_urls: ['a', 'b'] });
  assert.equal(resolvePetFeedPostDetailView('post-1', null, detailPost), detailPost);
});
