import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  DEFAULT_BREEDER_SORT,
  parseBreederSort,
  sortBreeders,
} from "../src/lib/breederDirectorySort";
import type { BreederProfile } from "../src/lib/types";

function breeder(
  overrides: Partial<BreederProfile> & Pick<BreederProfile, "id" | "name">,
): BreederProfile {
  return {
    displayNameVI: overrides.name,
    location: "",
    verified: true,
    verificationStatus: "verified",
    breederType: "home_breeder",
    primarySpecies: ["dog"],
    mainBreeds: [],
    avatar: "",
    bio: "",
    bioVI: "",
    trustScore: 10,
    penaltyPoints: 0,
    violations: [],
    activeListings: 0,
    petsRehomed: 0,
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

test("parseBreederSort defaults to trust", () => {
  assert.equal(parseBreederSort(""), DEFAULT_BREEDER_SORT);
  assert.equal(parseBreederSort("nope"), "trust");
  assert.equal(parseBreederSort("listings"), "listings");
  assert.equal(parseBreederSort("sold"), "sold");
  assert.equal(parseBreederSort("name"), "name");
});

test("sortBreeders by trust then listings", () => {
  const sorted = sortBreeders(
    [
      breeder({ id: "a", name: "A", trustScore: 10, activeListings: 5 }),
      breeder({ id: "b", name: "B", trustScore: 27, activeListings: 0 }),
      breeder({ id: "c", name: "C", trustScore: 27, activeListings: 3 }),
    ],
    "trust",
  );
  assert.deepEqual(
    sorted.map((b) => b.id),
    ["c", "b", "a"],
  );
});

test("sortBreeders by listings and sold", () => {
  const byListings = sortBreeders(
    [
      breeder({ id: "a", name: "A", activeListings: 1 }),
      breeder({ id: "b", name: "B", activeListings: 3 }),
    ],
    "listings",
  );
  assert.deepEqual(
    byListings.map((b) => b.id),
    ["b", "a"],
  );

  const bySold = sortBreeders(
    [
      breeder({ id: "a", name: "A", petsRehomed: 2, trustScore: 10 }),
      breeder({ id: "b", name: "B", petsRehomed: 5, trustScore: 10 }),
    ],
    "sold",
  );
  assert.deepEqual(
    bySold.map((b) => b.id),
    ["b", "a"],
  );
});

test("sortBreeders by name A–Z", () => {
  const sorted = sortBreeders(
    [
      breeder({ id: "2", name: "Mina" }),
      breeder({ id: "1", name: "Lucastalina" }),
      breeder({ id: "3", name: "Minh Nghi" }),
    ],
    "name",
  );
  assert.deepEqual(
    sorted.map((b) => b.name),
    ["Lucastalina", "Mina", "Minh Nghi"],
  );
});

test("Top Breeders title and sort i18n exist in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(enDict["breeders.title"], "Top Breeders");
  assert.equal(viDict["breeders.title"], "Top Breeders");
  for (const key of [
    "breeders.sortLabel",
    "breeders.sort.trust",
    "breeders.sort.listings",
    "breeders.sort.sold",
    "breeders.sort.name",
  ]) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
});
