import test from "node:test";
import assert from "node:assert/strict";
import {
  depositHoldSenLabel,
  filterSenUserOptions,
  formatSenOptionLabel,
  normalizeSenUserOptions,
} from "../src/lib/listingDepositSen";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("formatSenOptionLabel uses display name and email", () => {
  assert.equal(
    formatSenOptionLabel({ display_name: "Minh", email: "a@b.com" }),
    "Minh - a@b.com",
  );
  assert.equal(
    formatSenOptionLabel({ display_name: "", email: "" }),
    "Sen",
  );
});

test("filterSenUserOptions matches name or email", () => {
  const rows = normalizeSenUserOptions([
    { user_id: "1", display_name: "An", email: "an@mail.com" },
    { user_id: "2", display_name: "Binh", email: "binh@x.com" },
  ]);
  assert.equal(filterSenUserOptions(rows, "an@").length, 1);
  assert.equal(filterSenUserOptions(rows, "binh").length, 1);
  assert.equal(filterSenUserOptions(rows, "").length, 2);
});

test("depositHoldSenLabel prefers sen name", () => {
  assert.equal(
    depositHoldSenLabel("Minh Nghi", "fallback", "Sen {name} đã đặt cọc"),
    "Sen Minh Nghi đã đặt cọc",
  );
  assert.equal(
    depositHoldSenLabel("", "fallback", "Sen {name} đã đặt cọc"),
    "fallback",
  );
});

test("deposit sen i18n keys exist", () => {
  for (const key of [
    "deal.confirmFreeze",
    "deal.sendRequest",
    "deal.pendingBadge",
    "deal.breederConfirmDeposit",
    "deal.senUserId",
    "deal.senSearchPlaceholder",
    "deal.senRequired",
    "deal.holdBadgeWithSen",
  ] as const) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.equal(vi["deal.confirmFreeze"], "Xác nhận");
});
