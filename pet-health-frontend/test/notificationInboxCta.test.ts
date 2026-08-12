import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminQueueNotification,
  isDepositCancelRequestNotification,
  notificationInboxCta,
} from '../src/utils/notificationInboxCta.ts';

const FALLBACKS = {
  verified: 'View farm',
  rejected: 'View reason',
  listingApproved: 'View listing',
  listingRejected: 'View account',
  adminRequest: 'View request',
  detailApproved: 'View farm profile',
  detailRejected: 'View reason',
  transparencyWarning: 'Review warning',
  transparencyResolved: 'View farm profile',
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

test('transparency and detail notification CTAs', () => {
  assert.equal(
    notificationInboxCta({ type: 'transparency_warning' }, FALLBACKS),
    'Review warning',
  );
  assert.equal(
    notificationInboxCta({ type: 'breeder_detail_approved' }, FALLBACKS),
    'View farm profile',
  );
  assert.equal(
    notificationInboxCta({ type: 'admin_breeder_detail_pending' }, FALLBACKS),
    'View request',
  );
  assert.equal(isAdminQueueNotification('admin_transparency_appeal'), true);
});
