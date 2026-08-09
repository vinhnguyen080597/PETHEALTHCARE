import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  buildListingStatusBody,
  listingRejectReasonMissing,
  listingRejectRequiresReason,
} from "../src/lib/admin/listingReject";

const KEYS = [
  "admin.listings.reject",
  "admin.listings.rejectTitle",
  "admin.listings.rejectHint",
  "admin.listings.rejectReason",
  "admin.listings.rejectReasonRequired",
  "admin.listings.rejectReasonPlaceholder",
  "admin.listings.rejectAction",
  "admin.listings.rejectActionPlaceholder",
  "admin.listings.rejectNote",
  "admin.listings.rejectNotePlaceholder",
] as const;

test("listing reject i18n keys exist in EN and VI", () => {
  for (const key of KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});

test("listingRejectRequiresReason only for pending_review → archived", () => {
  assert.equal(listingRejectRequiresReason("pending_review", "archived"), true);
  assert.equal(listingRejectRequiresReason("published", "archived"), false);
  assert.equal(listingRejectRequiresReason("pending_review", "published"), false);
});

test("listingRejectReasonMissing and buildListingStatusBody", () => {
  assert.equal(listingRejectReasonMissing("pending_review", "archived", "  "), true);
  assert.equal(listingRejectReasonMissing("pending_review", "archived", "Thiếu ảnh"), false);
  assert.deepEqual(
    buildListingStatusBody("archived", {
      rejectionReason: "Thiếu ảnh",
      adminAction: "Bổ sung sổ tiêm",
      adminNote: "Ghi chú",
    }),
    {
      status: "archived",
      rejectionReason: "Thiếu ảnh",
      adminAction: "Bổ sung sổ tiêm",
      adminNote: "Ghi chú",
    },
  );
});
