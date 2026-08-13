import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import { TRUST_GUIDE_HOW_TO_EARN } from "../src/lib/farmTrustGuide";
import {
  breederSubmissionErrorI18nKey,
  buildTrustGuideEarnRowStates,
  formatTrustGuideEarnPoints,
  earnRowApprovedHref,
  earnRowApprovedValue,
  earnRowCta,
  earnRowCtaLabelKey,
  earnModalView,
  earnRowDescription,
  earnRowMediaKind,
  earnRowQueueStatus,
  formatEarnRowApprovedValue,
  trustGuideEarnActionForId,
  trustGuideEarnRowDone,
  trustGuideEarnShowArrow,
} from "../src/lib/trustGuideEarnStatus";
import { parseTrustAwardedFromMeta } from "../src/lib/breederTransparencyScore";

test("trust guide earn row marks awarded social as done and still offers update", () => {
  const awarded = parseTrustAwardedFromMeta({
    social_facebook_trust_awarded: true,
  });
  assert.equal(
    trustGuideEarnRowDone("facebook", {
      isVerified: true,
      awarded,
      senConfirmedCompletions: 0,
      fiveStarReviewCount: 0,
    }),
    true,
  );
  assert.equal(earnRowCta("facebook", true, null), "update");
  assert.equal(earnRowCta("facebook", true, "pending"), "pending");
  assert.equal(trustGuideEarnShowArrow("facebook", true, "pending"), false);
});

test("unearned profile missions show update except activity rows", () => {
  const awarded = parseTrustAwardedFromMeta({});
  assert.equal(
    trustGuideEarnShowArrow(
      "zalo",
      trustGuideEarnRowDone("zalo", {
        isVerified: true,
        awarded,
        senConfirmedCompletions: 0,
        fiveStarReviewCount: 0,
      }),
    ),
    true,
  );
  assert.equal(trustGuideEarnShowArrow("completions", false), false);
  assert.equal(trustGuideEarnShowArrow("reviews", false), false);
});

test("activity earn rows use per-occurrence point labels", () => {
  assert.equal(
    formatTrustGuideEarnPoints(
      { id: "completions", points: 3 },
      "VI",
    ),
    "+3/lần",
  );
  assert.equal(
    formatTrustGuideEarnPoints({ id: "facebook", points: 5 }, "VI"),
    "+5đ",
  );
});

test("buildTrustGuideEarnRowStates maps facebook as done when trust awarded", () => {
  const rows = buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
    isVerified: true,
    meta: { social_facebook_trust_awarded: true },
    senConfirmedCompletions: 0,
    fiveStarReviewCount: 0,
    lang: "VI",
  });
  const facebook = rows.find((row) => row.id === "facebook");
  assert.ok(facebook);
  assert.equal(facebook!.done, true);
  assert.equal(facebook!.cta, "update");
  assert.equal(facebook!.showArrow, true);
});

test("legacy approved flag counts as awarded until trust_awarded exists", () => {
  const awarded = parseTrustAwardedFromMeta({
    social_zalo_approved: true,
  });
  assert.equal(awarded.socialZalo, true);
});

test("facility and license earn rows open a media upload action", () => {
  assert.deepEqual(trustGuideEarnActionForId("farmFacility"), {
    kind: "submission",
    submissionType: "facility_video",
  });
  assert.deepEqual(trustGuideEarnActionForId("businessLicense"), {
    kind: "submission",
    submissionType: "business_license",
  });
});

test("pending submission replaces arrow with a short status", () => {
  assert.equal(earnRowCta("facebook", false, "pending"), "pending");
  assert.equal(trustGuideEarnShowArrow("facebook", false, "pending"), false);
  assert.equal(earnRowCta("facebook", false, "rejected"), "rejected");
  assert.equal(earnRowCtaLabelKey("pending"), "farm.trust.guide.earnPending");
  assert.equal(earnRowCtaLabelKey("rejected"), "farm.trust.guide.earnRejected");
  assert.equal(earnRowCtaLabelKey("update"), "farm.trust.guide.earnUpdate");
  assert.equal(earnRowCtaLabelKey("none"), null);
  assert.ok(en["farm.trust.guide.earnPending"]);
  assert.ok(vi["farm.trust.guide.earnPending"]);
  assert.ok(en["farm.trust.guide.earnRejected"]);
  assert.ok(vi["farm.trust.guide.earnRejected"]);
  assert.ok(en["farm.trust.guide.earnUpdate"]);
  assert.ok(vi["farm.trust.guide.earnUpdate"]);
  assert.equal(
    breederSubmissionErrorI18nKey("SUBMISSION_ALREADY_PENDING"),
    "farm.trust.guide.earnAlreadyPending",
  );
  assert.equal(
    earnRowQueueStatus("facebook", {
      submissions: [
        { submission_type: "social_facebook", status: "rejected" },
        { submission_type: "social_facebook", status: "pending" },
      ],
    }),
    "pending",
  );
  const rows = buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
    isVerified: true,
    meta: {},
    senConfirmedCompletions: 0,
    fiveStarReviewCount: 0,
    lang: "VI",
    submissions: [{ submission_type: "social_facebook", status: "pending" }],
  });
  const facebook = rows.find((row) => row.id === "facebook");
  assert.equal(facebook?.cta, "pending");
  assert.equal(facebook?.showArrow, false);
});

