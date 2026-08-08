import test from "node:test";
import assert from "node:assert/strict";
import { mapApiBreeder, mapApiPost } from "../src/lib/mappers";
import type { ApiBreederProfile, ApiPetFeedPost } from "../src/lib/types";

test("mapApiBreeder normalizes verification and trust defaults", () => {
  const profile: ApiBreederProfile = {
    id: "bp-1",
    user_id: "u-1",
    display_name: "Farm A",
    location: "Da Nang",
    verification_status: "verified",
    primary_species: ["dog"],
    main_breeds: ["Poodle"],
    bio: "Nice farm",
    care_environment: "Home",
    contact: { phone: "090" },
    metadata: {
      trust_score: 95,
      elite: true,
      breeder_type: "registered_kennel",
      checklist: [{ label: "Vaccine", done: true }],
      template: "T2",
    },
  };
  const mapped = mapApiBreeder(profile, { activeListings: 3 });
  assert.equal(mapped.id, "bp-1");
  assert.equal(mapped.verified, true);
  assert.equal(mapped.verificationStatus, "verified");
  assert.equal(mapped.breederType, "registered_kennel");
  assert.equal(mapped.trustScore, 95);
  assert.equal(mapped.verificationTier, 3);
  assert.equal(mapped.template, "T2");
  assert.equal(mapped.activeListings, 3);
  assert.equal(mapped.checklist[0]?.label, "Vaccine");
});

test("mapApiBreeder uses signal-based trust when metadata trust_score is absent", () => {
  const profile: ApiBreederProfile = {
    id: "bp-new",
    display_name: "Fresh Farm",
    verification_status: "verified",
    bio: "",
    care_environment: "",
    contact: {},
    metadata: {},
  };
  const mapped = mapApiBreeder(profile, { activeListings: 0 });
  // Verified only → 30 (not the old hardcoded 70)
  assert.equal(mapped.trustScore, 30);
});

test("mapApiPost formats price gender and escrow", () => {
  const post: ApiPetFeedPost = {
    id: "p1",
    title: "Kitten",
    species: "Cat",
    breed: "British",
    gender: "Đực",
    age_months: 4,
    location: "HN",
    price_note: "5000000",
    description: "Cute",
    personality: ["calm"],
    vaccine_status: "done",
    deworming_status: "done",
    media_urls: ["https://cdn.example/a.jpg"],
    status: "pending_review",
    metadata: {
      escrow_enabled: true,
      health_evidence_urls: ["https://cdn.example/e.jpg"],
    },
    breeder_profile: {
      id: "bp",
      display_name: "Breeder",
      verification_status: "pending_review",
    },
    is_favorited: true,
  };
  const listing = mapApiPost(post);
  assert.equal(listing.id, "p1");
  assert.equal(listing.species, "cat");
  assert.equal(listing.gender, "male");
  assert.equal(listing.status, "pending_review");
  assert.equal(listing.saved, true);
  assert.equal(listing.escrowEnabled, true);
  assert.equal(listing.evidenceUrls?.[0], "https://cdn.example/e.jpg");
  assert.match(listing.price, /VNĐ|5\.000\.000|5000000/);
});
