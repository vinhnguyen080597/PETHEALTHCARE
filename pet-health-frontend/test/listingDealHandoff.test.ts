import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCancelDepositReasonText,
  canBreederCancelDeposit,
  canBreederConfirmDeposit,
  canBreederRequestHandoff,
  canSenConfirmCancel,
  canSenAbandonHandoff,
  canSenConfirmHandoff,
  canSenOpenDispute,
  canSenWithdrawDepositRequest,
  canShowDepositRequest,
  isDealDisputeOpen,
  readDealFromPostMetadata,
  resolveDealHandoffPhase,
  validateCancelDepositRequest,
  validateDisputeRequest,
  validateHandoffPhotos,
  waitingForSenMessage,
} from '../src/utils/listingDealHandoff.ts';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('resolveDealHandoffPhase and gates match web contract', () => {
  assert.equal(
    resolveDealHandoffPhase({ listingStatus: 'cancelled' }),
    'cancelled',
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    'pending_sen_complete',
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: 'deposit_hold',
      dealStatus: 'dispute_open',
    }),
    'dispute_open',
  );
  assert.equal(
    canShowDepositRequest({ isOwner: true, listingStatus: 'published' }),
    false,
  );
  assert.equal(
    canShowDepositRequest({ isOwner: false, listingStatus: 'published' }),
    true,
  );
  assert.equal(
    canShowDepositRequest({
      isOwner: false,
      listingStatus: 'published',
      dealStatus: 'pending_sen',
    }),
    false,
  );
  assert.equal(
    canShowDepositRequest({
      isOwner: false,
      listingStatus: 'published',
      dealStatus: 'deposit_hold',
    }),
    false,
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: 'published',
      dealStatus: 'deposit_hold',
    }),
    'deposit_hold',
  );
  assert.equal(
    canBreederRequestHandoff({
      isOwner: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'deposit_hold',
    }),
    true,
  );
  assert.equal(
    canBreederCancelDeposit({
      isOwner: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    false,
  );
  assert.equal(
    canBreederCancelDeposit({
      isOwner: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'dispute_open',
    }),
    false,
  );
  assert.equal(
    canSenConfirmHandoff({
      isDealSen: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    true,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    true,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: false,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    false,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'deposit_hold',
    }),
    false,
  );
  assert.equal(
    canSenConfirmCancel({
      isDealSen: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_cancel_confirm',
    }),
    true,
  );
  assert.equal(
    canSenConfirmCancel({
      isDealSen: false,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_cancel_confirm',
    }),
    false,
  );
  assert.equal(
    canSenOpenDispute({
      isDealSen: true,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    true,
  );
  assert.equal(
    canSenOpenDispute({
      isDealSen: false,
      listingStatus: 'deposit_hold',
      dealStatus: 'pending_sen_complete',
    }),
    false,
  );
  assert.equal(
    isDealDisputeOpen({
      listingStatus: 'deposit_hold',
      dealStatus: 'dispute_open',
    }),
    true,
  );
  assert.equal(
    canBreederConfirmDeposit({
      isOwner: true,
      listingStatus: 'published',
      dealStatus: 'pending_sen',
    }),
    true,
  );
  assert.equal(
    canSenWithdrawDepositRequest({
      isDealSen: true,
      listingStatus: 'published',
      dealStatus: 'pending_sen',
    }),
    true,
  );
});

test('validation and deal metadata helpers', () => {
  assert.equal(validateHandoffPhotos(0), 'photos_required');
  assert.equal(validateHandoffPhotos(1), null);
  assert.equal(
    validateCancelDepositRequest({
      reasonKey: 'other',
      note: '',
      photoCount: 0,
    }),
    'reason_required',
  );
  assert.equal(
    validateDisputeRequest({ message: '', photoCount: 1 }),
    'message_required',
  );
  assert.equal(
    validateDisputeRequest({
      message: 'x',
      photoCount: 6,
    }),
    'photos_too_many',
  );
  assert.equal(
    buildCancelDepositReasonText({
      reasonKey: 'no_contact',
      reasonLabel: 'No contact',
      note: 'x',
    }),
    'No contact: x',
  );
  assert.equal(waitingForSenMessage('Wait {days}d', 2), 'Wait 2d');
  const deal = readDealFromPostMetadata({
    deal: {
      status: 'dispute_open',
      sen_user_id: 'sen-1',
      sen_display_name: 'Sen A',
      complete_deadline_at: '2030-01-01T00:00:00.000Z',
      dispute: { message: 'missing' },
    },
  });
  assert.equal(deal.status, 'dispute_open');
  assert.equal(deal.senUserId, 'sen-1');
  assert.equal(deal.disputeMessage, 'missing');
});

test('sen abandon i18n keys exist in EN and VI', () => {
  for (const key of [
    'senConfirmReceipt',
    'senOpenDispute',
    'senAbandonDeposit',
    'senAbandonTitle',
    'senAbandonHint',
    'actionsMenu',
  ]) {
    assert.ok(en.deal[key], `missing EN deal.${key}`);
    assert.ok(vi.deal[key], `missing VI deal.${key}`);
  }
  assert.equal(vi.deal.senConfirmReceipt, 'Xác nhận đã nhận bé');
  assert.equal(vi.deal.senOpenDispute, 'Tôi chưa nhận được bé');
});
