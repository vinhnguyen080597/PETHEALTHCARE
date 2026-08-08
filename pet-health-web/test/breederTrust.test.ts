import test from "node:test";
import assert from "node:assert/strict";
import {
  computeBreederQualityIndex,
  computeBreederTrustScore,
  computeEffectiveViolationPoints,
  getBreederPublicTrustMetrics,
  getTrustTier,
  LIGHT_VIOLATION_EXPIRY_DAYS,
  parseStoredTrustScore,
  qualitySignalsFromBreeder,
  trustTickColor,
  TRUST_MISSION_POINTS,
  TRUST_TICK_INACTIVE,
  TRUST_UI_CAPS,
} from "../src/lib/breederTrust";
import { mapApiBreeder } from "../src/lib/mappers";
import type { ApiBreederProfile, BreederProfile } from "../src/lib/types";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

function baseBreeder(overrides: Partial<BreederProfile> = {}): BreederProfile {
  return {
    id: "bp-new",
    name: "Minh Nghi",
    displayNameVI: "Minh Nghi",
    location: "Ho Chi Minh",
    verified: true,
    verificationStatus: "verified",
    breederType: "home_breeder",
    primarySpecies: ["dog"],
    mainBreeds: ["Poodle"],
    avatar: "",
    bio: "",
    bioVI: "",
    trustScore: 0,
    penaltyPoints: 0,
    violations: [],
    activeListings: 0,
    template: "T1",
    contact: {},
    scale: "",
    careEnvironment: "",
    commitments: [],
    checklist: [],
    verificationTier: 1,
    ...overrides,
  };
}

test("Part A mission line items sum to 45 (design table; max headroom 50)", () => {
  const sum = Object.values(TRUST_MISSION_POINTS).reduce((a, b) => a + b, 0);
  assert.equal(sum, 45);
  assert.equal(TRUST_UI_CAPS.ekycLicense, 20);
  assert.equal(TRUST_UI_CAPS.social, 10);
});

test("new verified farm scores eKYC-only (+10), not fake 70", () => {
  const score = computeBreederQualityIndex({
    hasEkyc: true,
  });
  assert.equal(score, 10);
  assert.equal(getTrustTier(score).level, "L0");
});

test("social channels award FB+4 Zalo+3 TikTok+3", () => {
  const score = computeBreederQualityIndex({
    hasEkyc: true,
    hasFacebook: true,
    hasZalo: true,
    hasTiktok: true,
  });
  assert.equal(score, 10 + 4 + 3 + 3);
});

test("full Part A stack awards 45 mission points", () => {
  const result = computeBreederTrustScore({
    hasEkyc: true,
    hasFacebook: true,
    hasZalo: true,
    hasTiktok: true,
    hasFarmFacility: true,
    hasBusinessLicense: true,
    hasHealthDocs: true,
  });
  assert.equal(result.missionPoints, 45);
  assert.equal(result.transactionPoints, 0);
  assert.equal(result.score, 45);
  assert.equal(getTrustTier(result.score).level, "L2");
});

test("reviews and response add transaction points; Escrow not scored", () => {
  const empty = computeBreederTrustScore({ hasEkyc: true });
  assert.equal(empty.transactionPoints, 0);
  assert.ok(!empty.lines.some((l) => l.key === "escrow"));

  const withActivity = computeBreederTrustScore({
    hasEkyc: true,
    fiveStarReviewCount: 8,
    fastResponseMonth: true,
  });
  assert.equal(withActivity.transactionPoints, 8 + 5);
  assert.equal(withActivity.score, 10 + 13);
});

test("violations subtract; light hits expire after 90 days", () => {
  const now = new Date("2026-08-08T00:00:00Z");
  const old = new Date(now);
  old.setDate(old.getDate() - (LIGHT_VIOLATION_EXPIRY_DAYS + 1));
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 10);

  assert.equal(
    computeEffectiveViolationPoints({
      now,
      violations: [{ points: 10, date: old.toISOString() }],
    }),
    0,
  );
  assert.equal(
    computeEffectiveViolationPoints({
      now,
      violations: [{ points: 10, date: recent.toISOString() }],
    }),
    10,
  );
  assert.equal(
    computeEffectiveViolationPoints({
      now,
      violations: [{ points: 40, date: old.toISOString() }],
    }),
    40,
  );

  const penalized = computeBreederTrustScore({
    hasEkyc: true,
    violations: [{ points: 15, date: recent.toISOString() }],
  });
  assert.equal(penalized.violationPoints, 15);
  assert.equal(penalized.score, 0); // 10 - 15 → clamped to 0
});

