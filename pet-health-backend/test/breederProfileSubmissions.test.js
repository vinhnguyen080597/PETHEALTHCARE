import test from "node:test";
import assert from "node:assert/strict";
import {
  applyApprovedBreederSubmission,
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

test("normalizeBreederSubmissionType rejects unknown types", () => {
  assert.equal(normalizeBreederSubmissionType("social_tiktok"), "social_tiktok");
  assert.equal(normalizeBreederSubmissionType("unknown"), "");
});
