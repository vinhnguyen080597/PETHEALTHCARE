import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTransparencyScoreFromProfile,
  shouldTriggerTransparencyWarning,
} from '../src/utils/transparencyWarnings.js';

test('unverified profile scores 0 and never triggers warning', () => {
  const result = computeTransparencyScoreFromProfile({
    verification_status: 'unverified',
    metadata: { penaltyPoints: 40 },
  });
  assert.equal(result.score, 0);
  assert.equal(
    shouldTriggerTransparencyWarning({
      scoreBefore: 0,
      scoreAfter: 0,
      isVerified: false,
    }),
    false,
  );
});

test('penalty that drops verified score to ≤15 triggers warning', () => {
  assert.equal(
    shouldTriggerTransparencyWarning({
      scoreBefore: 30,
      scoreAfter: 10,
      isVerified: true,
    }),
    true,
  );
  assert.equal(
    shouldTriggerTransparencyWarning({
      scoreBefore: 30,
      scoreAfter: 20,
      isVerified: true,
    }),
    false,
  );
});

test('computeTransparencyScoreFromProfile ignores legacy penalties', () => {
  const before = computeTransparencyScoreFromProfile({
    verification_status: 'verified',
    metadata: { penaltyPoints: 0 },
  });
  assert.equal(before.score, 30);
  const after = computeTransparencyScoreFromProfile({
    verification_status: 'verified',
    metadata: {
      penaltyPoints: 40,
      violations: [
        { id: 'v1', points: 10, status: 'active' },
        { id: 'v2', points: 10, status: 'active' },
      ],
    },
  });
  assert.equal(after.score, 30);
  assert.equal(after.penaltyPoints, 0);
});
