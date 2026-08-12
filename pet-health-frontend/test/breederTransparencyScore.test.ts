import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTransparencyScore, getTransparencyTier } from '../src/utils/breederTransparencyScore.ts';
import { computeBreederTrust } from '../src/utils/breederTrust.ts';
import { trustLevelFromScore } from '../src/utils/breederTrustLevel.ts';
import type { BreederProfile } from '../src/types.ts';

test('mobile computeBreederTrust uses verified 30 base', () => {
  const profile = {
    id: 'bp-1',
    user_id: 'u-1',
    display_name: 'Farm',
    verification_status: 'verified',
    metadata: {},
  } as BreederProfile;
  assert.equal(computeBreederTrust(profile, []).score, 30);
});

test('mobile trustLevelFromScore maps 80 to L4', () => {
  assert.equal(trustLevelFromScore(80).labelKey, 'breederTrustLevel.L4');
});

test('unverified mobile profile scores 0', () => {
  const profile = {
    id: 'bp-2',
    user_id: 'u-2',
    display_name: 'Pending',
    verification_status: 'pending_review',
    metadata: {},
  } as BreederProfile;
  assert.equal(computeBreederTrust(profile, []).score, 0);
  assert.equal(getTransparencyTier(0).level, 'L0');
});
