import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSocialSubmissionUrl,
  socialSubmissionUrlError,
} from '../src/utils/breederProfileSubmissions.ts';
import { TRUST_GUIDE_HOW_TO_EARN } from '../src/utils/farmTrustGuide.ts';
import {
  buildTrustGuideEarnRowStates,
  earnModalView,
  earnRowCta,
  trustGuideEarnActionForId,
} from '../src/utils/trustGuideEarnStatus.ts';

test('Cập nhật social action opens submission kind', () => {
  assert.deepEqual(trustGuideEarnActionForId('facebook'), {
    kind: 'submission',
    submissionType: 'social_facebook',
  });
  assert.deepEqual(trustGuideEarnActionForId('farmFacility'), {
    kind: 'submission',
    submissionType: 'facility_video',
  });
  assert.deepEqual(trustGuideEarnActionForId('verifiedBase'), { kind: 'profile' });
  assert.deepEqual(trustGuideEarnActionForId('firstWarrantyPolicy'), { kind: 'warranty' });
});

test('pending submission marks earn CTA as pending', () => {
  const rows = buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
    isVerified: true,
    meta: {},
    senConfirmedCompletions: 0,
    fiveStarReviewCount: 0,
    lang: 'VI',
    submissions: [{ submission_type: 'social_facebook', status: 'pending' }],
  });
  const facebook = rows.find((row) => row.id === 'facebook');
  assert.equal(facebook?.cta, 'pending');
  assert.equal(earnRowCta('facebook', false, 'pending'), 'pending');
});

test('social url validation matches web rules', () => {
  assert.equal(socialSubmissionUrlError('', 'social_facebook'), 'required');
  assert.equal(
    socialSubmissionUrlError('https://facebook.com/mypage', 'social_facebook'),
    null,
  );
  assert.equal(socialSubmissionUrlError('0901234567', 'social_zalo'), null);
  assert.equal(normalizeSocialSubmissionUrl('84 901234567', 'social_zalo'), '0901234567');
});

test('earn modal view maps busy and submitted', () => {
  assert.equal(earnModalView({ busy: false, submitted: false }), 'form');
  assert.equal(earnModalView({ busy: true, submitted: false }), 'loading');
  assert.equal(earnModalView({ busy: false, submitted: true }), 'success');
});
