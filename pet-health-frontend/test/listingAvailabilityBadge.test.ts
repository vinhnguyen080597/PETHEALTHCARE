import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowListingStatusUpdate,
  listingAvailabilityBadgeKey,
  listingAvailabilityBadgeLabelKey,
} from '../src/utils/listingAvailabilityBadge.ts';

test('listingAvailabilityBadgeKey maps published and deposit_hold', () => {
  assert.equal(listingAvailabilityBadgeKey('published'), 'available');
  assert.equal(listingAvailabilityBadgeKey('deposit_hold'), 'deposit_hold');
  assert.equal(
    listingAvailabilityBadgeLabelKey('available'),
    'listing.availability.available',
  );
});

test('canShowListingStatusUpdate for owner on published/deposit_hold/sold', () => {
  assert.equal(canShowListingStatusUpdate({ isOwner: true, status: 'sold' }), true);
  assert.equal(canShowListingStatusUpdate({ isOwner: false, status: 'sold' }), false);
});
