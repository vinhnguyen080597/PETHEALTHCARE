import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMarketplaceEscrowEnabled,
  shouldShowMarketplaceDealUi,
} from '../src/utils/marketplaceEscrow.ts';

test('marketplace escrow flag is explicit opt-in', () => {
  assert.equal(isMarketplaceEscrowEnabled(null), false);
  assert.equal(isMarketplaceEscrowEnabled({ marketplace_escrow: true }), true);
});

test('deal UI shows for active legacy deal when escrow flag is off', () => {
  assert.equal(shouldShowMarketplaceDealUi({ marketplace_escrow: false }, true), true);
});
