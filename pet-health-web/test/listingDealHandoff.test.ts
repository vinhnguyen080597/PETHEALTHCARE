import test from "node:test";
import assert from "node:assert/strict";
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
  daysLeftUntilDeadline,
  dealPhotosDropHint,
  isDealDisputeOpen,
  mergeDealPhotoFiles,
  resolveDealHandoffPhase,
  validateCancelDepositRequest,
  validateDisputeRequest,
  validateHandoffPhotos,
  waitingForSenMessage,
} from "../src/lib/listingDealHandoff";

test("resolveDealHandoffPhase maps listing + deal status", () => {
  assert.equal(
    resolveDealHandoffPhase({ listingStatus: "published" }),
    "none",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "published",
      dealStatus: "pending_sen",
    }),
    "pending_sen",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "deposit_hold",
      dealStatus: "deposit_hold",
    }),
    "deposit_hold",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    "pending_sen_complete",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "deposit_hold",
      dealStatus: "pending_cancel_confirm",
    }),
    "pending_cancel_confirm",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "deposit_hold",
      dealStatus: "dispute_open",
    }),
    "dispute_open",
  );
  assert.equal(
    resolveDealHandoffPhase({ listingStatus: "sold" }),
    "completed",
  );
  assert.equal(
    resolveDealHandoffPhase({ listingStatus: "cancelled" }),
    "cancelled",
  );
  assert.equal(
    resolveDealHandoffPhase({
      listingStatus: "published",
      dealStatus: "deposit_hold",
    }),
    "deposit_hold",
  );
});

test("breeder can request handoff / cancel only on deposit_hold phase", () => {
  assert.equal(
    canBreederRequestHandoff({
      isOwner: true,
      listingStatus: "deposit_hold",
      dealStatus: "deposit_hold",
    }),
    true,
  );
  assert.equal(
    canBreederCancelDeposit({
      isOwner: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    false,
  );
  assert.equal(
    canBreederCancelDeposit({
      isOwner: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_cancel_confirm",
    }),
    false,
  );
  assert.equal(
    canBreederCancelDeposit({
      isOwner: true,
      listingStatus: "deposit_hold",
      dealStatus: "dispute_open",
    }),
    false,
  );
  assert.equal(
    canBreederRequestHandoff({
      isOwner: false,
      listingStatus: "deposit_hold",
      dealStatus: "deposit_hold",
    }),
    false,
  );
});

test("sen requests deposit; breeder confirms pending_sen", () => {
  assert.equal(
    canBreederConfirmDeposit({
      isOwner: true,
      listingStatus: "published",
      dealStatus: "pending_sen",
    }),
    true,
  );
  assert.equal(
    canBreederConfirmDeposit({
      isOwner: false,
      listingStatus: "published",
      dealStatus: "pending_sen",
    }),
    false,
  );
  assert.equal(
    canBreederConfirmDeposit({
      isOwner: true,
      listingStatus: "published",
    }),
    false,
  );
  assert.equal(
    canSenWithdrawDepositRequest({
      isDealSen: true,
      listingStatus: "published",
      dealStatus: "pending_sen",
    }),
    true,
  );
  assert.equal(
    canSenWithdrawDepositRequest({
      isDealSen: false,
      listingStatus: "published",
      dealStatus: "pending_sen",
    }),
    false,
  );
});

test("sen can confirm handoff, cancel, or open dispute by phase", () => {
  assert.equal(
    canSenConfirmHandoff({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    true,
  );
  assert.equal(
    canSenConfirmHandoff({
      isDealSen: false,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    false,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    true,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: false,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    false,
  );
  assert.equal(
    canSenAbandonHandoff({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "deposit_hold",
    }),
    false,
  );
  assert.equal(
    canSenOpenDispute({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    true,
  );
  assert.equal(
    canSenOpenDispute({
      isDealSen: false,
      listingStatus: "deposit_hold",
      dealStatus: "pending_sen_complete",
    }),
    false,
  );
  assert.equal(
    canSenOpenDispute({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "dispute_open",
    }),
    false,
  );
  assert.equal(
    isDealDisputeOpen({
      listingStatus: "deposit_hold",
      dealStatus: "dispute_open",
    }),
    true,
  );
  assert.equal(
    canSenConfirmCancel({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "pending_cancel_confirm",
    }),
    true,
  );
  assert.equal(
    canSenConfirmCancel({
      isDealSen: true,
      listingStatus: "deposit_hold",
      dealStatus: "deposit_hold",
    }),
    false,
  );
  assert.equal(
    canSenConfirmCancel({
      isDealSen: false,
      listingStatus: "deposit_hold",
      dealStatus: "pending_cancel_confirm",
      allowLoggedInDeepLink: true,
    }),
    true,
  );
});

test("waitingForSenMessage, photo and cancel validation", () => {
  assert.equal(
    waitingForSenMessage("Wait {days} days", 5),
    "Wait 5 days",
  );
  assert.equal(validateHandoffPhotos([]), "photos_required");
  assert.equal(validateHandoffPhotos([{} as File]), null);
  assert.equal(
    validateCancelDepositRequest({
      reasonKey: "",
      note: "",
      photos: [],
    }),
    "reason_required",
  );
  assert.equal(
    validateCancelDepositRequest({
      reasonKey: "other",
      note: "",
      photos: [],
    }),
    "reason_required",
  );
  assert.equal(
    validateCancelDepositRequest({
      reasonKey: "no_contact",
      note: "",
      photos: [],
    }),
    null,
  );
  assert.equal(
    buildCancelDepositReasonText({
      reasonKey: "no_contact",
      reasonLabel: "No contact",
      note: "called twice",
    }),
    "No contact: called twice",
  );
  assert.equal(
    validateDisputeRequest({ message: "", photos: [{} as File] }),
    "message_required",
  );
  assert.equal(
    validateDisputeRequest({ message: "missing pet", photos: [] }),
    "photos_required",
  );
  assert.equal(
    validateDisputeRequest({
      message: "missing pet",
      photos: [{} as File],
    }),
    null,
  );
  assert.equal(
    daysLeftUntilDeadline(new Date(Date.now() - 86400000).toISOString())! <= 0,
    true,
  );
  assert.ok(
    daysLeftUntilDeadline(new Date(Date.now() + 3 * 86400000).toISOString())! >=
      3,
  );
});

test("mergeDealPhotoFiles keeps images only and caps at max", () => {
  const img = (name: string): File =>
    ({ name, size: 10, type: "image/jpeg" }) as File;
  const pdf = { name: "x.pdf", size: 10, type: "application/pdf" } as File;
  const empty = { name: "e.jpg", size: 0, type: "image/jpeg" } as File;

  assert.deepEqual(
    mergeDealPhotoFiles([], [img("a"), pdf, empty, img("b")], 5).map(
      (f) => f.name,
    ),
    ["a", "b"],
  );
  assert.deepEqual(
    mergeDealPhotoFiles([img("a"), img("b")], [img("c"), img("d")], 3).map(
      (f) => f.name,
    ),
    ["a", "b", "c"],
  );
  assert.equal(dealPhotosDropHint("Max {max} photos", 5), "Max 5 photos");
});
