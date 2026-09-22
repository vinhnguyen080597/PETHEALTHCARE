import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTaxIdDigits,
  vietnamBusinessLookupLinks,
  vietnamMasothueLookupHref,
  vietnamTaxPortalLookupHref,
  vietnamBusinessRegistryLookupHref,
} from "../src/lib/legalEntityTag";

test("normalizeTaxIdDigits strips non-digits", () => {
  assert.equal(normalizeTaxIdDigits("0312-345-678"), "0312345678");
  assert.equal(normalizeTaxIdDigits(""), "");
});

test("vietnamMasothueLookupHref deep-links by MST", () => {
  assert.equal(
    vietnamMasothueLookupHref("0312345678"),
    "https://masothue.com/0312345678",
  );
  assert.equal(vietnamMasothueLookupHref("123"), null);
});

test("vietnamBusinessLookupLinks includes official portals", () => {
  const withTax = vietnamBusinessLookupLinks("0312345678");
  assert.deepEqual(
    withTax.map((link) => link.id),
    ["masothue", "gdt", "dkkd"],
  );
  assert.equal(withTax[0]?.href, "https://masothue.com/0312345678");
  assert.equal(withTax[1]?.href, vietnamTaxPortalLookupHref());
  assert.equal(withTax[2]?.href, vietnamBusinessRegistryLookupHref());

  const withoutTax = vietnamBusinessLookupLinks("");
  assert.deepEqual(
    withoutTax.map((link) => link.id),
    ["gdt", "dkkd"],
  );
});
