import test from "node:test";
import assert from "node:assert/strict";
import {
  isSenAccountRole,
  shouldShowSenDepositedSection,
} from "../src/lib/senDepositedListings";

test("isSenAccountRole treats sen and unknown non-breeder as Sen", () => {
  assert.equal(isSenAccountRole("sen"), true);
  assert.equal(isSenAccountRole(""), true);
  assert.equal(isSenAccountRole("breeder"), false);
  assert.equal(isSenAccountRole("vet"), false);
  assert.equal(isSenAccountRole("sen", true), false);
  assert.equal(isSenAccountRole("admin", true), false);
});

test("shouldShowSenDepositedSection follows Sen account gate", () => {
  assert.equal(
    shouldShowSenDepositedSection({
      role: "sen",
      marketplaceEscrowEnabled: true,
    }),
    true,
  );
  assert.equal(
    shouldShowSenDepositedSection({
      role: "sen",
      marketplaceEscrowEnabled: false,
      depositedCount: 0,
    }),
    false,
  );
  assert.equal(
    shouldShowSenDepositedSection({
      role: "sen",
      marketplaceEscrowEnabled: false,
      depositedCount: 2,
    }),
    true,
  );
  assert.equal(shouldShowSenDepositedSection({ role: "breeder" }), false);
  assert.equal(
    shouldShowSenDepositedSection({ role: "sen", isAdmin: true }),
    false,
  );
});
