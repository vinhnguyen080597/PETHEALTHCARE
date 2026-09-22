import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  adminBreederAvatarUrl,
  adminBreederCommitmentLabelKey,
  adminBreederCommitmentLabels,
  adminBreederCoverUrl,
  adminBreederSpecRows,
  adminListingContactEntries,
  adminListingMediaUrls,
  adminListingSpecRows,
  adminSpeciesLabelKey,
  adminVerificationStatusLabelKey,
  breederPublicHref,
  dealDisputeFromPost,
  healthEvidenceUrlsFromMetadata,
  isDealDisputeReport,
  isOpenDealDisputeOnHold,
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
  "admin.review.breederType",
  "admin.review.registeredKennelName",
  "admin.review.registeredAt",
  "admin.review.verificationStatus",
  "admin.review.createdAt",
  "admin.review.cover",
  "admin.review.avatar",
  "admin.review.photos",
  "admin.review.commitments",
  "admin.review.noCover",
  "admin.review.noAvatar",
  "admin.review.reportTarget",
  "admin.review.reportNote",
  "admin.review.dealDispute",
  "admin.review.dealDisputeMessage",
  "admin.review.dealDisputeEvidence",
  "admin.review.dealHandoffPhotos",
  "admin.reports.forceResolveUnavailable",
  "admin.farmReviews.reviewer",
  "admin.farmReviews.saleListing",
  "admin.appeals.status.appealed",
  "admin.appeals.status.pending_breeder_action",
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
    care_environment: "Indoor",
    primary_species: ["cat"],
    main_breeds: ["Mèo ta"],
    metadata: {
      breederType: "enterprise",
      registeredKennelName: "Happy Kennel",
      registeredAt: "2020",
      cover_url: "https://cdn.example/cover.jpg",
      transparencyCommitments: ["visit_ok", ""],
    },
  });
  assert.deepEqual(
    rows.map((row) => row.id),
    [
      "breederType",
      "location",
      "careEnvironment",
      "primarySpecies",
      "registeredKennelName",
      "registeredAt",
      "breeds",
      "user",
    ],
  );
  assert.equal(
    adminBreederCoverUrl({
      metadata: { coverUrl: "https://cdn.example/cover.jpg" },
    }),
    "https://cdn.example/cover.jpg",
  );
  assert.equal(
    adminBreederAvatarUrl({
      avatar_url: null,
      metadata: { avatar_url: "https://cdn.example/avatar.jpg" },
    }),
    "https://cdn.example/avatar.jpg",
  );
  assert.deepEqual(
    adminBreederCommitmentLabels({
      metadata: { transparencyCommitments: ["visit_ok", ""] },
    }),
    ["visit_ok"],
  );
  assert.equal(
    adminBreederCommitmentLabelKey("accurate_information"),
    "breederForm.commitment.accurate_information",
  );
  assert.equal(adminSpeciesLabelKey("cat"), "listing.new.species.cat");
  assert.equal(
    adminVerificationStatusLabelKey("pending_review"),
    "admin.verification.pending_review",
  );
  assert.equal(toggleExpandedReviewId(null, "post-1"), "post-1");
  assert.equal(toggleExpandedReviewId("post-1", "post-1"), null);
  assert.equal(breederPublicHref("farm/1"), "/app/breeders/farm%2F1");
});

test("open deal dispute on deposit hold is flagged (force-resolve not shipped)", () => {
  assert.equal(isDealDisputeReport("deal_dispute"), true);
  assert.equal(isDealDisputeReport("scam"), false);
  assert.equal(
    isOpenDealDisputeOnHold({
      reportReason: "deal_dispute",
      reportStatus: "open",
      linkedPostStatus: "deposit_hold",
    }),
    true,
  );
  assert.equal(
    isOpenDealDisputeOnHold({
      reportReason: "deal_dispute",
      reportStatus: "open",
      linkedPostStatus: "sold",
    }),
    false,
  );
  assert.equal(
    isOpenDealDisputeOnHold({
      reportReason: "deal_dispute",
      reportStatus: "dismissed",
      linkedPostStatus: "deposit_hold",
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
