import test from "node:test";
import assert from "node:assert/strict";
import {
  applyApprovedBreederSubmission,
  applyApprovedWarrantyFileSubmissions,
  approvedBreederDetailCtaHref,
  normalizeBreederSubmissionType,
  validateBreederSubmissionPayload,
} from "../src/utils/breederProfileSubmissions.js";

test("validateBreederSubmissionPayload requires https social links", () => {
  const bad = validateBreederSubmissionPayload("social_facebook", { url: "fb.com/x" });
  assert.equal(bad.ok, false);
  const good = validateBreederSubmissionPayload("social_facebook", {
    url: "https://facebook.com/page",
  });
  assert.equal(good.ok, true);
  assert.equal(good.payload.url, "https://facebook.com/page");
});

test("validateBreederSubmissionPayload accepts platform profile URLs only", () => {
  assert.equal(
    validateBreederSubmissionPayload("social_zalo", { url: "0901234567" }).ok,
    true,
  );
  assert.equal(
    validateBreederSubmissionPayload("social_zalo", { url: "0901234567" }).payload.url,
    "0901234567",
  );
  assert.equal(
    validateBreederSubmissionPayload("social_zalo", { url: "https://zalo.me/farmoa" }).ok,
    false,
  );
  assert.equal(
    validateBreederSubmissionPayload("social_tiktok", {
      url: "https://www.tiktok.com/@petfarm",
    }).ok,
    true,
  );
  assert.equal(
    validateBreederSubmissionPayload("social_tiktok", {
      url: "https://www.tiktok.com/@petfarm/video/1",
    }).ok,
    false,
  );
  assert.equal(
    validateBreederSubmissionPayload("social_instagram", {
      url: "https://instagram.com/petfarm",
    }).ok,
    true,
  );
});

test("applyApprovedBreederSubmission sets metadata flags and contact", () => {
  const profile = {
    contact: {},
    metadata: {},
  };
  const merged = applyApprovedBreederSubmission(profile, {
    submission_type: "social_zalo",
    payload: { url: "https://zalo.me/farm" },
  }, "2026-08-12T00:00:00.000Z");
  assert.equal(merged.contact.zalo, "https://zalo.me/farm");
  assert.equal(merged.metadata.social_zalo_approved, true);
  assert.equal(merged.metadata.social_zalo_trust_awarded, true);

  const video = applyApprovedBreederSubmission(profile, {
    submission_type: "facility_video",
    payload: { url: "https://cdn.example/v.mp4" },
  }, "2026-08-12T00:00:00.000Z");
  assert.equal(video.metadata.facility_verified, true);
  assert.equal(video.metadata.facility_video_url, "https://cdn.example/v.mp4");
  assert.equal(video.metadata.facility_video_trust_awarded, true);
});

test("re-approved submission does not reset one-time trust award", () => {
  const profile = {
    contact: { facebook: "https://facebook.com/old" },
    metadata: {
      social_facebook_approved: true,
      social_facebook_trust_awarded: true,
    },
  };
  const merged = applyApprovedBreederSubmission(profile, {
    submission_type: "social_facebook",
    payload: { url: "https://facebook.com/new" },
  }, "2026-08-13T00:00:00.000Z");
  assert.equal(merged.contact.facebook, "https://facebook.com/new");
  assert.equal(merged.metadata.social_facebook_approved, true);
  assert.equal(merged.metadata.social_facebook_trust_awarded, true);
});

test("applyApprovedWarrantyFileSubmissions hydrates a skipped admin merge", () => {
  const profile = { contact: {}, metadata: {} };
  const hydrated = applyApprovedWarrantyFileSubmissions(profile, [
    {
      submission_type: "warranty_policy_file",
      status: "approved",
      reviewed_at: "2026-09-10T10:00:00.000Z",
      payload: {
        url: "https://cdn.example/policy.pdf",
        title: "Chính sách trại",
        content_type: "application/pdf",
      },
    },
  ]);
  assert.equal(hydrated.changed, true);
  assert.equal(hydrated.metadata.warranty_policies.length, 1);
  assert.equal(hydrated.metadata.warranty_policies[0].file_url, "https://cdn.example/policy.pdf");
  assert.equal(hydrated.metadata.warranty_policy_trust_awarded, true);

  const again = applyApprovedWarrantyFileSubmissions(
    { contact: {}, metadata: hydrated.metadata },
    [
      {
        submission_type: "warranty_policy_file",
        status: "approved",
        payload: { url: "https://cdn.example/policy.pdf", title: "Chính sách trại" },
      },
    ],
  );
  assert.equal(again.changed, false);
});

