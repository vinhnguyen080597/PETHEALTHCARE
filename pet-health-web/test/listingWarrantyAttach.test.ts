import test from "node:test";
import assert from "node:assert/strict";
import {
  canSubmitAttachedWarrantyPolicy,
  isNoWarrantyPolicyId,
  mergeListingAfterWarrantyAttach,
  normalizeWarrantyPolicyOptions,
  warrantyPolicyIdForApi,
} from "../src/lib/listingWarrantyAttach";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("normalizeWarrantyPolicyOptions drops empty ids/titles", () => {
  assert.deepEqual(
    normalizeWarrantyPolicyOptions([
      { id: "p1", title: "A" },
      { id: "", title: "B" },
      { id: "p2", title: "  " },
      null,
      { id: " p3 ", title: " C " },
    ]),
    [
      { id: "p1", title: "A" },
      { id: "p3", title: "C" },
    ],
  );
});

test("Không bảo hành is a valid submit option", () => {
  assert.equal(canSubmitAttachedWarrantyPolicy(""), true);
  assert.equal(canSubmitAttachedWarrantyPolicy(null), true);
  assert.equal(canSubmitAttachedWarrantyPolicy("policy-1"), true);
  assert.equal(isNoWarrantyPolicyId(""), true);
  assert.equal(isNoWarrantyPolicyId("policy-1"), false);
  assert.equal(warrantyPolicyIdForApi(""), null);
  assert.equal(warrantyPolicyIdForApi("policy-1"), "policy-1");
});

test("mergeListingAfterWarrantyAttach keeps published when API demotes", () => {
  assert.deepEqual(
    mergeListingAfterWarrantyAttach(
      { status: "published", id: "1" },
      { status: "pending_review", id: "1" },
    ),
    { status: "published", id: "1" },
  );
  assert.deepEqual(
    mergeListingAfterWarrantyAttach(
      { status: "published" },
      { status: "published" },
    ),
    { status: "published" },
  );
});

test("attach warranty i18n keys exist in EN and VI", () => {
  const keys = [
    "warranty.attachForDeposit",
    "warranty.attachTitle",
    "warranty.attachSave",
    "warranty.attachRequired",
    "warranty.attachEmpty",
    "warranty.attachSuccess",
    "warranty.updateCta",
    "warranty.noneTitle",
    "warranty.noneHint",
    "listing.new.warrantyNone",
  ] as const;
  for (const key of keys) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.equal(vi["listing.new.warrantyNone"], "Không bảo hành");
  assert.equal(vi["warranty.noneTitle"], "Không bảo hành");
});
