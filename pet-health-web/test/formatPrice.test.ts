import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPriceVnd,
  isBlankDisplayValue,
  parsePriceVnd,
} from "../src/lib/formatPrice";

test("formatPriceVnd formats digits and blanks", () => {
  assert.equal(formatPriceVnd(null), "");
  assert.equal(formatPriceVnd("—"), "");
  assert.equal(formatPriceVnd("967346"), "967.346 VNĐ");
  assert.equal(formatPriceVnd("8.500.000 ₫"), "8.500.000 VNĐ");
  assert.match(formatPriceVnd("thương lượng VND"), /VNĐ/);
});

test("parsePriceVnd handles triệu shorthand and digits", () => {
  assert.equal(parsePriceVnd("8tr"), 8_000_000);
  assert.equal(parsePriceVnd("8.5 triệu"), 8_500_000);
  assert.equal(parsePriceVnd("8500000"), 8_500_000);
  assert.equal(parsePriceVnd(""), null);
  assert.equal(parsePriceVnd("free"), null);
});

test("isBlankDisplayValue", () => {
  assert.equal(isBlankDisplayValue(null), true);
  assert.equal(isBlankDisplayValue("  "), true);
  assert.equal(isBlankDisplayValue("N/A"), true);
  assert.equal(isBlankDisplayValue([]), true);
  assert.equal(isBlankDisplayValue("Hello"), false);
});
