import test from 'node:test';
import assert from 'node:assert/strict';
import { isMarketplaceEscrowEnabled } from '../src/utils/marketplaceEscrow.ts';

test('marketplace escrow flag is explicit opt-in', () => {
  assert.equal(isMarketplaceEscrowEnabled(null), false);
  assert.equal(isMarketplaceEscrowEnabled({ marketplace_escrow: true }), true);
});
