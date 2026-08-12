import test from "node:test";
import assert from "node:assert/strict";
import {
  isPendingBreederTransparencyWarning,
  requestStatusGroupForAppeal,
  transparencyWarningTitle,
} from "../src/lib/transparencyWarnings.ts";

test("isPendingBreederTransparencyWarning", () => {
  assert.equal(
    isPendingBreederTransparencyWarning({
      id: "1",
      breeder_profile_id: "p",
      user_id: "u",
      score_at_trigger: 10,
      penalty_points_at_trigger: 20,
      status: "pending_breeder_action",
    }),
    true,
  );
  assert.equal(
    isPendingBreederTransparencyWarning({
      id: "1",
      breeder_profile_id: "p",
      user_id: "u",
      score_at_trigger: 10,
      penalty_points_at_trigger: 20,
      status: "appealed",
    }),
    false,
  );
});

test("requestStatusGroupForAppeal maps statuses", () => {
  assert.equal(requestStatusGroupForAppeal("appealed"), "waiting");
  assert.equal(requestStatusGroupForAppeal("restored"), "approved");
  assert.equal(requestStatusGroupForAppeal("upheld"), "rejected");
});

test("transparencyWarningTitle includes score", () => {
  assert.match(transparencyWarningTitle("VI", 12), /12/);
});
