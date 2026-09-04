import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTransparencyScore,
  getTransparencyTier,
  transparencyScoreColor,
  transparencyTickColor,
  TRANSPARENCY_TICK_INACTIVE,
  TRANSPARENCY_TIERS,
} from '../src/utils/breederTransparencyScore.ts';
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

test('unverified mobile profile floors to Trại mới, not alarm bands', () => {
  const profile = {
    id: 'bp-2',
    user_id: 'u-2',
    display_name: 'Pending',
    verification_status: 'pending_review',
    metadata: {},
  } as BreederProfile;
  assert.equal(computeBreederTrust(profile, []).score, 0);
  assert.equal(getTransparencyTier(0).level, 'L2');
  assert.equal(trustLevelFromScore(0).level, 'L2');
});

test('transparency tiers start at Trại mới — no bands below 30', () => {
  assert.equal(TRANSPARENCY_TIERS.length, 4);
  assert.equal(TRANSPARENCY_TIERS[0].min, 30);
  assert.equal(getTransparencyTier(16).nameVI, 'Trại mới');
  assert.equal(getTransparencyTier(30).nameVI, 'Trại mới');
  assert.equal(getTransparencyTier(100).nameVI, 'Trại uy tín hàng đầu');
});

test('gauge ticks use one accumulation color per score, never alarm red', () => {
  assert.equal(transparencyScoreColor(30), '#F97316');
  assert.equal(transparencyScoreColor(75), '#0284C7');
  assert.equal(transparencyScoreColor(100), '#10B981');
  assert.equal(transparencyTickColor(10, 75), '#0284C7');
  assert.equal(transparencyTickColor(90, 75), TRANSPARENCY_TICK_INACTIVE);
});
