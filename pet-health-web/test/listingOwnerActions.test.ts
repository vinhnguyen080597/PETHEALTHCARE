import test from "node:test";
import assert from "node:assert/strict";
import {
  isListingOwner,
  listingVisitorActions,
  opensMyListingReviewPopup,
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
