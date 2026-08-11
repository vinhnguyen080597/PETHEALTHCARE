import test from "node:test";
import assert from "node:assert/strict";
import {
  buildListingEditPayload,
  canAccessListingEditPage,
  listingEditFormDefaults,
} from "../src/lib/listingEdit";
import type { Listing } from "../src/lib/types";

function sampleListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "p1",
    title: "Hello",
    titleVI: "Xin chào",
    species: "cat",
    breed: "Ba Tư",
    gender: "Đực",
    ageMonths: 2,
    location: "TP. Hồ Chí Minh",
    price: "4.444.444 VNĐ",
    description: "Desc EN",
    descriptionVI: "Desc VI",
    personality: ["friendly"],
    personalityVI: ["thân thiện"],
    vaccineStatus: "Đủ mũi",
    dewormingStatus: "Đã tẩy",
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
    gender: "Đực",
    ageMonths: 2,
    location: "HN",
    priceNote: "1000000",
    description: "  nice  ",
    vaccineStatus: "Đủ",
    dewormingStatus: "Có",
    personality: ["calm"],
  });
  assert.equal(payload.title, "Tess");
  assert.equal(payload.description, "nice");
  assert.equal(payload.status, "pending_review");
  assert.equal(payload.mediaUrls, undefined);
  assert.equal(payload.metadata, undefined);
});

test("listingEditFormDefaults prefer locale and strip price formatting", () => {
  const listing = sampleListing();
  const vi = listingEditFormDefaults(listing, "VI");
  assert.equal(vi.title, "Xin chào");
  assert.equal(vi.description, "Desc VI");
  assert.equal(vi.priceNote, "4444444");
  assert.deepEqual(vi.personality, ["thân thiện"]);
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
