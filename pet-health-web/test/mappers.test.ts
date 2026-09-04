import test from "node:test";
import assert from "node:assert/strict";
import { mapApiBreeder, mapApiPost } from "../src/lib/mappers";
import type { ApiBreederProfile, ApiPetFeedPost } from "../src/lib/types";
import { DEFAULT_BREEDER_AVATAR_PATH } from "../src/lib/breederProfileImages";

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
    contact: { phone: "090", facebook: "https://fb.com/a", zalo: "090" },
    metadata: {
      trust_score: 95,
      elite: true,
      breeder_type: "registered_kennel",
      checklist: [{ label: "Vaccine", done: true }],
      template: "T2",
      business_license_verified: true,
    },
  };
  const mapped = mapApiBreeder(profile, { activeListings: 3 });
  assert.equal(mapped.id, "bp-1");
  assert.equal(mapped.verified, true);
  assert.equal(mapped.complianceVerifiedStripped, false);
  assert.equal(mapped.verificationStatus, "verified");
  assert.equal(mapped.breederType, "registered_kennel");
  // Verified base 30 + approved business license 30
  assert.equal(mapped.trustScore, 60);
  assert.equal(mapped.verificationTier, 3);
  assert.equal(mapped.template, "T2");
  assert.equal(mapped.activeListings, 3);
  assert.equal(mapped.checklist[0]?.label, "Vaccine");
  assert.equal(mapped.facilityVideoUrl, null);
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
  // Verified only → 30 base transparency points
  assert.equal(mapped.trustScore, 30);
});

test("mapApiBreeder exposes approved facility video on the public farm", () => {
  const mapped = mapApiBreeder({
    id: "bp-vid",
    display_name: "Video Farm",
    verification_status: "verified",
    metadata: {
      facility_video_trust_awarded: true,
      facility_video_url: "https://cdn.example/tour.mp4",
    },
  });
  assert.equal(mapped.facilityVideoUrl, "https://cdn.example/tour.mp4");
});

test("mapApiBreeder marks Verified as stripped under compliance restrictions", () => {
  const mapped = mapApiBreeder({
    id: "bp-strip",
    display_name: "Stripped Farm",
    verification_status: "verified",
    metadata: {
      compliance: {
        score: 40,
        restrictions: { verifiedStrippedUntil: "2099-01-01T00:00:00.000Z" },
      },
    },
  });
  assert.equal(mapped.verified, true);
  assert.equal(mapped.complianceVerifiedStripped, true);
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

test("mapApiPost maps slim breeder_profile avatar_url onto listing.breeder.avatar", () => {
  const withAvatar = mapApiPost({
    id: "p-avatar",
    title: "Sphynx",
    media_urls: ["https://cdn.example/sphynx.jpg"],
    status: "published",
    breeder_profile: {
      id: "bp-avatar",
      display_name: "Lucastalina",
      verification_status: "verified",
      avatar_url: "https://cdn.example/farm-avatar.jpg",
    },
  });
  assert.equal(withAvatar.breeder.avatar, "https://cdn.example/farm-avatar.jpg");

  const withoutAvatar = mapApiPost({
    id: "p-no-avatar",
    title: "Kitten",
    media_urls: ["https://cdn.example/kitten.jpg"],
    status: "published",
    breeder_profile: {
      id: "bp-no-avatar",
      display_name: "No Photo Farm",
      verification_status: "verified",
    },
  });
  assert.equal(withoutAvatar.breeder.avatar, DEFAULT_BREEDER_AVATAR_PATH);
});

test("mapApiPost maps video_url onto listing.videoUrl", () => {
  const listing = mapApiPost({
    id: "p-video",
    title: "With video",
    media_urls: ["https://cdn.example/a.jpg"],
    video_url: "https://cdn.example/clip.mp4",
    status: "published",
  });
  assert.equal(listing.videoUrl, "https://cdn.example/clip.mp4");
});

test("mapApiPost treats published + cancelled metadata as cancelled", () => {
  const listing = mapApiPost({
    id: "p-cancelled",
    title: "Closed after cancel",
    status: "published",
    metadata: {
      cancelled: true,
      listing_outcome: "cancelled",
      deal: { status: "cancelled", completed_at: "2026-08-11T00:00:00.000Z" },
    },
  });
  assert.equal(listing.status, "cancelled");
  assert.equal(listing.metadataCancelled, true);
  assert.equal(listing.metadataSold, false);
});

test("mapApiPost treats published + sold metadata as sold", () => {
  const listing = mapApiPost({
    id: "p-closed",
    title: "Closed after cancel",
    status: "published",
    metadata: {
      sold: true,
      listing_outcome: "sold",
      deal: { status: "cancelled", completed_at: "2026-08-11T00:00:00.000Z" },
    },
  });
  assert.equal(listing.status, "sold");
  assert.equal(listing.metadataSold, true);
});

test("mapApiPost treats published + active deposit deal as deposit_hold", () => {
  const listing = mapApiPost({
    id: "p-hold",
    title: "Held",
    status: "published",
    metadata: {
      deal: { status: "deposit_hold", sen_user_id: "sen-1" },
    },
  });
  assert.equal(listing.status, "deposit_hold");
  assert.equal(listing.deal?.senUserId, "sen-1");
});

test("mapApiPost treats owner-deleted sold listings as archived", () => {
  const listing = mapApiPost({
    id: "p-deleted",
    title: "Removed",
    status: "archived",
    metadata: {
      sold: true,
      owner_deleted: true,
      owner_deleted_at: "2026-08-11T00:00:00.000Z",
    },
  });
  assert.equal(listing.status, "archived");
  assert.equal(listing.ownerDeleted, true);
  assert.equal(listing.metadataSold, false);
});
