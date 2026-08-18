import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  breederCardShowsDepositBadge,
  breederCardShowsSoldCount,
  breederCardSpecialtyLabel,
  getBreederCardMetrics,
} from "../src/lib/breederCardMetrics";
import type { BreederProfile } from "../src/lib/types";

function baseBreeder(overrides: Partial<BreederProfile> = {}): BreederProfile {
  return {
    id: "bp-1",
    name: "Minh Nghi",
    displayNameVI: "Minh Nghi",
    location: "Hồ Chí Minh",
    verified: true,
    verificationStatus: "verified",
    breederType: "home_breeder",
    primarySpecies: ["dog"],
    mainBreeds: ["Poodle", "Corgi"],
    avatar: "",
    bio: "",
    bioVI: "",
    trustScore: 20,
    penaltyPoints: 0,
    violations: [],
    activeListings: 2,
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

test("specialty prefers breeds then species", () => {
  assert.match(
    breederCardSpecialtyLabel(baseBreeder(), "VI"),
    /Chuyên: Poodle • Corgi/,
  );
  assert.match(
    breederCardSpecialtyLabel(
      baseBreeder({ mainBreeds: [], primarySpecies: ["cat"] }),
      "VI",
    ),
    /Chuyên: Mèo/,
  );
});

test("deposit badge never invents escrow acceptance from verified", () => {
  assert.equal(breederCardShowsDepositBadge(baseBreeder({ verified: true })), false);
  assert.equal(
    breederCardShowsDepositBadge(
      baseBreeder({ verified: true, verificationTier: 3 }),
    ),
    false,
  );
});

test("sold count only shows when > 0", () => {
  assert.equal(breederCardShowsSoldCount(0), false);
  assert.equal(breederCardShowsSoldCount(3), true);
});

test("getBreederCardMetrics uses trust score and listings honestly", () => {
  const card = getBreederCardMetrics(baseBreeder({ trustScore: 20, activeListings: 3 }));
  assert.equal(card.trustScore, 20);
  assert.equal(card.activeListings, 3);
  assert.equal(card.showSold, false);
  assert.equal(card.showDepositBadge, false);
  assert.equal(card.reviewCount, 0);
  assert.equal(card.rating, null);
});

test("breeder card trust index i18n aligned", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(viDict["breeders.card.trustIndex"], "Điểm minh bạch");
  assert.ok(enDict["breeders.card.trustIndex"]);
  assert.equal(viDict["breeders.card.cta"], "Ghé Trại Giống");
  assert.doesNotMatch(viDict["breeders.card.cta"], /đang đăng/i);
  assert.equal(enDict["breeders.card.cta"], "Visit kennel");
  assert.equal(viDict["breeders.card.ctaListings"], undefined);
  assert.ok(enDict["breeders.card.fastResponse"]);
  assert.ok(viDict["breeders.card.fastResponse"]);
  assert.equal(viDict["breeders.card.activeKennel"], "Trực tuyến");
  assert.equal(viDict["breeders.card.message"], "Nhắn tin");
  assert.equal(viDict["breeders.card.petsPreviewEmpty"], "Chưa có bé đang mở bán");
  assert.ok(enDict["breeders.hall.title"]);
  assert.ok(viDict["breeders.hall.title"]);
  assert.ok(enDict["breeders.section.featured.title"]);
  assert.ok(viDict["breeders.section.featured.title"]);
});
