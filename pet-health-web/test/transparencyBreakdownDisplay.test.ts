import test from "node:test";
import assert from "node:assert/strict";
import { computeTransparencyScore } from "../src/lib/breederTransparencyScore";
import {
  formatTransparencyBreakdownPoints,
  transparencyBreakdownLabel,
  visibleTransparencyBreakdownLines,
} from "../src/lib/transparencyBreakdownDisplay";

test("transparency breakdown labels cover profile checklist only", () => {
  assert.equal(
    transparencyBreakdownLabel("VI", "businessLicense"),
    "Giấy phép kinh doanh",
  );
  assert.equal(
    transparencyBreakdownLabel("EN", "facilityVideo"),
    "Facility video",
  );
  assert.equal(transparencyBreakdownLabel("VI", "completions"), "completions");
  assert.equal(transparencyBreakdownLabel("VI", "reviews"), "reviews");
});

test("profile breakdown lines show fixed point ranges", () => {
  const { lines } = computeTransparencyScore({
    isVerified: true,
    approvedBusinessLicense: true,
  });
  const license = lines.find((line) => line.key === "businessLicense");
  assert.ok(license);
  assert.equal(formatTransparencyBreakdownPoints(license!, "VI"), "+30 / 30đ");
  assert.equal(
    lines.some((line) => line.key === "completions" || line.key === "reviews"),
    false,
  );
});

test("transparency breakdown never reports penalties (compliance owns them)", () => {
  const { lines } = computeTransparencyScore({
    isVerified: true,
    penaltyPoints: 5,
  });
  assert.equal(lines.some((line) => line.key === "penalty"), false);
  const visible = visibleTransparencyBreakdownLines(lines);
  assert.equal(visible.length, lines.length);
});

test("legacy penalty rows are still filtered out of the breakdown list", () => {
  const visible = visibleTransparencyBreakdownLines([
    { key: "verifiedBase", group: "profile", val: 30, max: 30, done: true },
    { key: "penalty", group: "penalty", val: -5, max: 0, done: false },
  ]);
  assert.deepEqual(
    visible.map((line) => line.key),
    ["verifiedBase"],
  );
});
