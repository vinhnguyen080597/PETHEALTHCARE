import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCancelDepositReasonText,
  canBreederCancelDeposit,
  canBreederRequestHandoff,
  canSenConfirmCancel,
  canSenConfirmHandoff,
  canSenOpenDispute,
  canShowDepositRequest,
  isDealDisputeOpen,
  readDealFromPostMetadata,
  resolveDealHandoffPhase,
  validateCancelDepositRequest,
  validateDisputeRequest,
  validateHandoffPhotos,
  waitingForSenMessage,
} from '../src/utils/listingDealHandoff.ts';

test('resolveDealHandoffPhase and gates match web contract', () => {
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
    true,
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
