import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOW_BREEDER_VERIFICATION_BADGES,
  showBreederVerifiedBadge,
} from "../src/lib/breederVerificationUi";

test("public Verified badges stay off until eligibility rules ship", () => {
  assert.equal(SHOW_BREEDER_VERIFICATION_BADGES, false);
  assert.equal(showBreederVerifiedBadge(true), false);
  assert.equal(showBreederVerifiedBadge(false), false);
});
