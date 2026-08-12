import test from "node:test";
import assert from "node:assert/strict";
import { VIETNAM_PROVINCES } from "../src/constants/vietnamProvinces";
import {
  listingMatchesProvince,
  provinceMatchNeedles,
  resolveProvinceSelection,
} from "../src/lib/vietnamProvinceSelection";

test("VIETNAM_PROVINCES has 34 post-merger provinces and cities", () => {
  assert.equal(VIETNAM_PROVINCES.length, 34);
  assert.equal(VIETNAM_PROVINCES.includes("TP. Hồ Chí Minh"), true);
  assert.equal(VIETNAM_PROVINCES.includes("TP. Huế"), true);
});

test("resolveProvinceSelection maps legacy province names to the new catalog", () => {
  assert.equal(resolveProvinceSelection("Thừa Thiên Huế"), "TP. Huế");
  assert.equal(resolveProvinceSelection("Bình Dương"), "TP. Hồ Chí Minh");
  assert.equal(resolveProvinceSelection("Hà Nội"), "TP. Hà Nội");
  assert.equal(resolveProvinceSelection("TP. Hà Nội"), "TP. Hà Nội");
  assert.equal(resolveProvinceSelection("unknown place"), "");
});

test("listingMatchesProvince matches new province labels against legacy listing locations", () => {
  assert.equal(
    listingMatchesProvince({ location: "Bình Dương" }, "TP. Hồ Chí Minh"),
    true,
  );
  const needles = provinceMatchNeedles("TP. Hồ Chí Minh");
  assert.equal(needles.some((needle) => needle.includes("ho chi minh")), true);
});
