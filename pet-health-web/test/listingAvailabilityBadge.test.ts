import test from "node:test";
import assert from "node:assert/strict";
import {
  listingAvailabilityBadgeI18nKey,
  listingAvailabilityBadgeKey,
  validateListingStatusPayload,
} from "../src/lib/listingAvailabilityBadge.ts";
import { canShowListingStatusUpdate } from "../src/lib/listingOwnerActions.ts";

test("listingAvailabilityBadgeKey", () => {
  assert.equal(listingAvailabilityBadgeKey("published"), "available");
  assert.equal(listingAvailabilityBadgeKey("deposit_hold"), "deposit_hold");
  assert.equal(listingAvailabilityBadgeKey("sold"), null);
});

test("listingAvailabilityBadgeI18nKey", () => {
  assert.equal(
    listingAvailabilityBadgeI18nKey("available"),
    "listing.availability.available",
  );
});

test("validateListingStatusPayload requires sale channel when sold", () => {
  assert.equal(validateListingStatusPayload({ status: "published" }), null);
  assert.match(
    validateListingStatusPayload({ status: "sold" }) || "",
    /channel/i,
  );
  assert.equal(
    validateListingStatusPayload({ status: "sold", saleChannel: "on_platform" }),
    null,
  );
});

test("canShowListingStatusUpdate for owner on published/deposit_hold/sold", () => {
  assert.equal(
    canShowListingStatusUpdate({ isOwner: true, status: "published" }),
    true,
  );
  assert.equal(
    canShowListingStatusUpdate({ isOwner: false, status: "published" }),
    false,
  );
});
