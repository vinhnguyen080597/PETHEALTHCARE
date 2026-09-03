import test from "node:test";
import assert from "node:assert/strict";
import {
  computeEffectiveViolationPoints,
  computeTransparencyScore,
  getTransparencyTier,
  socialTransparencyPoints,
  TRANSPARENCY_POINTS,
  transparencyProfileCompletionPercent,
  transparencyTickColor,
  TRANSPARENCY_TICK_INACTIVE,
} from "../src/lib/breederTransparencyScore";

test("unverified breeder scores 0", () => {
  const result = computeTransparencyScore({ isVerified: false });
  assert.equal(result.score, 0);
  assert.equal(result.profilePoints, 0);
});

test("verified breeder starts at 30 base points", () => {
  const result = computeTransparencyScore({ isVerified: true });
  assert.equal(result.score, 30);
  assert.equal(getTransparencyTier(result.score).nameVI, "Trại mới");
});

test("approved social platforms award 5 points each", () => {
  assert.equal(
    socialTransparencyPoints({
      approvedFacebook: true,
      approvedZalo: true,
      approvedTiktok: true,
      approvedInstagram: true,
    }),
    20,
  );
  const result = computeTransparencyScore({
    isVerified: true,
    approvedFacebook: true,
    approvedZalo: true,
  });
  assert.equal(result.score, 40);
});

test("full profile checklist reaches 100 without activity bonuses", () => {
  const result = computeTransparencyScore({
    isVerified: true,
    approvedFacebook: true,
    approvedZalo: true,
    approvedTiktok: true,
    approvedInstagram: true,
    approvedFacilityVideo: true,
    approvedBusinessLicense: true,
    approvedFirstWarranty: true,
    senConfirmedCompletions: 20,
    fiveStarReviewCount: 10,
  });
  assert.equal(result.activityPoints, 0);
  assert.equal(result.score, 100);
  assert.equal(getTransparencyTier(result.score).nameVI, "Trại uy tín hàng đầu");
});

test("business license awards 30 points", () => {
  const result = computeTransparencyScore({
    isVerified: true,
    approvedBusinessLicense: true,
  });
  assert.equal(result.score, 60);
  assert.equal(
    result.lines.find((line) => line.key === "businessLicense")?.max,
    30,
  );
});

test("activity handoffs and five-star reviews no longer affect score", () => {
  const result = computeTransparencyScore({
    isVerified: true,
    senConfirmedCompletions: 20,
    fiveStarReviewCount: 10,
  });
  assert.equal(result.score, 30);
  assert.equal(result.activityPoints, 0);
  assert.equal(
    result.lines.some((line) => line.key === "completions" || line.key === "reviews"),
    false,
  );
});

test("legacy violations no longer subtract from transparency score", () => {
  const now = new Date("2026-08-08T00:00:00Z");
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 10);
  const penalized = computeTransparencyScore({
    isVerified: true,
    violations: [{ points: 15, date: recent.toISOString() }],
    now,
  });
  assert.equal(penalized.violationPoints, 0);
  assert.equal(penalized.score, 30);
  assert.equal(getTransparencyTier(penalized.score).level, "L2");
});

test("computeEffectiveViolationPoints always returns 0", () => {
  const now = new Date("2026-08-08T00:00:00Z");
  assert.equal(
    computeEffectiveViolationPoints({
      now,
      violations: [{ points: 10, date: now.toISOString() }],
      penaltyPoints: 40,
    }),
    0,
  );
});

test("transparency tiers match new title bands", () => {
  assert.equal(getTransparencyTier(0).nameVI, "Sắp bị khóa");
  assert.equal(getTransparencyTier(16).nameVI, "Trại bị cảnh báo");
  assert.equal(getTransparencyTier(30).nameVI, "Trại mới");
  assert.equal(getTransparencyTier(50).nameVI, "Trại tiềm năng");
  assert.equal(getTransparencyTier(80).nameVI, "Ngôi sao đang lên");
  assert.equal(getTransparencyTier(100).nameVI, "Trại uy tín hàng đầu");
});

test("tick colors follow new score bands", () => {
  assert.equal(transparencyTickColor(10, 75), "#DC2626");
  assert.equal(transparencyTickColor(25, 75), "#EF4444");
  assert.equal(transparencyTickColor(40, 75), "#F97316");
  assert.equal(transparencyTickColor(90, 75), TRANSPARENCY_TICK_INACTIVE);
  assert.equal(transparencyTickColor(100, 100), "#059669");
});

test("social constants match updated transparency formula", () => {
  assert.equal(TRANSPARENCY_POINTS.verifiedBase, 30);
  assert.equal(TRANSPARENCY_POINTS.socialPlatform, 5);
  assert.equal(TRANSPARENCY_POINTS.businessLicense, 30);
  assert.equal(TRANSPARENCY_POINTS.facilityVideo, 10);
  assert.equal(TRANSPARENCY_POINTS.firstWarranty, 10);
});

test("transparencyProfileCompletionPercent uses profile checklist not overall score", () => {
  assert.equal(
    transparencyProfileCompletionPercent(computeTransparencyScore({ isVerified: false })),
    0,
  );
  assert.equal(
    transparencyProfileCompletionPercent(computeTransparencyScore({ isVerified: true })),
    30,
  );
  const fullProfile = computeTransparencyScore({
    isVerified: true,
    approvedFacebook: true,
    approvedZalo: true,
    approvedTiktok: true,
    approvedInstagram: true,
    approvedFacilityVideo: true,
    approvedBusinessLicense: true,
    approvedFirstWarranty: true,
  });
  assert.equal(transparencyProfileCompletionPercent(fullProfile), 100);
  assert.equal(fullProfile.score, 100);
});
