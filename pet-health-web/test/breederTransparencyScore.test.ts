import test from "node:test";
import assert from "node:assert/strict";
import {
  computeEffectiveViolationPoints,
  computeTransparencyScore,
  getTransparencyTier,
  LIGHT_VIOLATION_EXPIRY_DAYS,
  socialTransparencyPoints,
  TRANSPARENCY_POINTS,
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

test("profile bonuses and activity stack up to 100 cap", () => {
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
    fiveStarReviewCount: 0,
  });
  assert.equal(result.score, 100);
  assert.equal(getTransparencyTier(result.score).nameVI, "Trại uy tín hàng đầu");
});

test("five star reviews award 2 points each", () => {
  const result = computeTransparencyScore({
    isVerified: true,
    fiveStarReviewCount: 4,
  });
  assert.equal(result.activityPoints, 8);
  assert.equal(result.score, 38);
});

test("penalties subtract from transparency score", () => {
  const now = new Date("2026-08-08T00:00:00Z");
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 10);
  const penalized = computeTransparencyScore({
    isVerified: true,
    violations: [{ points: 15, date: recent.toISOString() }],
    now,
  });
  assert.equal(penalized.violationPoints, 15);
  assert.equal(penalized.score, 15);
  assert.equal(getTransparencyTier(penalized.score).level, "L0");
});

test("light violations expire after 90 days", () => {
  const now = new Date("2026-08-08T00:00:00Z");
  const old = new Date(now);
  old.setDate(old.getDate() - (LIGHT_VIOLATION_EXPIRY_DAYS + 1));
  assert.equal(
    computeEffectiveViolationPoints({
      now,
      violations: [{ points: 10, date: old.toISOString() }],
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

test("social constants match spec", () => {
  assert.equal(TRANSPARENCY_POINTS.verifiedBase, 30);
  assert.equal(TRANSPARENCY_POINTS.socialPlatform, 5);
  assert.equal(TRANSPARENCY_POINTS.fiveStarReview, 2);
  assert.equal(TRANSPARENCY_POINTS.senConfirmedCompletion, 3);
});
