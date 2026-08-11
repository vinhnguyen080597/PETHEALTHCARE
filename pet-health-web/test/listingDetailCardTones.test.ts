import test from "node:test";
import assert from "node:assert/strict";
import {
  listingDealStatusTone,
  listingPersonalityTagClass,
  listingWarrantyCardTone,
} from "../src/lib/listingDetailCardTones";

test("personality tags use slate gray, not amber/blue brand chips", () => {
  const cls = listingPersonalityTagClass();
  assert.match(cls, /bg-slate-100/);
  assert.match(cls, /text-slate-600/);
  assert.doesNotMatch(cls, /amber|blue|#D97706|#1E6FE8/);
});

test("warranty has-policy uses sky; none uses slate", () => {
  const has = listingWarrantyCardTone(true);
  const none = listingWarrantyCardTone(false);
  assert.match(has.shell, /sky/);
  assert.doesNotMatch(has.shell, /amber/);
  assert.match(none.shell, /slate/);
  assert.doesNotMatch(none.shell, /sky|amber/);
});

test("deposit hold stays amber; sold stays emerald; cancelled stays rose", () => {
  const hold = listingDealStatusTone("deposit_hold");
  const sold = listingDealStatusTone("sold");
  const cancelled = listingDealStatusTone("cancelled");
  assert.match(hold.shell, /amber/);
  assert.doesNotMatch(hold.shell, /sky|emerald/);
  assert.match(sold.shell, /emerald/);
  assert.match(cancelled.shell, /rose/);
});

test("warranty sky and deposit amber do not share the same palette token", () => {
  const warranty = listingWarrantyCardTone(true).shell;
  const deposit = listingDealStatusTone("deposit_hold").shell;
  assert.match(warranty, /sky/);
  assert.match(deposit, /amber/);
  assert.notEqual(warranty, deposit);
});
