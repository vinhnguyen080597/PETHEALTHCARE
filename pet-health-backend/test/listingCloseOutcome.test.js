import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCancelledListingMetadata,
  isSoldListingMetadata,
  listingTrustOutcome,
  resolveListingCloseOutcome,
} from '../src/utils/listingCloseOutcome.js';

test('sold and cancelled metadata stay distinct', () => {
  assert.equal(isSoldListingMetadata({ listing_outcome: 'sold' }), true);
  assert.equal(isCancelledListingMetadata({ listing_outcome: 'sold' }), false);
  assert.equal(isCancelledListingMetadata({ listing_outcome: 'cancelled' }), true);
  assert.equal(isSoldListingMetadata({ listing_outcome: 'cancelled' }), false);
  assert.equal(isCancelledListingMetadata({ cancelled: true }), true);
});

test('resolveListingCloseOutcome prefers status then metadata', () => {
  assert.equal(resolveListingCloseOutcome('cancelled', {}), 'cancelled');
  assert.equal(resolveListingCloseOutcome('sold', {}), 'sold');
  assert.equal(
    resolveListingCloseOutcome('published', { listing_outcome: 'cancelled' }),
    'cancelled',
  );
  assert.equal(
    resolveListingCloseOutcome('archived', { soft_status: 'cancelled' }),
    'cancelled',
  );
  assert.equal(resolveListingCloseOutcome('published', {}), null);
});

test('listingTrustOutcome maps sold positive and cancelled negative', () => {
  assert.equal(listingTrustOutcome('sold', {}), 'positive');
  assert.equal(listingTrustOutcome('cancelled', {}), 'negative');
  assert.equal(
    listingTrustOutcome('published', { listing_outcome: 'cancelled' }),
    'negative',
  );
  assert.equal(listingTrustOutcome('published', {}), null);
});
