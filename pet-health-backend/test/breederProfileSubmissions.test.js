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

  const video = applyApprovedBreederSubmission(profile, {
    submission_type: "facility_video",
    payload: { url: "https://cdn.example/v.mp4" },
  }, "2026-08-12T00:00:00.000Z");
  assert.equal(video.metadata.facility_verified, true);
  assert.equal(video.metadata.facility_video_url, "https://cdn.example/v.mp4");
});

test("normalizeBreederSubmissionType rejects unknown types", () => {
  assert.equal(normalizeBreederSubmissionType("social_tiktok"), "social_tiktok");
  assert.equal(normalizeBreederSubmissionType("unknown"), "");
});
