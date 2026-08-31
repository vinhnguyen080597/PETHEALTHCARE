import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APP_FEATURE_FLAGS,
  isMarketplaceEscrowEnabled,
} from "../src/lib/featureFlags";

test("marketplace escrow defaults off and is explicit opt-in", () => {
  assert.equal(DEFAULT_APP_FEATURE_FLAGS.marketplace_escrow, false);
  assert.equal(isMarketplaceEscrowEnabled(null), false);
  assert.equal(isMarketplaceEscrowEnabled({}), false);
  assert.equal(isMarketplaceEscrowEnabled({ marketplace_escrow: false }), false);
  assert.equal(isMarketplaceEscrowEnabled({ marketplace_escrow: true }), true);
});
