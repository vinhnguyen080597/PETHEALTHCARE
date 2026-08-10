import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  adminBreederSpecRows,
  adminListingContactEntries,
  adminListingMediaUrls,
  adminListingSpecRows,
  canAdminForceResolveDeal,
  dealDisputeFromPost,
  healthEvidenceUrlsFromMetadata,
  isDealDisputeReport,
  toggleExpandedReviewId,
} from "../src/lib/admin/reviewDetail";

const KEYS = [
  "admin.review.details",
  "admin.review.hideDetails",
  "admin.review.species",
  "admin.review.breed",
  "admin.review.gender",
  "admin.review.age",
  "admin.review.location",
  "admin.review.price",
  "admin.review.vaccine",
  "admin.review.deworming",
  "admin.review.personality",
  "admin.review.paperwork",
  "admin.review.contact",
  "admin.review.media",
  "admin.review.video",
  "admin.review.description",
  "admin.review.warranty",
  "admin.review.breeder",
  "admin.review.mainBreeds",
  "admin.review.userId",
  "admin.review.bio",
  "admin.review.careEnvironment",
  "admin.review.reportTarget",
  "admin.review.reportNote",
  "admin.review.dealDispute",
  "admin.review.dealDisputeMessage",
  "admin.review.dealDisputeEvidence",
  "admin.review.dealHandoffPhotos",
  "admin.reports.forceComplete",
  "admin.reports.forceCancel",
  "admin.reports.confirmForceComplete",
  "admin.reports.confirmForceCancel",
] as const;

test("admin review detail i18n keys exist in EN and VI", () => {
  for (const key of KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});

test("adminListingSpecRows surfaces create-form fields for review", () => {
  const rows = adminListingSpecRows({
    id: "p1",
    species: "cat",
    breed: "British Shorthair",
    gender: "male",
    age_months: 3,
    location: "TP. Hồ Chí Minh",
    price_note: "9.000.000",
    vaccine_status: "Basic done",
    deworming_status: "Recent",
  });
  assert.deepEqual(
    rows.map((r) => r.id),
    ["species", "breed", "gender", "age", "location", "price", "vaccine", "deworming"],
  );
});

test("admin listing media/contact/evidence helpers", () => {
  assert.deepEqual(
    adminListingMediaUrls({
      id: "p1",
      media_urls: ["https://a.jpg", "", "https://b.jpg"],
    }),
    ["https://a.jpg", "https://b.jpg"],
  );
  assert.deepEqual(
    adminListingContactEntries({ phone: "090", zalo: "", facebook: "fb.com/x" }),
    [
      { key: "phone", value: "090" },
      { key: "facebook", value: "fb.com/x" },
    ],
  );
  assert.deepEqual(
    healthEvidenceUrlsFromMetadata({
      health_evidence_urls: ["https://e.jpg", 1, ""],
    }),
    ["https://e.jpg"],
  );
});

test("adminBreederSpecRows and expand toggle", () => {
  const rows = adminBreederSpecRows({
    id: "b1",
    user_id: "u1",
    location: "HCM",
    primary_species: ["cat"],
    main_breeds: ["Mèo ta"],
  });
  assert.equal(rows.length, 4);
  assert.equal(toggleExpandedReviewId(null, "post-1"), "post-1");
  assert.equal(toggleExpandedReviewId("post-1", "post-1"), null);
});

test("deal dispute helpers for admin force resolve", () => {
  assert.equal(isDealDisputeReport("deal_dispute"), true);
  assert.equal(isDealDisputeReport("scam"), false);
  assert.equal(
    canAdminForceResolveDeal({
      reportReason: "deal_dispute",
      reportStatus: "open",
      linkedPostStatus: "deposit_hold",
    }),
    true,
  );
  assert.equal(
    canAdminForceResolveDeal({
      reportReason: "deal_dispute",
      reportStatus: "open",
      linkedPostStatus: "sold",
    }),
    false,
  );
  const dispute = dealDisputeFromPost({
    id: "p1",
    status: "deposit_hold",
    metadata: {
      deal: {
        status: "dispute_open",
        handoff_photos: ["https://h.jpg"],
        dispute: {
          message: "No pet",
          evidence_urls: ["https://e.jpg", ""],
        },
      },
    },
  });
  assert.equal(dispute?.dealStatus, "dispute_open");
  assert.equal(dispute?.message, "No pet");
  assert.deepEqual(dispute?.evidenceUrls, ["https://e.jpg"]);
  assert.deepEqual(dispute?.handoffPhotos, ["https://h.jpg"]);
});
