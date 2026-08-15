import test from "node:test";
import assert from "node:assert/strict";
import { showAccountBreederStatusBadge } from "../src/lib/accountBreederStatusBadge";

test("hides verified breeder status badge until eligibility rules ship", () => {
  assert.equal(showAccountBreederStatusBadge("verified"), false);
  assert.equal(showAccountBreederStatusBadge("Verified"), false);
});

test("still shows non-verified breeder request statuses", () => {
  assert.equal(showAccountBreederStatusBadge("pending_review"), true);
  assert.equal(showAccountBreederStatusBadge("rejected"), true);
  assert.equal(showAccountBreederStatusBadge("suspended"), true);
  assert.equal(showAccountBreederStatusBadge("unverified"), true);
});
