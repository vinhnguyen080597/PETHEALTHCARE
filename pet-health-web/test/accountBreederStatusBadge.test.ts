import test from "node:test";
import assert from "node:assert/strict";
import { breederProfileSavePublishesImmediately, showAccountBreederStatusBadge } from "../src/lib/accountBreederStatusBadge";

test("hides verified breeder status on Account and Edit Breeder profile", () => {
  assert.equal(showAccountBreederStatusBadge("verified"), false);
  assert.equal(showAccountBreederStatusBadge("Verified"), false);
});

test("still shows non-verified breeder request statuses", () => {
  assert.equal(showAccountBreederStatusBadge("pending_review"), true);
  assert.equal(showAccountBreederStatusBadge("rejected"), true);
  assert.equal(showAccountBreederStatusBadge("suspended"), true);
  assert.equal(showAccountBreederStatusBadge("unverified"), true);
});

test("verified profile edits publish immediately without admin review", () => {
  assert.equal(breederProfileSavePublishesImmediately("verified"), true);
  assert.equal(breederProfileSavePublishesImmediately("pending_review"), false);
  assert.equal(breederProfileSavePublishesImmediately("rejected"), false);
});
