import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  trustGuideTierSummary,
} from '../src/utils/farmTrustGuide.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('trust guide content catalogs are non-empty', () => {
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.length >= 5);
  assert.ok(TRUST_GUIDE_PENALTIES.length >= 4);
  assert.ok(TRUST_GUIDE_IMPACT.length >= 3);
  assert.equal(trustGuideTierSummary('VI').length, 6);
  assert.ok(trustGuideTierSummary('VI')[0].startsWith('L0'));
});

test('trust guide has no CCCD/eKYC missions and covers low-score warning', () => {
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
  const warning = TRUST_GUIDE_IMPACT.find((row) => row.id === 'lowScoreWarning');
  assert.ok(warning);
  assert.match(warning!.bodyEN, /No CCCD \/ eKYC/i);
  assert.match(warning!.bodyVI, /Không thu thập CCCD/);
});

test('trust guide i18n keys exist in EN and VI', () => {
  assert.equal(vi.farm.trust.guideCta, 'Xem chi tiết điểm & hướng dẫn');
  assert.equal(en.farm.trust.guideCta, 'View score details & guide');
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
});
