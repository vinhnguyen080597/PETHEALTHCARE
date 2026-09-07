import test from 'node:test';
import assert from 'node:assert/strict';
import {
  farmDetailTabFromNotificationMetadata,
  farmWarrantyOwnerEmptyCtaKey,
} from '../src/utils/farmProfileDisplay.ts';

test('farmDetailTabFromNotificationMetadata opens warranty for policy files', () => {
  assert.equal(
    farmDetailTabFromNotificationMetadata({ submission_type: 'warranty_policy_file' }),
    'warranty',
  );
  assert.equal(
    farmDetailTabFromNotificationMetadata({ submission_type: 'facility_video' }),
    'overview',
  );
  assert.equal(
    farmDetailTabFromNotificationMetadata({
      cta_href: '/app/breeders/bp-9?tab=warranty',
    }),
    'warranty',
  );
});

test('owner empty warranty CTA hides +10 copy after first award', () => {
  assert.equal(farmWarrantyOwnerEmptyCtaKey(false), 'farm.warranty.createCta');
  assert.equal(farmWarrantyOwnerEmptyCtaKey(true), null);
});
