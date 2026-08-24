import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canOpenOwnFarmProfile,
  resolveOwnFarmProfileId,
} from '../src/utils/ownFarmProfileNav.ts';

test('resolveOwnFarmProfileId prefers profile id then user_id', () => {
  assert.equal(resolveOwnFarmProfileId({ id: 'p1', user_id: 'u1' }), 'p1');
  assert.equal(resolveOwnFarmProfileId({ id: '', user_id: 'u1' }), 'u1');
  assert.equal(resolveOwnFarmProfileId({ id: null, user_id: 'u1' }), 'u1');
  assert.equal(resolveOwnFarmProfileId(null), null);
});

test('canOpenOwnFarmProfile only for verified or pending_review with an id', () => {
  assert.equal(canOpenOwnFarmProfile({ id: 'p1', verification_status: 'verified' }), true);
  assert.equal(canOpenOwnFarmProfile({ id: 'p1', verification_status: 'pending_review' }), true);
  assert.equal(canOpenOwnFarmProfile({ id: 'p1', verification_status: 'suspended' }), false);
  assert.equal(canOpenOwnFarmProfile({ id: '', user_id: '', verification_status: 'verified' }), false);
});
