import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OWNER_DELETE_SOLD_COOLDOWN_DAYS,
  evaluateOwnerDeleteListing,
  isOwnerDeletedListing,
} from '../src/utils/listingOwnerDelete.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-08-11T12:00:00.000Z');

test('draft pending and published listings are deletable', () => {
  for (const status of ['draft', 'pending_review', 'published']) {
    assert.deepEqual(evaluateOwnerDeleteListing({ status }, now), {
      allowed: true,
      reason: null,
    });
  }
});

test('deposit hold listings cannot be deleted', () => {
  assert.deepEqual(
    evaluateOwnerDeleteListing({ status: 'deposit_hold' }, now),
    { allowed: false, reason: 'deposit_hold' },
  );
});

test('sold listings wait 7 days from completion', () => {
  const completedAt = new Date(now - 3 * DAY_MS).toISOString();
  const decision = evaluateOwnerDeleteListing(
    { status: 'sold', completedAt },
    now,
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'sold_cooldown');
  assert.equal(decision.daysRemaining, 4);
  assert.equal(OWNER_DELETE_SOLD_COOLDOWN_DAYS, 7);

  const ready = evaluateOwnerDeleteListing(
    {
      status: 'sold',
      completedAt: new Date(now - 7 * DAY_MS).toISOString(),
    },
    now,
  );
  assert.deepEqual(ready, { allowed: true, reason: null });
});

test('archived sold metadata uses deal completed_at', () => {
  const decision = evaluateOwnerDeleteListing(
    {
      status: 'archived',
      metadataSold: true,
      metadata: {
        sold: true,
        deal: { completed_at: new Date(now - 8 * DAY_MS).toISOString() },
      },
    },
    now,
  );
  assert.deepEqual(decision, { allowed: true, reason: null });
});

test('owner-deleted listings cannot be deleted again', () => {
  assert.equal(isOwnerDeletedListing({ owner_deleted: true }), true);
  assert.deepEqual(
    evaluateOwnerDeleteListing({
      status: 'archived',
      ownerDeleted: true,
    }, now),
    { allowed: false, reason: 'already_deleted' },
  );
});

test('non-owners cannot delete', () => {
  assert.deepEqual(
    evaluateOwnerDeleteListing({ isOwner: false, status: 'published' }, now),
    { allowed: false, reason: 'not_owner' },
  );
});
