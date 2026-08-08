import test from "node:test";
import assert from "node:assert/strict";
import {
  computeBreederQualityIndex,
  getBreederPublicTrustMetrics,
  parseStoredTrustScore,
  qualitySignalsFromBreeder,
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

test("new verified farm with no extras scores verification-only (~30), not fake 70", () => {
  const score = computeBreederQualityIndex({
    verified: true,
    checklistDoneCount: 0,
    commitmentsCount: 0,
    contactCount: 0,
    hasCareEnvironment: false,
    activeListings: 0,
  });
  assert.equal(score, 30);
});

test("verified + phone contact adds partial contact points", () => {
  const score = computeBreederQualityIndex({
    verified: true,
    checklistDoneCount: 0,
    commitmentsCount: 0,
    contactCount: 1,
    hasCareEnvironment: false,
    activeListings: 0,
  });
  assert.equal(score, 37);
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

test("mapApiBreeder does not default verified farms to 70 without metadata", () => {
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
  assert.equal(mapped.trustScore, 30);
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

test("qualitySignalsFromBreeder counts done checklist and listings override", () => {
  const signals = qualitySignalsFromBreeder(
    baseBreeder({
      checklist: [
        { label: "a", done: true },
        { label: "b", done: false },
        { label: "c", done: true },
      ],
      commitments: ["c1", "c2"],
      contact: { phone: "090" },
      careEnvironment: "Home raised",
      activeListings: 0,
    }),
    4,
  );
  assert.equal(signals.checklistDoneCount, 2);
  assert.equal(signals.commitmentsCount, 2);
  assert.equal(signals.contactCount, 1);
  assert.equal(signals.hasCareEnvironment, true);
  assert.equal(signals.activeListings, 4);
  assert.equal(computeBreederQualityIndex(signals), 30 + 6 + 15 + 7 + 15 + 8);
});

test("farm trust empty-state i18n keys exist in EN and VI", () => {
  const keys = [
    "farm.reviews.empty",
    "farm.trust.ratingEmpty",
    "farm.trust.responseEmpty",
  ] as const;
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of keys) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
    assert.notEqual(enDict[key], key);
    assert.notEqual(viDict[key], key);
  }
});
