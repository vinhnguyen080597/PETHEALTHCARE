import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  listingHideFromReportAllowed,
  reportReasonLabelKey,
  reportStatusLabelKey,
  reportTargetHref,
} from "../src/lib/admin/reportDisplay";

const REASON_KEYS = [
  "admin.reports.reason.stock_photo_spam",
  "admin.reports.reason.wrong_category_species",
  "admin.reports.reason.inaccurate_listing",
  "admin.reports.reason.abusive_communication",
  "admin.reports.reason.concealed_illness",
  "admin.reports.reason.forged_documents",
  "admin.reports.reason.confirmed_scam",
  "admin.reports.reason.prohibited_wildlife",
  "admin.reports.reason.deal_dispute",
  "admin.reports.confirmDismiss",
  "admin.reports.commentTarget",
  "admin.reports.unknownTarget",
] as const;

test("report reason i18n keys exist in EN and VI", () => {
  for (const key of REASON_KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});

test("reportReasonLabelKey maps known and legacy codes", () => {
  assert.equal(
    reportReasonLabelKey("stock_photo_spam"),
    "admin.reports.reason.stock_photo_spam",
  );
  assert.equal(
    reportReasonLabelKey("deal_dispute"),
    "admin.reports.reason.deal_dispute",
  );
  assert.equal(
    reportReasonLabelKey("scam"),
    "admin.reports.reason.confirmed_scam",
  );
  assert.equal(reportReasonLabelKey("not_a_reason"), null);
  assert.equal(reportReasonLabelKey(""), null);
});

test("reportStatusLabelKey and hide-from-report rules", () => {
  assert.equal(reportStatusLabelKey("open"), "admin.reports.open");
  assert.equal(reportStatusLabelKey("reviewed"), "admin.reports.reviewed");
  assert.equal(reportStatusLabelKey("dismissed"), "admin.reports.dismissed");
  assert.equal(listingHideFromReportAllowed("published"), true);
  assert.equal(listingHideFromReportAllowed("deposit_hold"), false);
  assert.equal(listingHideFromReportAllowed("pending_review"), false);
  assert.equal(listingHideFromReportAllowed("archived"), false);
});

test("reportTargetHref prefers listing then farm profile", () => {
  assert.equal(
    reportTargetHref({ post_id: "post 1" }),
    "/app/pet-feed/posts/post%201",
  );
  assert.equal(
    reportTargetHref({ breeder_profile_id: "farm/1" }),
    "/app/breeders/farm%2F1",
  );
  assert.equal(reportTargetHref({}), null);
});
