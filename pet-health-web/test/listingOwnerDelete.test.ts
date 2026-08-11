import test from "node:test";
import assert from "node:assert/strict";
import {
  OWNER_DELETE_SOLD_COOLDOWN_DAYS,
  evaluateOwnerDeleteListing,
  listingDeleteClickAction,
  metadataMarksOwnerDeleted,
  ownerDeleteBlockedMessage,
} from "../src/lib/listingOwnerDelete";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-08-11T12:00:00.000Z");

test("owner can delete draft pending and published listings", () => {
  assert.equal(
    evaluateOwnerDeleteListing({ isOwner: true, status: "draft" }, now).allowed,
    true,
  );
  assert.equal(
    evaluateOwnerDeleteListing({ isOwner: true, status: "pending_review" }, now)
      .allowed,
    true,
  );
  assert.equal(
    evaluateOwnerDeleteListing({ isOwner: true, status: "published" }, now)
      .allowed,
    true,
  );
});

test("deposit hold blocks delete", () => {
  assert.deepEqual(
    evaluateOwnerDeleteListing({ isOwner: true, status: "deposit_hold" }, now),
    { allowed: false, reason: "deposit_hold" },
  );
});

test("sold listings are deletable only after 7 days", () => {
  const blocked = evaluateOwnerDeleteListing(
    {
      isOwner: true,
      status: "sold",
      completedAt: new Date(now - 2 * DAY_MS).toISOString(),
    },
    now,
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "sold_cooldown");
  assert.equal(blocked.daysRemaining, 5);
  assert.equal(OWNER_DELETE_SOLD_COOLDOWN_DAYS, 7);

  assert.equal(
    evaluateOwnerDeleteListing(
      {
        isOwner: true,
        status: "sold",
        completedAt: new Date(now - 7 * DAY_MS).toISOString(),
      },
      now,
    ).allowed,
    true,
  );
});

test("listingDeleteClickAction keeps hold and cooldown clicks as blocked popup", () => {
  assert.equal(
    listingDeleteClickAction({ allowed: true, reason: null }),
    "confirm",
  );
  assert.equal(
    listingDeleteClickAction({ allowed: false, reason: "deposit_hold" }),
    "blocked",
  );
  assert.equal(
    listingDeleteClickAction({
      allowed: false,
      reason: "sold_cooldown",
      daysRemaining: 4,
    }),
    "blocked",
  );
  assert.equal(
    listingDeleteClickAction({ allowed: false, reason: "already_deleted" }),
    "hidden",
  );
});

test("owner delete blocked copy interpolates remaining days", () => {
  const message = ownerDeleteBlockedMessage(
    { allowed: false, reason: "sold_cooldown", daysRemaining: 3 },
    {
      deposit: "hold",
      cooldown: "Wait {days} day(s).",
    },
  );
  assert.equal(message, "Wait 3 day(s).");
});

test("metadataMarksOwnerDeleted reads flags", () => {
  assert.equal(metadataMarksOwnerDeleted({ owner_deleted: true }), true);
  assert.equal(
    metadataMarksOwnerDeleted({ owner_deleted_at: "2026-08-01T00:00:00.000Z" }),
    true,
  );
  assert.equal(metadataMarksOwnerDeleted({}), false);
});
