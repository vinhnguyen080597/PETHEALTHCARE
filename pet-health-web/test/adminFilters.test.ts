import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORY_ACTION_FILTERS,
  breederGroup,
  breederVerifyConfirmKey,
  historyActionI18nKey,
  isBreederVerificationQueueItem,
  isDetailSubmissionQueueItem,
  isFarmReviewQueueItem,
  isAppealQueueItem,
  isListingModerationQueueItem,
  passesDateFilter,
  requestStatusGroup,
  requestTypeLabelKey,
  sortByDate,
  statusFilterForFocusedItem,
} from "../src/lib/admin/filters";

test("requestStatusGroup maps request statuses for filters", () => {
  assert.equal(requestStatusGroup({ type: "report", status: "open" }), "waiting");
  assert.equal(requestStatusGroup({ type: "report", status: "reviewed" }), "resolved");
  assert.equal(requestStatusGroup({ type: "feedback", status: "open" }), "waiting");
  assert.equal(requestStatusGroup({ type: "feedback", status: "dismissed" }), "resolved");
  assert.equal(requestStatusGroup({ type: "scam", status: "open" }), "waiting");
  assert.equal(requestStatusGroup({ type: "scam", status: "reviewed" }), "resolved");
  assert.equal(requestStatusGroup({ type: "breeder", status: "verified" }), "approved");
  assert.equal(requestStatusGroup({ type: "breeder", status: "rejected" }), "rejected");
  assert.equal(requestStatusGroup({ type: "breeder", status: "pending_review" }), "waiting");
  assert.equal(requestStatusGroup({ type: "breeder", status: "unverified" }), "resolved");
  assert.equal(requestStatusGroup({ type: "post", status: "published" }), "approved");
  assert.equal(requestStatusGroup({ type: "post", status: "archived" }), "rejected");
  assert.equal(requestStatusGroup({ type: "post", status: "pending_review" }), "waiting");
  assert.equal(requestStatusGroup({ type: "post", status: "deposit_hold" }), "resolved");
  assert.equal(requestStatusGroup({ type: "post", status: "sold" }), "resolved");
  assert.equal(requestStatusGroup({ type: "detail", status: "pending" }), "waiting");
  assert.equal(requestStatusGroup({ type: "detail", status: "approved" }), "approved");
  assert.equal(requestStatusGroup({ type: "detail", status: "rejected" }), "rejected");
  assert.equal(requestStatusGroup({ type: "appeal", status: "appealed" }), "waiting");
  assert.equal(requestStatusGroup({ type: "appeal", status: "pending_breeder_action" }), "waiting");
  assert.equal(requestStatusGroup({ type: "farm_review", status: "pending" }), "waiting");
  assert.equal(requestStatusGroup({ type: "farm_review", status: "approved" }), "approved");
  assert.equal(requestStatusGroup({ type: "appeal", status: "restored" }), "approved");
  assert.equal(requestStatusGroup({ type: "appeal", status: "upheld" }), "rejected");
});

test("isBreederVerificationQueueItem only includes pending_review", () => {
  assert.equal(isBreederVerificationQueueItem("pending_review"), true);
  assert.equal(isBreederVerificationQueueItem("unverified"), false);
  assert.equal(isBreederVerificationQueueItem("verified"), false);
  assert.equal(isBreederVerificationQueueItem("rejected"), false);
  assert.equal(isBreederVerificationQueueItem(null), false);
});

test("isListingModerationQueueItem only includes pending_review listings", () => {
  assert.equal(isListingModerationQueueItem("pending_review"), true);
  assert.equal(isListingModerationQueueItem("published"), false);
  assert.equal(isListingModerationQueueItem("deposit_hold"), false);
  assert.equal(isListingModerationQueueItem("archived"), false);
});

test("detail, farm review, and appeal queue membership", () => {
  assert.equal(isDetailSubmissionQueueItem("pending"), true);
  assert.equal(isDetailSubmissionQueueItem("approved"), false);
  assert.equal(isDetailSubmissionQueueItem("rejected"), false);
  assert.equal(isFarmReviewQueueItem("pending"), true);
  assert.equal(isFarmReviewQueueItem("approved"), false);
  assert.equal(isAppealQueueItem("appealed"), true);
  assert.equal(isAppealQueueItem("pending_breeder_action"), false);
  assert.equal(isAppealQueueItem("upheld"), false);
});

test("requestTypeLabelKey maps farm_review to camelCase i18n key", () => {
  assert.equal(requestTypeLabelKey("farm_review"), "admin.requests.type.farmReview");
  assert.equal(requestTypeLabelKey("post"), "admin.requests.type.post");
});

test("statusFilterForFocusedItem widens waiting when the focused row is elsewhere", () => {
  assert.equal(
    statusFilterForFocusedItem({ type: "report", status: "reviewed" }, "waiting"),
    "resolved",
  );
  assert.equal(
    statusFilterForFocusedItem({ type: "post", status: "pending_review" }, "waiting"),
    "waiting",
  );
  assert.equal(
    statusFilterForFocusedItem({ type: "report", status: "open" }, "all"),
    "all",
  );
});

test("breederGroup maps verification status buckets", () => {
  assert.equal(breederGroup({ verification_status: "verified" }), "active");
  assert.equal(breederGroup({ verification_status: "rejected" }), "inactive");
  assert.equal(breederGroup({ verification_status: "suspended" }), "inactive");
  assert.equal(breederGroup({ verification_status: "pending_review" }), "waiting");
  assert.equal(breederGroup({ verification_status: "unverified" }), "draft");
  assert.equal(breederGroup({}), "draft");
});

test("breederVerifyConfirmKey skips pending_review and confirms restore/bypass", () => {
  assert.equal(breederVerifyConfirmKey("pending_review"), null);
  assert.equal(breederVerifyConfirmKey("rejected"), "admin.breeders.confirmRestore");
  assert.equal(breederVerifyConfirmKey("suspended"), "admin.breeders.confirmRestore");
  assert.equal(breederVerifyConfirmKey("unverified"), "admin.breeders.confirmVerify");
});

test("passesDateFilter today/week use injectable now", () => {
  const now = new Date("2026-08-07T15:00:00.000Z").getTime();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = new Date(startOfToday.getTime() + 60 * 60 * 1000).toISOString();
  const yesterdayIso = new Date(startOfToday.getTime() - 60 * 60 * 1000).toISOString();
  const eightDaysAgoIso = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(passesDateFilter(todayIso, "today", now), true);
  assert.equal(passesDateFilter(yesterdayIso, "today", now), false);
  assert.equal(passesDateFilter(yesterdayIso, "week", now), true);
  assert.equal(passesDateFilter(eightDaysAgoIso, "week", now), false);
  assert.equal(passesDateFilter(eightDaysAgoIso, "newest", now), true);
  assert.equal(passesDateFilter(undefined, "today", now), false);
});

test("sortByDate newest and oldest", () => {
  const rows = [
    { id: "a", createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "b", createdAt: "2026-08-05T00:00:00.000Z" },
    { id: "c", created_at: "2026-08-03T00:00:00.000Z" },
  ];
  assert.deepEqual(
    sortByDate(rows, "newest").map((row) => row.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    sortByDate(rows, "oldest").map((row) => row.id),
    ["a", "c", "b"],
  );
});

test("HISTORY_ACTION_FILTERS includes pet and care actions", () => {
  assert.ok(HISTORY_ACTION_FILTERS.includes("pet.create"));
  assert.ok(HISTORY_ACTION_FILTERS.includes("care_record.delete"));
  assert.equal(historyActionI18nKey("pet.create"), "admin.history.action.pet.create");
});
