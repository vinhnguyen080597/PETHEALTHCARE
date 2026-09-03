import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyComplianceDeduction,
  complianceBandForScore,
  COMPLIANCE_MATRIX,
  COMPLIANCE_SCORE_DEFAULT,
  dailyListingCapForCompliance,
  getComplianceScoreFromMetadata,
  isCompliancePostBanned,
  isComplianceVerifiedStripped,
  mapReportReasonToCompliance,
  shouldHideComplianceContact,
} from '../src/utils/breederComplianceScore.js';

test('mapReportReasonToCompliance maps matrix reasons and legacy aliases', () => {
  assert.deepEqual(mapReportReasonToCompliance('stock_photo_spam').tier, 1);
  assert.equal(mapReportReasonToCompliance('stock_photo_spam').points, 5);
  assert.equal(mapReportReasonToCompliance('inaccurate_listing').points, 10);
  assert.equal(mapReportReasonToCompliance('concealed_illness').points, 25);
  assert.equal(mapReportReasonToCompliance('confirmed_scam').points, 50);
  assert.equal(mapReportReasonToCompliance('scam').reasonCode, 'confirmed_scam');
  assert.equal(mapReportReasonToCompliance('unknown_xyz').tier, 2);
});

test('missing compliance metadata defaults to 100', () => {
  assert.equal(getComplianceScoreFromMetadata({}), COMPLIANCE_SCORE_DEFAULT);
  assert.equal(complianceBandForScore(100), 'normal');
  assert.equal(complianceBandForScore(79), 'warning');
  assert.equal(complianceBandForScore(49), 'severe');
  assert.equal(complianceBandForScore(0), 'banned');
});

test('applyComplianceDeduction is idempotent per reportId', () => {
  const first = applyComplianceDeduction({}, {
    reportId: 'r1',
    reason: 'stock_photo_spam',
    eventId: 'e1',
  });
  assert.equal(first.applied, true);
  assert.equal(first.scoreAfter, 95);
  const second = applyComplianceDeduction({ compliance: first.compliance }, {
    reportId: 'r1',
    reason: 'stock_photo_spam',
    eventId: 'e2',
  });
  assert.equal(second.applied, false);
  assert.equal(second.scoreAfter, 95);
});

test('tier 4 and score 0 mark permanent ban actions', () => {
  const result = applyComplianceDeduction(
    { compliance: { score: 40, events: [], restrictions: {} } },
    { reportId: 'r-scam', reason: 'confirmed_scam', eventId: 'e3' },
  );
  assert.equal(result.scoreAfter, 0);
  assert.equal(result.band, 'banned');
  assert.ok(result.actions.includes('permanent_suspend'));
  assert.equal(result.compliance.restrictions.permanentBan, true);
});

test('band helpers for contact hide, verified strip, daily cap', () => {
  const warningMeta = { compliance: { score: 70, events: [], restrictions: {} } };
  assert.equal(dailyListingCapForCompliance(warningMeta), 1);
  assert.equal(isComplianceVerifiedStripped(warningMeta), true);
  assert.equal(shouldHideComplianceContact(warningMeta), false);

  const severeMeta = { compliance: { score: 20, events: [], restrictions: {} } };
  assert.equal(shouldHideComplianceContact(severeMeta), true);
  assert.equal(dailyListingCapForCompliance(severeMeta), 0);

  const bannedUntil = new Date(Date.now() + 86400000).toISOString();
  assert.equal(
    isCompliancePostBanned({
      compliance: { score: 90, events: [], restrictions: { postBanUntil: bannedUntil } },
    }),
    true,
  );
});

test('COMPLIANCE_MATRIX has four tiers', () => {
  assert.equal(COMPLIANCE_MATRIX.length, 4);
  assert.equal(COMPLIANCE_MATRIX[0].points, 5);
  assert.equal(COMPLIANCE_MATRIX[3].points, 50);
});
