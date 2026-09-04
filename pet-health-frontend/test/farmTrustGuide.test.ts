import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  TRUST_GUIDE_TRANSPARENCY_IMPACT,
  COMPLIANCE_GUIDE_IMPACT,
  complianceGuideBandSummary,
  trustGuideTierSummary,
} from '../src/utils/farmTrustGuide.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('trust guide content catalogs are non-empty', () => {
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.length >= 5);
  assert.ok(TRUST_GUIDE_PENALTIES.length >= 4);
  assert.ok(TRUST_GUIDE_TRANSPARENCY_IMPACT.length >= 2);
  assert.ok(COMPLIANCE_GUIDE_IMPACT.length >= 2);
  assert.ok(TRUST_GUIDE_IMPACT.length >= 3);
  assert.equal(trustGuideTierSummary('VI').length, 4);
  assert.equal(complianceGuideBandSummary('VI').length, 4);
  assert.ok(trustGuideTierSummary('VI')[0].startsWith('30–49: Trại mới'));
});

test('trust guide has no CCCD/eKYC missions and covers compliance recovery note', () => {
  const earnBlob = TRUST_GUIDE_HOW_TO_EARN.flatMap((row) => [
    row.titleVI,
    row.titleEN,
    row.howVI,
    row.howEN,
  ]).join('\n');
  const penaltyBlob = TRUST_GUIDE_PENALTIES.flatMap((row) => [
    row.titleVI,
    row.titleEN,
    row.actionVI,
    row.actionEN,
  ]).join('\n');
  assert.equal(/CCCD|eKYC|căn cước/i.test(earnBlob), false);
  assert.equal(/không bắt buộc|optional/i.test(earnBlob), false);
  assert.equal(/CCCD|eKYC|căn cước/i.test(penaltyBlob), false);
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.some((row) => row.id === 'verifiedBase' && row.points === 30));
  assert.equal(TRUST_GUIDE_PENALTIES[0]?.points, 5);
  assert.equal(TRUST_GUIDE_PENALTIES[3]?.points, 50);
  const recovery = COMPLIANCE_GUIDE_IMPACT.find((row) => row.id === 'recoverySoon');
  assert.ok(recovery);
  assert.match(recovery!.bodyEN, /ship later/i);
});

test('trust guide i18n keys exist in EN and VI', () => {
  assert.equal(vi.farm.trust.guideCta, 'Xem chi tiết');
  assert.equal(en.farm.trust.guideCta, 'View details');
  assert.equal(vi.farm.compliance.guideCta, 'Xem chi tiết');
  assert.equal(en.farm.compliance.guideCta, 'View details');
  assert.equal(vi.farm.trust.guide.earnPending, 'Chờ duyệt');
  assert.equal(vi.farm.trust.guide.earnRejected, 'Từ chối');
  assert.equal(vi.farm.trust.guide.earnUpdate, 'Cập nhật');
  assert.equal(en.farm.trust.guide.title.length > 0, true);
  assert.equal(vi.farm.trust.guide.title.length > 0, true);
  assert.equal(en.farm.trust.guide.intro.length > 0, true);
  assert.equal(vi.farm.trust.guide.intro.length > 0, true);
  assert.equal(en.farm.trust.breakdownTitle.length > 0, true);
  assert.equal(vi.farm.trust.breakdownTitle.length > 0, true);
  assert.match(vi.farm.trust.guide.scoreSnapshot, /\{\{score\}\}/);
  assert.match(en.farm.trust.guide.scoreSnapshot, /\{\{score\}\}/);
  assert.equal(/\{\{compliance\}\}/.test(vi.farm.trust.guide.scoreSnapshot), false);
});
