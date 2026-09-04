import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOW_BREEDER_VERIFICATION_BADGES,
  showBreederVerifiedBadge,
} from "../src/lib/breederVerificationUi";

test("farm chrome Verified badges stay gated off by default", () => {
  assert.equal(SHOW_BREEDER_VERIFICATION_BADGES, false);
  assert.equal(showBreederVerifiedBadge(true), false);
  assert.equal(showBreederVerifiedBadge(false), false);
});

test("marketplace Verified badges respect compliance strip when ungated", () => {
  assert.equal(showBreederVerifiedBadge(true, { gated: false }), true);
  assert.equal(
    showBreederVerifiedBadge(true, { gated: false, complianceStripped: true }),
    false,
  );
  assert.equal(showBreederVerifiedBadge(false, { gated: false }), false);
});
