import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  appealStatusLabelKey,
  farmReviewKindI18nKey,
  findRequestByFocusId,
  isSafeHttpUrl,
  requestQueueFocusId,
  submissionPayloadHref,
} from "../src/lib/admin/requestQueue";

test("requestQueueFocusId uses the entity id for each request type", () => {
  assert.equal(
    requestQueueFocusId({ type: "breeder", profile: { id: "bp-1" } }),
    "bp-1",
  );
  assert.equal(requestQueueFocusId({ type: "post", post: { id: "p1" } }), "p1");
  assert.equal(
    requestQueueFocusId({ type: "farm_review", farmReview: { id: "rv-1" } }),
    "rv-1",
  );
  assert.equal(
    requestQueueFocusId({ type: "feedback", ticket: { id: "fb-1" } }),
    "fb-1",
  );
  assert.equal(
    requestQueueFocusId({ type: "scam", ticket: { id: "sc-2" } }),
    "sc-2",
  );
});

test("findRequestByFocusId matches the focused queue row", () => {
  const items = [
    { type: "post" as const, post: { id: "p1" } },
    { type: "report" as const, report: { id: "rep-3" } },
  ];
  assert.equal(findRequestByFocusId(items, "rep-3")?.type, "report");
  assert.equal(findRequestByFocusId(items, "missing"), undefined);
});

test("isSafeHttpUrl only allows http(s)", () => {
  assert.equal(isSafeHttpUrl("https://example.com/a"), true);
  assert.equal(isSafeHttpUrl("http://example.com"), true);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("/relative"), false);
  assert.equal(isSafeHttpUrl(""), false);
});

test("submissionPayloadHref skips javascript and Zalo phones", () => {
  assert.equal(
    submissionPayloadHref("https://facebook.com/farm", "social_facebook"),
    "https://facebook.com/farm",
  );
  assert.equal(submissionPayloadHref("0901234567", "social_zalo"), null);
  assert.equal(submissionPayloadHref("javascript:alert(1)", "facility_video"), null);
});

test("farm review kind and appeal status i18n keys", () => {
  assert.equal(farmReviewKindI18nKey("sale"), "admin.farmReviews.kind.sale");
  assert.equal(farmReviewKindI18nKey("nope"), "admin.farmReviews.kind.primary");
  assert.equal(
    appealStatusLabelKey("pending_breeder_action"),
    "admin.appeals.status.pending_breeder_action",
  );
  assert.equal(appealStatusLabelKey("appealed"), "admin.appeals.status.appealed");
  assert.ok(en["admin.appeals.status.appealed"]);
  assert.ok(vi["admin.appeals.status.appealed"]);
  assert.ok(en["admin.farmReviews.reviewer"]);
  assert.ok(vi["admin.farmReviews.reviewer"]);
});

test("request queue i18n keys exist in EN and VI", () => {
  assert.ok(en["admin.requests.focusMissing"]);
  assert.ok(vi["admin.requests.focusMissing"]);
  assert.ok(en["admin.details.rejectTitle"]);
  assert.ok(vi["admin.details.rejectTitle"]);
  assert.ok(en["admin.farmReviews.rejectTitle"]);
  assert.ok(vi["admin.farmReviews.rejectTitle"]);
});
