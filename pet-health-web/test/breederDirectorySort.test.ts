import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  BREEDER_SPECIES_FILTERS,
  DEFAULT_BREEDER_SORT,
  DEFAULT_BREEDER_SPECIES,
  breederMatchesProvince,
  filterBreedersByProvince,
  filterBreedersBySpecies,
  parseBreederSort,
  parseBreederSpecies,
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

test("parseBreederSpecies defaults to all", () => {
  assert.equal(parseBreederSpecies(""), DEFAULT_BREEDER_SPECIES);
  assert.equal(parseBreederSpecies("nope"), "all");
  assert.equal(parseBreederSpecies("cat"), "cat");
  assert.equal(parseBreederSpecies("DOG"), "dog");
  assert.equal(DEFAULT_BREEDER_SPECIES, "all");
  assert.deepEqual([...BREEDER_SPECIES_FILTERS], [
    "all",
    "dog",
    "cat",
    "bird",
    "fish",
    "rabbit",
    "hamster",
    "reptile",
  ]);
});

test("filterBreedersBySpecies keeps matching primary species", () => {
  const rows = [
    breeder({ id: "dog-1", name: "A", primarySpecies: ["dog"] }),
    breeder({ id: "cat-1", name: "B", primarySpecies: ["cat"] }),
    breeder({ id: "dog-2", name: "C", primarySpecies: ["Dog"] }),
    breeder({ id: "none", name: "D", primarySpecies: [] }),
  ];
  assert.deepEqual(
    filterBreedersBySpecies(rows, "dog").map((b) => b.id),
    ["dog-1", "dog-2"],
  );
  assert.deepEqual(
    filterBreedersBySpecies(rows, "cat").map((b) => b.id),
    ["cat-1"],
  );
  assert.deepEqual(
    filterBreedersBySpecies(rows, "all").map((b) => b.id),
    ["dog-1", "cat-1", "dog-2", "none"],
  );
  assert.deepEqual(
    filterBreedersBySpecies(rows, "nope").map((b) => b.id),
    ["dog-1", "cat-1", "dog-2", "none"],
  );
});

test("filterBreedersByProvince matches location needles", () => {
  const rows = [
    breeder({ id: "hn", name: "A", location: "Hà Đông, Hà Nội" }),
    breeder({ id: "hcm", name: "B", location: "Q.9, TP. Hồ Chí Minh" }),
  ];
  assert.equal(breederMatchesProvince(rows[0]!, "TP. Hà Nội"), true);
  assert.deepEqual(
    filterBreedersByProvince(rows, "TP. Hồ Chí Minh").map((b) => b.id),
    ["hcm"],
  );
});

test("Top Breeders title and sort i18n exist in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(enDict["breeders.title"], "Top Breeders");
  assert.equal(viDict["breeders.title"], "Trại giống");
  for (const key of [
    "breeders.speciesLabel",
    "breeders.species.all",
    "breeders.provinceLabel",
    "breeders.emptySpecies",
    "breeders.sortLabel",
    "breeders.sort.trust",
    "breeders.sort.listings",
    "breeders.sort.sold",
    "breeders.sort.name",
    "breeders.hall.title",
    "breeders.card.message",
  ]) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
  assert.equal(viDict["breeders.speciesLabel"], "Loài:");
  assert.equal(viDict["listing.new.species.dog"], "Chó");
  assert.equal(viDict["listing.new.species.cat"], "Mèo");
});