test("trust tick colors follow bands; inactive past score", () => {
  assert.equal(trustTickColor(10, 75), "#EF4444");
  assert.equal(trustTickColor(30, 75), "#F97316");
  assert.equal(trustTickColor(50, 75), "#F59E0B");
  assert.equal(trustTickColor(70, 75), "#10B981");
  assert.equal(trustTickColor(90, 75), TRUST_TICK_INACTIVE);
  assert.equal(trustTickColor(90, 90), "#059669");
});

test("tiers L0–L4 match score bands", () => {
  assert.equal(getTrustTier(0).level, "L0");
  assert.equal(getTrustTier(21).level, "L1");
  assert.equal(getTrustTier(41).level, "L2");
  assert.equal(getTrustTier(61).level, "L3");
  assert.equal(getTrustTier(81).level, "L4");
});

test("public trust metrics never invent reviews rating sold or response", () => {
  const metrics = getBreederPublicTrustMetrics(
    baseBreeder({ trustScore: 70, activeListings: 0 }),
  );
  assert.equal(metrics.reviewCount, 0);
  assert.equal(metrics.rating, null);
  assert.equal(metrics.petsRehomed, 0);
  assert.equal(metrics.responseMinutes, null);
  assert.equal(metrics.qualityIndex, 70);
});

test("mapApiBreeder verified-only scores eKYC 10, not 70", () => {
  const profile: ApiBreederProfile = {
    id: "bp-1",
    user_id: "u-1",
    display_name: "New Farm",
    location: "HCM",
    verification_status: "verified",
    primary_species: ["dog"],
    main_breeds: ["Poodle", "Corgi"],
    bio: "",
    care_environment: "",
    contact: {},
    metadata: {},
  };
  const mapped = mapApiBreeder(profile, { activeListings: 0 });
  assert.equal(mapped.trustScore, 10);
  assert.notEqual(mapped.trustScore, 70);
});

test("mapApiBreeder still honors explicit metadata trust_score", () => {
  const profile: ApiBreederProfile = {
    id: "bp-2",
    display_name: "Elite Farm",
    verification_status: "verified",
    metadata: { trust_score: 95, elite: true },
  };
  const mapped = mapApiBreeder(profile, { activeListings: 3 });
  assert.equal(mapped.trustScore, 95);
});

test("parseStoredTrustScore returns null when missing", () => {
  assert.equal(parseStoredTrustScore({}), null);
  assert.equal(parseStoredTrustScore({ trust_score: 88 }), 88);
});

test("qualitySignalsFromBreeder maps contact channels and facility proxy", () => {
  const signals = qualitySignalsFromBreeder(
    baseBreeder({
      checklist: [
        { label: "a", done: true },
        { label: "b", done: false },
      ],
      contact: { phone: "090", facebook: "fb.com/x", zalo: "09" },
      careEnvironment: "Home raised",
      verificationTier: 1,
      activeListings: 0,
    }),
    4,
  );
  assert.equal(signals.hasEkyc, true);
  assert.equal(signals.hasFacebook, true);
  assert.equal(signals.hasZalo, true);
  assert.equal(signals.hasTiktok, false);
  assert.equal(signals.hasFarmFacility, true);
  assert.equal(signals.hasHealthDocs, true);
  assert.equal(signals.hasBusinessLicense, false);
  // 10 + 4 + 3 + 10 farm + 5 health = 32
  assert.equal(computeBreederQualityIndex(signals), 32);
});

test("farm trust score UI i18n keys exist in EN and VI", () => {
  const keys = [
    "farm.trust.scoreTitle",
    "farm.trust.scoreSubtitle",
    "farm.trust.gaugeCaption",
    "farm.trust.breakdownTitle",
  ] as const;
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of keys) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["farm.trust.scoreTitle"], "Chỉ số tín nhiệm trại giống");
  assert.ok(!viDict["farm.trust.scoreSubtitle"].toLowerCase().includes("escrow"));
  assert.ok(!enDict["farm.trust.scoreSubtitle"].toLowerCase().includes("escrow"));
});
