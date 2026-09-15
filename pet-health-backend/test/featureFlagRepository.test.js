import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  normalizeFeatureFlags,
} from '../src/repositories/featureFlagRepository.js';

test('FEATURE_FLAG_KEYS includes farm_template_change', () => {
  assert.ok(FEATURE_FLAG_KEYS.includes('farm_template_change'));
  assert.equal(DEFAULT_FEATURE_FLAGS.farm_template_change, true);
});

test('normalizeFeatureFlags defaults farm_template_change on', () => {
  assert.equal(normalizeFeatureFlags({}).farm_template_change, true);
  assert.equal(normalizeFeatureFlags({ farm_template_change: false }).farm_template_change, false);
  assert.equal(normalizeFeatureFlags({ farm_template_change: true }).farm_template_change, true);
});

test('marketplace_escrow is opt-in and included in FEATURE_FLAG_KEYS', () => {
  assert.ok(FEATURE_FLAG_KEYS.includes('marketplace_escrow'));
  assert.equal(DEFAULT_FEATURE_FLAGS.marketplace_escrow, false);
  assert.equal(normalizeFeatureFlags({}).marketplace_escrow, false);
  assert.equal(normalizeFeatureFlags({ marketplace_escrow: true }).marketplace_escrow, true);
  assert.equal(normalizeFeatureFlags({ marketplace_escrow: false }).marketplace_escrow, false);
});
