import test from "node:test";
import assert from "node:assert/strict";
import { absoluteMediaUrl, listingShareUrl } from "../src/lib/config";
import { buildListingOgCopy, listingOgPhotoUrl } from "../src/lib/listingOg";
import type { Listing } from "../src/lib/types";

function sampleListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "post-1",
    title: "Persian kitten",
    titleVI: "Persian kitten",
    species: "cat",
    breed: "Persian",
    gender: "female",
    ageMonths: 3,
    location: "HCMC",
    price: "8500000",
    description: "Healthy",
    descriptionVI: "Healthy",
    personality: [],
    personalityVI: [],
    vaccineStatus: "",
    dewormingStatus: "",
    mediaUrl: "https://cdn.example/full.jpg",
    mediaUrls: ["https://cdn.example/thumbs/small.jpg", "https://cdn.example/full.jpg"],
    status: "published",
    breeder: {
      id: "b1",
      name: "Happy Farm",
      displayNameVI: "Happy Farm",
      location: "HCMC",
      verified: true,
      verificationStatus: "verified",
      breederType: "home_breeder",
      primarySpecies: ["cat"],
      mainBreeds: ["Persian"],
      avatar: "",
      bio: "",
      bioVI: "",
      trustScore: 80,
      penaltyPoints: 0,
      violations: [],
      activeListings: 1,
      template: "T1",
      contact: {},
      scale: "",
      careEnvironment: "",
      commitments: [],
      checklist: [],
      verificationTier: 2,
    },
    saved: false,
    escrowEnabled: true,
    ...overrides,
  };
}

test("absoluteMediaUrl and listingShareUrl", () => {
  assert.equal(absoluteMediaUrl("data:image/png;base64,xx"), undefined);
  assert.equal(absoluteMediaUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  assert.equal(absoluteMediaUrl("//cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  assert.match(absoluteMediaUrl("/media/a.jpg") || "", /\/media\/a\.jpg$/);
  assert.match(listingShareUrl("abc 1"), /\/app\/pet-feed\/posts\/abc%201$/);
});

test("listingOgPhotoUrl prefers full photo over thumbs", () => {
  const url = listingOgPhotoUrl(
    sampleListing({
      mediaUrl: "https://cdn.example/thumbs/card.jpg",
      mediaUrls: [
        "https://cdn.example/thumbs/card.jpg",
        "https://cdn.example/photos/full.jpg",
      ],
    }),
  );
  assert.equal(url, "https://cdn.example/photos/full.jpg");
});

test("buildListingOgCopy includes price location breeder without escrow pitch", () => {
  const copy = buildListingOgCopy(sampleListing());
  assert.match(copy.title, /Persian/);
  assert.match(copy.title, /VNĐ|8500000|8\.500\.000/);
  assert.match(copy.description, /HCMC/);
  assert.match(copy.description, /Happy Farm/);
  assert.doesNotMatch(copy.description, /Escrow|cọc/i);
});
