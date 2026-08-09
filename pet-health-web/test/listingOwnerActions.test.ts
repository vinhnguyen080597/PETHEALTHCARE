import test from "node:test";
import assert from "node:assert/strict";
import {
  isListingOwner,
  listingVisitorActions,
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
