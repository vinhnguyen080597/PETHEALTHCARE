import test from "node:test";
import assert from "node:assert/strict";
import { buildListingPreview } from "../src/lib/listingPreview";
import type { BreederProfile } from "../src/lib/types";

const breeder = {
  id: "b1",
  name: "Farm A",
  displayNameVI: "Farm A",
  location: "Hà Nội",
  verified: true,
  verificationStatus: "verified",
  breederType: "home_breeder",
  primarySpecies: ["cat"],
  mainBreeds: [],
  avatar: "https://example.com/a.jpg",
  bio: "",
  bioVI: "",
  trustScore: 72,
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
} as BreederProfile;

test("buildListingPreview matches New Pets ListingCard fields", () => {
  const listing = buildListingPreview({
    title: "  British Shorthair  ",
    untitledFallback: "Untitled",
    species: "cat",
    breed: "British Shorthair",
    gender: "female",
    ageMonths: 2,
    location: "TP. Hồ Chí Minh",
    priceNote: "3.500.000",
    description: "Friendly",
    personality: ["Playful"],
    vaccineStatus: "First dose completed",
    dewormingStatus: "Recently dewormed",
    mediaUrl: "blob:preview",
    breeder,
  });
  assert.equal(listing.id, "preview");
  assert.equal(listing.title, "British Shorthair");
  assert.equal(listing.titleVI, "British Shorthair");
  assert.equal(listing.species, "cat");
  assert.equal(listing.gender, "female");
  assert.equal(listing.ageMonths, 2);
  assert.equal(listing.mediaUrl, "blob:preview");
  assert.equal(listing.status, "pending_review");
  assert.equal(listing.breeder.name, "Farm A");
  assert.equal(listing.saved, false);
});

test("buildListingPreview falls back to untitled title", () => {
  const listing = buildListingPreview({
    title: "   ",
    untitledFallback: "Untitled listing",
    species: "dog",
    breed: "",
    gender: "male",
    ageMonths: 0,
    location: "",
    priceNote: "",
    description: "",
    personality: [],
    vaccineStatus: "",
    dewormingStatus: "",
    mediaUrl: "",
    breeder,
  });
  assert.equal(listing.title, "Untitled listing");
});
