import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listingStatusChoicesExcludingCurrent,
  normalizeListingStatusChoice,
} from '../src/utils/listingStatusChoices.ts';

test('normalizeListingStatusChoice accepts known statuses', () => {
  assert.equal(normalizeListingStatusChoice('published'), 'published');
  assert.equal(normalizeListingStatusChoice('deposit_hold'), 'deposit_hold');
  assert.equal(normalizeListingStatusChoice('sold'), 'sold');
  assert.equal(normalizeListingStatusChoice('archived'), null);
});

test('listingStatusChoicesExcludingCurrent hides current status', () => {
  assert.deepEqual(listingStatusChoicesExcludingCurrent('published'), ['deposit_hold', 'sold']);
  assert.deepEqual(listingStatusChoicesExcludingCurrent('deposit_hold'), ['published', 'sold']);
  assert.deepEqual(listingStatusChoicesExcludingCurrent('sold'), ['published', 'deposit_hold']);
  assert.deepEqual(listingStatusChoicesExcludingCurrent('unknown'), [
    'published',
    'deposit_hold',
    'sold',
  ]);
});
