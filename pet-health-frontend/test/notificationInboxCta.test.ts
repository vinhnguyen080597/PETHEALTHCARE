import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDepositCancelRequestNotification,
  notificationInboxCta,
} from '../src/utils/notificationInboxCta.ts';

const FALLBACKS = {
  verified: 'View farm',
  rejected: 'View reason',
  listingApproved: 'View listing',
  listingRejected: 'View account',
  adminRequest: 'View request',
  depositCancelConfirm: 'Confirm cancel deposit',
  depositConfirm: 'Confirm deposit',
  dealCompleteConfirm: 'Confirm handoff',
  viewListing: 'View listing',
};

test('deposit cancel notification shows a confirm CTA', () => {
  assert.equal(
    notificationInboxCta({ type: 'deposit_cancel_request' }, FALLBACKS),
    'Confirm cancel deposit',
  );
  assert.equal(
    notificationInboxCta(
      { type: 'deposit_cancel_request', cta_label: 'Xác nhận hủy cọc' },
      FALLBACKS,
    ),
    'Xác nhận hủy cọc',
  );
  assert.equal(notificationInboxCta({ type: 'post_comment' }, FALLBACKS), null);
  assert.equal(isDepositCancelRequestNotification('deposit_cancel_request'), true);
});
