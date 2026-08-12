import test from "node:test";
import assert from "node:assert/strict";
import {
  computeBreederTrustScore,
  getBreederPublicTrustMetrics,
  getTrustTier,
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

test("mapApiBreeder verified-only scores 30 base transparency", () => {
  const profile: ApiBreederProfile = {
    id: "bp-1",
    user_id: "u-1",
    display_name: "New Farm",
    location: "HCM",
    verification_status: "verified",
    primary_species: ["dog"],
    main_breeds: ["Poodle"],
    bio: "",
    contact: {},
    metadata: {},
  };
  const mapped = mapApiBreeder(profile, { activeListings: 0 });
  assert.equal(mapped.trustScore, 30);
});

test("mapApiBreeder pending profile scores 0", () => {
  const profile: ApiBreederProfile = {
    id: "bp-pending",
    display_name: "Pending Farm",
    verification_status: "pending_review",
    contact: {},
    metadata: {},
  };
  const mapped = mapApiBreeder(profile);
  assert.equal(mapped.trustScore, 0);
});

test("mapApiBreeder counts approved metadata bonuses only", () => {
  const profile: ApiBreederProfile = {
    id: "bp-2",
    display_name: "Strong Farm",
    verification_status: "verified",
    contact: { facebook: "fb.com/x", zalo: "09" },
    metadata: {
      social_facebook_approved: true,
      facility_verified: true,
      sen_confirmed_completions: 2,
      five_star_review_count: 1,
    },
  };
  const mapped = mapApiBreeder(profile);
  assert.equal(mapped.trustScore, 30 + 5 + 10 + 2 + 2);
});

test("public trust metrics use stored trust score without double penalty", () => {
  const metrics = getBreederPublicTrustMetrics(
    baseBreeder({ trustScore: 70, penaltyPoints: 10 }),
  );
  assert.equal(metrics.qualityIndex, 70);
});

test("farm transparency i18n uses minh bach wording in VI", () => {
  const viDict = vi as Record<string, string>;
  const enDict = en as Record<string, string>;
  assert.equal(viDict["farm.trust.scoreTitle"], "Điểm minh bạch trại giống");
  assert.equal(viDict["farm.trust.gaugeCaption"], "Điểm minh bạch");
  assert.equal(enDict["farm.trust.gaugeCaption"], "Transparency score");
});

test("computeBreederTrustScore exposes legacy mission/transaction aliases", () => {
  const result = computeBreederTrustScore({ isVerified: true });
  assert.equal(result.score, 30);
  assert.equal(result.missionPoints, result.profilePoints);
  assert.equal(result.transactionPoints, result.activityPoints);
});

test("getTrustTier maps 80 to rising star", () => {
  assert.equal(getTrustTier(80).nameVI, "Ngôi sao đang lên");
});
