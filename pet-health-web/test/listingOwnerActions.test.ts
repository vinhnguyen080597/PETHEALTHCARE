import test from "node:test";
import assert from "node:assert/strict";
import {
  canShowDepositRequest,
  canShowListingUpdateDetails,
  canShowWarrantyUpdateCta,
  isListingAvailableStatus,
  isListingOwner,
  listingDetailBackHref,
  listingDetailHref,
  listingEditHref,
  listingVisitorActions,
  opensMyListingReviewPopup,
  parseListingDetailFrom,
} from "../src/lib/listingOwnerActions";

test("isListingOwner requires matching non-empty ids", () => {
  assert.equal(isListingOwner(null, "u1"), false);
  assert.equal(isListingOwner("u1", null), false);
  assert.equal(isListingOwner("u1", "u2"), false);
  assert.equal(isListingOwner("u1", "u1"), true);
  assert.equal(isListingOwner("  u1  ", "u1"), true);
});

test("listing owner does not see message or report actions", () => {
  assert.deepEqual(listingVisitorActions(true), {
    showMessage: false,
    showReport: false,
  });
  assert.deepEqual(listingVisitorActions(false), {
    showMessage: true,
    showReport: true,
  });
});

test("opensMyListingReviewPopup only for pending_review", () => {
  assert.equal(opensMyListingReviewPopup("pending_review"), true);
  assert.equal(opensMyListingReviewPopup("PENDING_REVIEW"), true);
  assert.equal(opensMyListingReviewPopup("published"), false);
  assert.equal(opensMyListingReviewPopup("draft"), false);
  assert.equal(opensMyListingReviewPopup(null), false);
});

test("canShowDepositRequest is Sen-only on open listings", () => {
  assert.equal(
    canShowDepositRequest({ isOwner: true, status: "published" }),
    false,
  );
  assert.equal(
    canShowDepositRequest({ isOwner: false, status: "published" }),
    true,
  );
  assert.equal(
    canShowDepositRequest({
      isOwner: false,
      status: "published",
      dealStatus: "pending_sen",
    }),
    false,
  );
  assert.equal(
    canShowDepositRequest({
      isOwner: false,
      status: "published",
      dealStatus: "deposit_hold",
    }),
    false,
  );
  assert.equal(canShowDepositRequest({ isOwner: false, status: "deposit_hold" }), false);
  assert.equal(canShowDepositRequest({ isOwner: false, status: "sold" }), false);
  assert.equal(canShowDepositRequest({ isOwner: false, status: null }), false);
});

test("isListingAvailableStatus is published only", () => {
  assert.equal(isListingAvailableStatus("published"), true);
  assert.equal(isListingAvailableStatus("PUBLISHED"), true);
  assert.equal(isListingAvailableStatus("deposit_hold"), false);
  assert.equal(isListingAvailableStatus("sold"), false);
  assert.equal(isListingAvailableStatus("pending_review"), false);
  assert.equal(isListingAvailableStatus(null), false);
});

test("canShowListingUpdateDetails only for owner on available listing", () => {
  assert.equal(
    canShowListingUpdateDetails({ isOwner: true, status: "published" }),
    true,
  );
  assert.equal(
    canShowListingUpdateDetails({ isOwner: false, status: "published" }),
    false,
  );
  assert.equal(
    canShowListingUpdateDetails({ isOwner: true, status: "deposit_hold" }),
    false,
  );
});

test("canShowWarrantyUpdateCta respects owner, available, and freeze", () => {
  assert.equal(
    canShowWarrantyUpdateCta({ isOwner: true, status: "published" }),
    true,
  );
  assert.equal(
    canShowWarrantyUpdateCta({
      isOwner: true,
      status: "published",
      frozen: true,
    }),
    false,
  );
  assert.equal(
    canShowWarrantyUpdateCta({ isOwner: true, status: "deposit_hold" }),
    false,
  );
  assert.equal(
    canShowWarrantyUpdateCta({ isOwner: false, status: "published" }),
    false,
  );
});

test("listingEditHref encodes post id", () => {
  assert.equal(listingEditHref("abc"), "/app/account/listings/abc/edit");
  assert.equal(
    listingEditHref("a/b"),
    "/app/account/listings/a%2Fb/edit",
  );
});

test("listingDetailHref and back href respect from=account", () => {
  assert.equal(listingDetailHref("abc"), "/app/pet-feed/posts/abc");
  assert.equal(
    listingDetailHref("abc", { from: "account" }),
    "/app/pet-feed/posts/abc?from=account",
  );
  assert.equal(
    listingDetailHref("abc", { dealAction: "confirm-cancel" }),
    "/app/pet-feed/posts/abc?dealAction=confirm-cancel",
  );
  assert.equal(
    listingDetailHref("abc", { dealAction: "confirm-deposit" }),
    "/app/pet-feed/posts/abc?dealAction=confirm-deposit",
  );
  assert.equal(
    listingDetailHref("abc", { from: "account", dealAction: "confirm-cancel" }),
    "/app/pet-feed/posts/abc?from=account&dealAction=confirm-cancel",
  );
  assert.equal(parseListingDetailFrom("account"), "account");
  assert.equal(parseListingDetailFrom("pet-feed"), null);
  assert.equal(listingDetailBackHref("account"), "/app/account");
  assert.equal(listingDetailBackHref(null), "/app/pet-feed");
});
