import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowListingStatusUpdate,
  listingAvailabilityBadgeKey,
  listingAvailabilityBadgeLabelKey,
  listingOverlayStatusLabelKey,
} from '../src/utils/listingAvailabilityBadge.ts';

test('listingOverlayStatusLabelKey maps availability statuses to top-right labels', () => {
  assert.equal(
    listingOverlayStatusLabelKey({ status: 'published', isSold: false, isCancelled: false }),
    'listing.availability.available',
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: 'deposit_hold', isSold: false, isCancelled: false }),
    'listing.availability.depositHold',
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: 'sold', isSold: true, isCancelled: false }),
    'petFeed.card.sold',
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: 'published', isSold: false, isCancelled: true }),
    null,
  );
});

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
