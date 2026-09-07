import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAdminScorePenalty,
  parseAdminScorePenaltyInput,
} from '../src/utils/adminScorePenalty.js';
import { getComplianceScoreFromMetadata } from '../src/utils/breederComplianceScore.js';

test('parseAdminScorePenaltyInput allows empty optional penalty', () => {
  assert.deepEqual(parseAdminScorePenaltyInput({}), {
    ok: true,
    penaltyPoints: 0,
    penaltyKind: '',
  });
});

test('parseAdminScorePenaltyInput requires points and kind together', () => {
  const missingKind = parseAdminScorePenaltyInput({ penaltyPoints: 10 });
  assert.equal(missingKind.ok, false);
  const missingPoints = parseAdminScorePenaltyInput({ penaltyKind: 'compliance' });
  assert.equal(missingPoints.ok, false);
});

test('parseAdminScorePenaltyInput accepts the three score kinds', () => {
  assert.equal(parseAdminScorePenaltyInput({ penaltyPoints: 8, penaltyKind: 'transparency' }).penaltyKind, 'transparency');
  assert.equal(parseAdminScorePenaltyInput({ penaltyPoints: '5', penaltyKind: 'compliance' }).penaltyKind, 'compliance');
  assert.equal(parseAdminScorePenaltyInput({ penaltyPoints: 12, penaltyKind: 'review' }).penaltyKind, 'review');
});

test('applyAdminScorePenalty deducts compliance without report-tier restrictions', () => {
  const result = applyAdminScorePenalty({}, {
    kind: 'compliance',
    points: 10,
    reason: 'Hồ sơ thiếu minh chứng',
    eventId: 'e1',
  }, new Date('2026-09-07T00:00:00Z'));
  assert.equal(result.applied, true);
  assert.equal(result.scoreBefore, 100);
  assert.equal(result.scoreAfter, 90);
  assert.equal(getComplianceScoreFromMetadata(result.metadata), 90);
  assert.equal(result.metadata.compliance.restrictions.permanentBan, undefined);
});

test('applyAdminScorePenalty accumulates transparency and review penalties', () => {
  const first = applyAdminScorePenalty({}, { kind: 'transparency', points: 5, eventId: 't1' });
  const second = applyAdminScorePenalty(first.metadata, { kind: 'review', points: 8, eventId: 'r1' });
  assert.equal(second.metadata.admin_transparency_penalty, 5);
  assert.equal(second.metadata.admin_review_penalty, 8);
  assert.equal(second.metadata.admin_score_penalties.length, 2);
});
