import test from "node:test";
import assert from "node:assert/strict";
import {
  listingAvailabilityBadgeI18nKey,
  listingAvailabilityBadgeKey,
  listingOverlayStatusLabelKey,
  listingOverlayStatusPillClass,
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

test("listingOverlayStatusLabelKey matches mobile overlay rules", () => {
  assert.equal(
    listingOverlayStatusLabelKey({ status: "published" }),
    "listing.availability.available",
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: "deposit_hold" }),
    "listing.availability.depositHold",
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: "sold", isSold: true }),
    "feed.card.sold",
  );
  assert.equal(
    listingOverlayStatusLabelKey({ status: "published", isCancelled: true }),
    null,
  );
});

test("listingOverlayStatusPillClass uses green for available", () => {
  assert.match(
    listingOverlayStatusPillClass("listing.availability.available"),
    /emerald-600/,
  );
  assert.match(listingOverlayStatusPillClass("feed.card.sold"), /slate-900/);
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

test("canShowListingStatusUpdate for owner on published/deposit_hold only", () => {
  assert.equal(
    canShowListingStatusUpdate({ isOwner: true, status: "published" }),
    true,
  );
  assert.equal(
    canShowListingStatusUpdate({ isOwner: true, status: "deposit_hold" }),
    true,
  );
  assert.equal(
    canShowListingStatusUpdate({ isOwner: true, status: "sold" }),
    false,
  );
  assert.equal(
    canShowListingStatusUpdate({ isOwner: true, status: "cancelled" }),
    false,
  );
  assert.equal(
    canShowListingStatusUpdate({ isOwner: false, status: "published" }),
    false,
  );
});
