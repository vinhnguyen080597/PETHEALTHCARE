import test from "node:test";
import assert from "node:assert/strict";
import {
  buildListingEditPayload,
  canAccessListingEditPage,
  listingEditFormDefaults,
  matchListingStoredOption,
  resolveListingEditBreed,
} from "../src/lib/listingEdit";
import type { Listing } from "../src/lib/types";

function t(_lang: "EN" | "VI", key: string): string {
  const map: Record<string, string> = {
    "listing.new.gender.male": "Male",
    "listing.new.gender.female": "Female",
    "listing.new.vaccineShort.unknown": "Unknown",
    "listing.new.vaccineShort.basic_done": "Basic done",
    "listing.new.dewormingShort.unknown": "Unknown",
    "listing.new.dewormingShort.recent": "Done",
    "listing.new.breed.british_longhair": "British Longhair",
    "listing.new.breed.other": "Other",
    "listing.new.personality.friendly": "Friendly",
    "listing.new.paperwork.vaccineBook": "Vaccine book",
  };
  return map[key] ?? key;
}

function sampleListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "p1",
    title: "Hello",
    titleVI: "Xin chào",
    species: "cat",
    breed: "British Longhair",
    gender: "Male",
    ageMonths: 2,
    location: "TP. Hồ Chí Minh",
    price: "4.444.444 VNĐ",
    description: "Desc EN",
    descriptionVI: "Desc VI",
    personality: ["Friendly"],
    personalityVI: ["thân thiện"],
    vaccineStatus: "Basic done",
    dewormingStatus: "Done",
    mediaUrl: "https://example.com/a.jpg",
    mediaUrls: ["https://example.com/a.jpg"],
    videoUrl: "https://example.com/a.mp4",
    status: "published",
    breeder: {
      id: "b1",
      userId: "u1",
      name: "Breeder",
      displayNameVI: "Breeder",
      location: "",
      verified: true,
      verificationStatus: "verified",
      breederType: "home_breeder",
      primarySpecies: ["cat"],
      mainBreeds: [],
      avatar: "",
      bio: "",
      bioVI: "",
      trustScore: 0,
      penaltyPoints: 0,
      violations: [],
      activeListings: 1,
      template: "T1",
      contact: {},
      scale: "",
      careEnvironment: "",
      commitments: [],
      checklist: [],
      verificationTier: 1,
    },
    ownerUserId: "u1",
    saved: false,
    escrowEnabled: false,
    ...overrides,
  };
}

test("buildListingEditPayload trims fields and resubmits for review", () => {
  const payload = buildListingEditPayload({
    title: "  Tess  ",
    species: "cat",
    breed: "Ba Tư",
    gender: "Male",
    ageMonths: 2,
    location: "HN",
    priceNote: "1000000",
    description: "  nice  ",
    vaccineStatus: "Basic done",
    dewormingStatus: "Done",
    personality: ["Friendly"],
    paperwork: ["Vaccine book"],
  });
  assert.equal(payload.title, "Tess");
  assert.equal(payload.description, "nice");
  assert.equal(payload.status, "pending_review");
  assert.deepEqual(payload.paperwork, ["Vaccine book"]);
  assert.equal(payload.mediaUrls, undefined);
  assert.equal(payload.metadata, undefined);
});

test("listingEditFormDefaults prefer locale and strip price formatting", () => {
  const listing = sampleListing();
  const vi = listingEditFormDefaults(listing, "VI", t);
  assert.equal(vi.title, "Xin chào");
  assert.equal(vi.description, "Desc VI");
  assert.equal(vi.priceNote, "4444444");
  assert.equal(vi.breedKey, "british_longhair");
  assert.equal(vi.gender, "male");
});

test("resolveListingEditBreed maps custom breed labels", () => {
  const resolved = resolveListingEditBreed(
    "cat",
    "Custom breed",
    (key) => (key === "other" ? "Other" : "British Longhair"),
  );
  assert.equal(resolved.breedKey, "other");
  assert.equal(resolved.customBreed, "Custom breed");
});

test("matchListingStoredOption matches label or key", () => {
  assert.equal(
    matchListingStoredOption(
      ["male", "female"],
      "Male",
      "male",
      (key) => (key === "male" ? "Male" : "Female"),
    ),
    "male",
  );
});

test("canAccessListingEditPage only for owner on published", () => {
  assert.equal(
    canAccessListingEditPage({
      currentUserId: "u1",
      listing: sampleListing(),
    }),
    true,
  );
  assert.equal(
    canAccessListingEditPage({
      currentUserId: "u1",
      listing: sampleListing({ status: "deposit_hold" }),
    }),
    false,
  );
  assert.equal(
    canAccessListingEditPage({
      currentUserId: "u2",
      listing: sampleListing(),
    }),
    false,
  );
  assert.equal(
    canAccessListingEditPage({ currentUserId: "u1", listing: null }),
    false,
  );
});
