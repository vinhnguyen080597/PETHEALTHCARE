import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountListingStatusLabelKey,
  accountListingStatusTone,
} from '../src/utils/accountListingStatus.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('accountListingStatusLabelKey maps sold and cancelled', () => {
  assert.equal(accountListingStatusLabelKey('sold'), 'petFeed.status.sold');
  assert.equal(accountListingStatusLabelKey('cancelled'), 'petFeed.status.cancelled');
  assert.equal(accountListingStatusLabelKey('deposit_hold'), 'petFeed.status.deposit_hold');
  assert.equal(accountListingStatusLabelKey('PETFEED.STATUS.SOLD'), 'petFeed.status.sold');
  assert.equal(accountListingStatusLabelKey('SOLD'), 'petFeed.status.sold');
});

test('accountListingStatusTone: sold is gray-neutral family, published is green family', () => {
  assert.equal(accountListingStatusTone('sold'), 'sold');
  assert.equal(accountListingStatusTone('PETFEED.STATUS.SOLD'), 'sold');
  assert.equal(accountListingStatusTone('published'), 'published');
  assert.equal(accountListingStatusTone('pending_review'), 'pending');
});

test('petFeed.status EN/VI include sold and cancelled labels', () => {
  assert.equal(en.petFeed.status.sold, 'Sold');
  assert.equal(vi.petFeed.status.sold, 'Đã bán');
  assert.equal(en.petFeed.status.cancelled, 'Cancelled');
  assert.equal(vi.petFeed.status.cancelled, 'Đã hủy');
  assert.equal(vi.petFeed.status.published, 'Đã duyệt');
  assert.ok(en.petFeed.status.deposit_hold);
  assert.ok(vi.petFeed.status.deposit_hold);
});

test('account createPost EN/VI parity', () => {
  assert.ok(en.account.createPost.length > 0);
  assert.ok(vi.account.createPost.length > 0);
  assert.equal(vi.account.createPost, 'Đăng tin mới');
});
