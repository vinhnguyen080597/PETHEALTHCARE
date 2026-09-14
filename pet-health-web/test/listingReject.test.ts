import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  buildListingStatusBody,
  listingPublicHref,
  listingRejectionReason,
  listingRejectReasonMissing,
  listingRejectRequiresReason,
  listingStatusLabelKey,
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
  "admin.listings.healthEvidenceHint",
  "admin.listings.confirmArchive",
  "admin.listings.viewPublic",
  "admin.listings.rejectionReason",
  "admin.listings.dealHoldHint",
  "admin.breeders.rejectPenaltyPoints",
  "admin.breeders.rejectPenaltyKind",
  "admin.breeders.rejectPenaltyKind.transparency",
  "admin.breeders.rejectPenaltyKind.compliance",
  "admin.breeders.rejectPenaltyKind.review",
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

test("listing status label, public href, and rejection reason helpers", () => {
  assert.equal(listingStatusLabelKey("deposit_hold"), "listing.status.deposit_hold");
  assert.equal(listingStatusLabelKey("pending_review"), "listing.status.pending_review");
  assert.equal(listingStatusLabelKey("nope"), "listing.status.pending_review");
  assert.equal(listingPublicHref("post 9"), "/app/pet-feed/posts/post%209");
  assert.equal(
    listingRejectionReason({ rejection_reason: " Thiếu ảnh " }),
    "Thiếu ảnh",
  );
  assert.equal(listingRejectionReason({ rejectionReason: "Unclear price" }), "Unclear price");
  assert.equal(listingRejectionReason({}), "");
});
