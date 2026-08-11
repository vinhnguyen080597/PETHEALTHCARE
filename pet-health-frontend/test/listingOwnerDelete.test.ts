import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateOwnerDeleteListing,
  evaluatePetFeedPostDelete,
} from '../src/utils/listingOwnerDelete.ts';
import type { PetFeedPost } from '../src/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-08-11T12:00:00.000Z');

function post(overrides: Partial<PetFeedPost>): PetFeedPost {
  return {
    id: 'p1',
    user_id: 'owner-1',
    breeder_profile_id: 'b1',
    title: 'Pup',
    species: 'dog',
    breed: 'Poodle',
    gender: 'female',
    age_months: 3,
    location: 'HCM',
    price_note: '5.000.000',
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
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

test('published own listing is deletable', () => {
  assert.equal(
    evaluatePetFeedPostDelete(post({ status: 'published' }), 'owner-1', now).allowed,
    true,
  );
});

test('deposit hold own listing is not deletable', () => {
  assert.deepEqual(
    evaluatePetFeedPostDelete(post({ status: 'deposit_hold' }), 'owner-1', now),
    { allowed: false, reason: 'deposit_hold' },
  );
});

test('sold listing waits 7 days from deal.completed_at', () => {
  const blocked = evaluatePetFeedPostDelete(
    post({
      status: 'sold',
      metadata: {
        sold: true,
        deal: { completed_at: new Date(now - 1 * DAY_MS).toISOString() },
      },
    }),
    'owner-1',
    now,
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'sold_cooldown');
  assert.equal(blocked.daysRemaining, 6);

  assert.equal(
    evaluatePetFeedPostDelete(
      post({
        status: 'sold',
        metadata: {
          sold: true,
          deal: { completed_at: new Date(now - 8 * DAY_MS).toISOString() },
        },
      }),
      'owner-1',
      now,
    ).allowed,
    true,
  );
});

test('other users cannot delete', () => {
  assert.deepEqual(
    evaluateOwnerDeleteListing({ isOwner: false, status: 'published' }, now),
    { allowed: false, reason: 'not_owner' },
  );
});