test("earn modal view goes loading then success after submit", () => {
  assert.equal(earnModalView({ busy: false, submitted: false }), "form");
  assert.equal(earnModalView({ busy: true, submitted: false }), "loading");
  assert.equal(earnModalView({ busy: false, submitted: true }), "success");
  assert.equal(earnModalView({ busy: true, submitted: true }), "success");
});

test("approved earn rows replace how-to copy with submitted content", () => {
  assert.equal(
    formatEarnRowApprovedValue("https://www.facebook.com/myfarm"),
    "www.facebook.com/myfarm",
  );
  assert.equal(formatEarnRowApprovedValue("0901234567"), "0901234567");
  assert.equal(
    earnRowApprovedHref("https://facebook.com/myfarm"),
    "https://facebook.com/myfarm",
  );
  assert.equal(earnRowApprovedHref("0901234567"), "tel:0901234567");
  assert.equal(
    earnRowApprovedValue("facebook", {
      submissions: [
        {
          submission_type: "social_facebook",
          status: "approved",
          payload: { url: "https://facebook.com/myfarm" },
        },
      ],
    }),
    "https://facebook.com/myfarm",
  );
  assert.equal(
    earnRowApprovedValue("zalo", { contact: { zalo: "0901234567" } }),
    "0901234567",
  );
  assert.equal(
    earnRowApprovedValue("firstWarrantyPolicy", {
      warrantyPolicies: [{ title: "Bảo hành 7 ngày" }],
    }),
    "Bảo hành 7 ngày",
  );
  const facebookHow = TRUST_GUIDE_HOW_TO_EARN.find((row) => row.id === "facebook")!;
  assert.equal(
    earnRowDescription(facebookHow, "VI", "https://facebook.com/myfarm", true),
    "facebook.com/myfarm",
  );
  assert.match(
    earnRowDescription(facebookHow, "VI", "https://facebook.com/myfarm", false),
    /Gửi link/,
  );
  const rows = buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
    isVerified: true,
    meta: { social_zalo_trust_awarded: true },
    senConfirmedCompletions: 0,
    fiveStarReviewCount: 0,
    lang: "VI",
    contact: { zalo: "0901234567" },
  });
  const zalo = rows.find((row) => row.id === "zalo");
  assert.equal(zalo?.done, true);
  assert.equal(zalo?.description, "0901234567");
  assert.equal(zalo?.descriptionHref, "tel:0901234567");
  assert.equal(zalo?.cta, "update");
});

test("approved facility video uses a playable player instead of a link", () => {
  const videoUrl = "https://cdn.example/facility.mp4";
  assert.equal(earnRowMediaKind("farmFacility", videoUrl), "video");
  assert.equal(earnRowMediaKind("facebook", "https://facebook.com/myfarm"), null);
  const rows = buildTrustGuideEarnRowStates(TRUST_GUIDE_HOW_TO_EARN, {
    isVerified: true,
    meta: {
      facility_video_trust_awarded: true,
      facility_video_url: videoUrl,
    },
    senConfirmedCompletions: 0,
    fiveStarReviewCount: 0,
    lang: "VI",
  });
  const facility = rows.find((row) => row.id === "farmFacility");
  assert.equal(facility?.done, true);
  assert.equal(facility?.mediaKind, "video");
  assert.equal(facility?.mediaUrl, videoUrl);
  assert.equal(facility?.description, "");
  assert.equal(facility?.descriptionHref, null);
  assert.equal(facility?.cta, "update");
});
