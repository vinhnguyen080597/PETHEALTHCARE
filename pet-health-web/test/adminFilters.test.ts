import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORY_ACTION_FILTERS,
  breederGroup,
  historyActionI18nKey,
  passesDateFilter,
  requestStatusGroup,
  sortByDate,
} from "../src/lib/admin/filters.ts";

test("requestStatusGroup maps request statuses for filters", () => {
  assert.equal(requestStatusGroup({ type: "report", status: "open" }), "waiting");
  assert.equal(requestStatusGroup({ type: "report", status: "reviewed" }), "resolved");
  assert.equal(requestStatusGroup({ type: "breeder", status: "verified" }), "approved");
  assert.equal(requestStatusGroup({ type: "breeder", status: "rejected" }), "rejected");
  assert.equal(requestStatusGroup({ type: "breeder", status: "pending_review" }), "waiting");
  assert.equal(requestStatusGroup({ type: "post", status: "published" }), "approved");
  assert.equal(requestStatusGroup({ type: "post", status: "archived" }), "rejected");
  assert.equal(requestStatusGroup({ type: "post", status: "pending_review" }), "waiting");
});

test("breederGroup maps verification status buckets", () => {
  assert.equal(breederGroup({ verification_status: "verified" }), "active");
  assert.equal(breederGroup({ verification_status: "rejected" }), "inactive");
  assert.equal(breederGroup({ verification_status: "suspended" }), "inactive");
  assert.equal(breederGroup({ verification_status: "pending_review" }), "waiting");
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
