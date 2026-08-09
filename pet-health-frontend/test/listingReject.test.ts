import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listingRejectReasonMissing,
  listingRejectRequiresReason,
} from '../src/utils/listingReject.ts';

const root = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(root, '../src/i18n/locales/en.json'), 'utf8'));
const vi = JSON.parse(readFileSync(join(root, '../src/i18n/locales/vi.json'), 'utf8'));

test('listingRejectRequiresReason only for pending_review → archived', () => {
  assert.equal(listingRejectRequiresReason('pending_review', 'archived'), true);
  assert.equal(listingRejectRequiresReason('published', 'archived'), false);
});

test('listingRejectReasonMissing', () => {
  assert.equal(listingRejectReasonMissing('pending_review', 'archived', ''), true);
  assert.equal(listingRejectReasonMissing('pending_review', 'archived', 'Missing photos'), false);
});

test('adminReview listing reject i18n keys exist EN/VI', () => {
  assert.ok(en.adminReview.rejectListingTitle);
  assert.ok(vi.adminReview.rejectListingTitle);
  assert.ok(en.adminReview.rejectListingHint);
  assert.ok(vi.adminReview.rejectListingHint);
  assert.ok(en.adminReview.rejectListingReasonPlaceholder);
  assert.ok(vi.adminReview.rejectListingReasonPlaceholder);
});
