import test from "node:test";
import assert from "node:assert/strict";
import {
  approvedSubmissionTypes,
  breederSubmissionTypeLabel,
  pendingSubmissionTypes,
  validateSocialSubmissionUrl,
} from "../src/lib/breederProfileSubmissions.ts";
import type { BreederProfileSubmission } from "../src/lib/breederProfileSubmissions.ts";

test("breederSubmissionTypeLabel returns VI/EN labels", () => {
  assert.equal(breederSubmissionTypeLabel("facility_video", "VI"), "Video cơ sở");
  assert.equal(breederSubmissionTypeLabel("social_instagram", "EN"), "Instagram");
});

test("validateSocialSubmissionUrl requires http(s)", () => {
  assert.equal(validateSocialSubmissionUrl(""), "URL is required");
  assert.equal(validateSocialSubmissionUrl("facebook.com/x"), "Link must start with http:// or https://");
  assert.equal(validateSocialSubmissionUrl("https://facebook.com/x"), null);
});

test("pending and approved submission type helpers", () => {
  const rows: BreederProfileSubmission[] = [
    {
      id: "1",
      breeder_profile_id: "p1",
      user_id: "u1",
      submission_type: "social_facebook",
      payload: { url: "https://fb.com/a" },
      status: "pending",
    },
    {
      id: "2",
      breeder_profile_id: "p1",
      user_id: "u1",
      submission_type: "facility_video",
      payload: { url: "https://cdn/v.mp4" },
      status: "approved",
    },
  ];
  assert.deepEqual(pendingSubmissionTypes(rows), ["social_facebook"]);
  assert.deepEqual(approvedSubmissionTypes(rows), ["facility_video"]);
});
