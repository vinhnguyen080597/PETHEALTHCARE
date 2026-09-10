import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowListingStatusUpdate,
  canShowWarrantyUpdateCta,
  listingAvailabilityBadgeKey,
  listingAvailabilityBadgeLabelKey,
  listingOverlayStatusLabelKey,
} from '../src/utils/listingAvailabilityBadge.ts';
import { listingPostActionsLocked } from '../src/utils/marketplaceListingCard.ts';

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
  assert.equal(
    listingOverlayStatusLabelKey({ status: 'pending_review', isSold: false, isCancelled: false }),
    'petFeed.card.pendingReview',
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

test('canShowListingStatusUpdate for owner on published/deposit_hold only', () => {
  assert.equal(canShowListingStatusUpdate({ isOwner: true, status: 'published' }), true);
  assert.equal(canShowListingStatusUpdate({ isOwner: true, status: 'deposit_hold' }), true);
  assert.equal(canShowListingStatusUpdate({ isOwner: true, status: 'sold' }), false);
  assert.equal(canShowListingStatusUpdate({ isOwner: false, status: 'sold' }), false);
});

test('canShowWarrantyUpdateCta for owner on published unfrozen listings', () => {
  assert.equal(canShowWarrantyUpdateCta({ isOwner: true, status: 'published' }), true);
  assert.equal(canShowWarrantyUpdateCta({ isOwner: true, status: 'pending_review' }), true);
  assert.equal(
    canShowWarrantyUpdateCta({ isOwner: true, status: 'published', frozen: true }),
    false,
  );
  assert.equal(canShowWarrantyUpdateCta({ isOwner: true, status: 'deposit_hold' }), false);
  assert.equal(canShowWarrantyUpdateCta({ isOwner: false, status: 'published' }), false);
});

test('listingPostActionsLocked when status sold or metadata marks sold', () => {
  assert.equal(listingPostActionsLocked({ status: 'sold' }), true);
  assert.equal(listingPostActionsLocked({ status: 'published' }), false);
  assert.equal(
    listingPostActionsLocked({ status: 'published', metadata: { sold: true } }),
    true,
  );
});
