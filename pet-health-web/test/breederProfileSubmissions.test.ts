import test from "node:test";
import assert from "node:assert/strict";
import {
  approvedSubmissionTypes,
  breederSubmissionTypeLabel,
  pendingSubmissionTypes,
  socialSubmissionUrlError,
  SOCIAL_URL_ERROR_I18N_KEYS,
  validateSocialSubmissionUrl,
  WEB_EDIT_BREEDER_SHOWS_TRANSPARENCY_DETAILS,
} from "../src/lib/breederProfileSubmissions.ts";
import type { BreederProfileSubmission } from "../src/lib/breederProfileSubmissions.ts";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("web Edit Breeder profile omits transparency details section", () => {
  assert.equal(WEB_EDIT_BREEDER_SHOWS_TRANSPARENCY_DETAILS, false);
  // Copy still used by Trust Guide earn modal / status badges.
  assert.equal(
    (vi as Record<string, string>)["account.breederDetails.title"],
    "Chi tiết minh bạch",
  );
  assert.equal(
    (en as Record<string, string>)["account.breederDetails.title"],
    "Transparency details",
  );
});

test("breederSubmissionTypeLabel returns VI/EN labels", () => {
  assert.equal(breederSubmissionTypeLabel("facility_video", "VI"), "Video cơ sở");
  assert.equal(breederSubmissionTypeLabel("social_instagram", "EN"), "Instagram");
});

test("validateSocialSubmissionUrl requires http(s)", () => {
  assert.equal(validateSocialSubmissionUrl(""), "URL is required");
  assert.equal(validateSocialSubmissionUrl("facebook.com/x"), "Link must start with http:// or https://");
  assert.equal(validateSocialSubmissionUrl("https://example.com/x"), null);
});

test("social profile URLs must match each platform", () => {
  assert.equal(
    validateSocialSubmissionUrl("https://facebook.com/myfarm", "social_facebook"),
    null,
  );
  assert.ok(
    validateSocialSubmissionUrl(
      "https://facebook.com/myfarm/posts/123",
      "social_facebook",
    ),
  );
  assert.equal(validateSocialSubmissionUrl("0901234567", "social_zalo"), null);
  assert.equal(
    validateSocialSubmissionUrl("https://zalo.me/farmoa", "social_zalo") != null,
    true,
  );
  assert.equal(
    validateSocialSubmissionUrl("https://www.tiktok.com/@petfarm", "social_tiktok"),
    null,
  );
  assert.ok(
    validateSocialSubmissionUrl(
      "https://www.tiktok.com/@petfarm/video/123",
      "social_tiktok",
    ),
  );
  assert.equal(
    validateSocialSubmissionUrl(
      "https://www.instagram.com/petfarm",
      "social_instagram",
    ),
    null,
  );
  assert.ok(
    validateSocialSubmissionUrl(
      "https://www.instagram.com/reel/abc",
      "social_instagram",
    ),
  );
});

test("social URL errors have EN/VI copy", () => {
  const code = socialSubmissionUrlError(
    "https://www.facebook.com/",
    "social_facebook",
  );
  assert.equal(code, "facebook");
  const key = SOCIAL_URL_ERROR_I18N_KEYS[code!];
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(
    enDict[key],
    "Use a Facebook profile or page URL (facebook.com/yourpage).",
  );
  assert.equal(
    viDict[key],
    "Dùng link trang hoặc hồ sơ Facebook (facebook.com/yourpage).",
  );
  for (const errorKey of Object.values(SOCIAL_URL_ERROR_I18N_KEYS)) {
    assert.ok(enDict[errorKey], `missing EN ${errorKey}`);
    assert.ok(viDict[errorKey], `missing VI ${errorKey}`);
    assert.notEqual(enDict[errorKey], errorKey);
    assert.notEqual(viDict[errorKey], errorKey);
  }
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