test("applyApprovedBreederSubmission awards first warranty file once", () => {
  const profile = { contact: {}, metadata: {} };
  const first = applyApprovedBreederSubmission(profile, {
    submission_type: "warranty_policy_file",
    payload: {
      url: "https://cdn.example/policy.pdf",
      title: "Chính sách trại",
      content_type: "application/pdf",
    },
  }, "2026-09-07T00:00:00.000Z");
  assert.equal(first.metadata.warranty_policy_trust_awarded, true);
  assert.equal(first.metadata.first_warranty_approved, true);
  assert.equal(first.metadata.warranty_policies.length, 1);
  assert.equal(first.metadata.warranty_policies[0].file_url, "https://cdn.example/policy.pdf");
  assert.equal(first.metadata.warranty_policies[0].title, "Chính sách trại");

  const second = applyApprovedBreederSubmission(
    { contact: {}, metadata: first.metadata },
    {
      submission_type: "warranty_policy_file",
      payload: {
        url: "https://cdn.example/policy-2.pdf",
        title: "Chính sách bổ sung",
      },
    },
    "2026-09-07T01:00:00.000Z",
  );
  assert.equal(second.metadata.warranty_policy_trust_awarded, true);
  assert.equal(second.metadata.warranty_policies.length, 2);
});

test("applyApprovedBreederSubmission does not re-award existing warranty trust", () => {
  const profile = {
    contact: {},
    metadata: {
      warranty_policy_trust_awarded: true,
      first_warranty_approved: true,
      warranty_policies: [
        { id: "p1", title: "Structured", vaccine_shots_count: 2 },
      ],
    },
  };
  const merged = applyApprovedBreederSubmission(profile, {
    submission_type: "warranty_policy_file",
    payload: { url: "https://cdn.example/file.pdf", title: "Upload" },
  }, "2026-09-07T00:00:00.000Z");
  assert.equal(merged.metadata.warranty_policy_trust_awarded, true);
  assert.equal(merged.metadata.warranty_policies.length, 2);
  assert.equal(
    merged.metadata.warranty_policies.some((p) => p.file_url === "https://cdn.example/file.pdf"),
    true,
  );
});

test("applyApprovedBreederSubmission awards warranty file even if other policies exist", () => {
  const profile = {
    contact: {},
    metadata: {
      warranty_policies: [{ id: "p1", title: "Structured" }],
    },
  };
  const merged = applyApprovedBreederSubmission(profile, {
    submission_type: "warranty_policy_file",
    payload: { url: "https://cdn.example/file.pdf", title: "Upload" },
  }, "2026-09-07T00:00:00.000Z");
  assert.equal(merged.metadata.warranty_policy_trust_awarded, true);
  assert.equal(merged.metadata.first_warranty_approved, true);
  assert.equal(merged.metadata.warranty_policies.length, 2);
});

test("approvedBreederDetailCtaHref opens warranty tab for policy files", () => {
  assert.equal(
    approvedBreederDetailCtaHref("bp-9", "warranty_policy_file"),
    "/app/breeders/bp-9?tab=warranty",
  );
  assert.equal(
    approvedBreederDetailCtaHref("bp-9", "facility_video"),
    "/app/breeders/bp-9",
  );
});

test("normalizeBreederSubmissionType rejects unknown types", () => {
  assert.equal(normalizeBreederSubmissionType("social_tiktok"), "social_tiktok");
  assert.equal(normalizeBreederSubmissionType("unknown"), "");
});
