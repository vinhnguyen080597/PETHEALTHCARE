import test from "node:test";
import assert from "node:assert/strict";
import {
  isListingNewOnFloor,
  listingHotBadges,
  listingInterestScore,
  listingPreviewImages,
  listingTrustTags,
} from "../src/lib/marketplaceSocialProof";
import { buildLiveTickerItems, DEMO_LIVE_TICKER_ITEMS, liveTickerDisplayText } from "../src/lib/marketplaceLiveTicker";
import {
  feedExtraToEscrowOnly,
  feedExtraToGender,
  parseFeedExtraFilter,
} from "../src/lib/marketplaceFeedFilters";
import {
  groupBreederPetThumbs,
  pickHallOfFameBreeders,
  pickJustArrivedListings,
  pickTopInterestedListings,
} from "../src/lib/marketplaceFeedSections";
import {
  listingMatchesQuickCategory,
  parseQuickCategory,
} from "../src/lib/marketplaceQuickCategories";
import { breederActivityCue } from "../src/lib/breederActivityCue";
import type { BreederProfile, Listing } from "../src/lib/types";

const breeder = {
  id: "b1",
  name: "Mina Cattery",
  displayNameVI: "Mina Cattery",
  location: "Hà Nội",
  verified: true,
  verificationStatus: "verified",
  breederType: "home_breeder",
  primarySpecies: ["cat"],
  mainBreeds: [],
  avatar: "https://example.com/a.jpg",
  bio: "",
  bioVI: "",
  trustScore: 80,
  penaltyPoints: 0,
  violations: [],
  activeListings: 2,
  reviewAverage: 4.9,
  reviewCount: 5,
  template: "T1",
  contact: {},
  scale: "",
  careEnvironment: "",
  commitments: [],
  checklist: [],
  verificationTier: 1,
} as BreederProfile;

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "p1",
    title: "British Shorthair",
    titleVI: "Mèo ALN",
    species: "cat",
    breed: "British Shorthair",
    gender: "female",
    ageMonths: 2,
    location: "Hà Nội",
    price: "4500000",
    description: "",
    descriptionVI: "",
    personality: [],
    personalityVI: [],
    vaccineStatus: "2 mũi",
    dewormingStatus: "",
    mediaUrl: "https://example.com/1.jpg",
    mediaUrls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
    status: "published",
    breeder,
    saved: false,
    favoriteCount: 0,
    escrowEnabled: false,
    ...overrides,
  };
}

test("listingHotBadges uses saves, new, and video only", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  const badges = listingHotBadges(
    listing({
      favoriteCount: 12,
      videoUrl: "https://example.com/v.mp4",
      createdAt: "2026-08-16T10:00:00.000Z",
    }),
    now,
  );
  assert.deepEqual(
    badges.map((b) => b.kind),
    ["saves", "new", "video"],
  );
  assert.equal(badges[0].kind === "saves" && badges[0].count, 12);
});

test("isListingNewOnFloor respects 24h window", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  assert.equal(
    isListingNewOnFloor(listing({ createdAt: "2026-08-16T01:00:00.000Z" }), now),
    true,
  );
  assert.equal(
    isListingNewOnFloor(listing({ createdAt: "2026-08-14T12:00:00.000Z" }), now),
    false,
  );
});

test("listingTrustTags prefer warranty then escrow/vaccine", () => {
  const tags = listingTrustTags(
    listing({
      escrowEnabled: true,
      warrantyPolicy: {
        id: "w1",
        title: "Health",
        careParvoCoverageDays: 30,
      },
    }),
  );
  assert.equal(tags[0]?.kind, "warranty");
  assert.equal(tags[0]?.kind === "warranty" && tags[0].days, 30);
});

test("listingPreviewImages dedupes and caps", () => {
  assert.deepEqual(
    listingPreviewImages(
      listing({
        mediaUrl: "https://example.com/1.jpg",
        mediaUrls: [
          "https://example.com/1.jpg",
          "https://example.com/2.jpg",
          "https://example.com/3.jpg",
        ],
      }),
      2,
    ),
    ["https://example.com/1.jpg", "https://example.com/2.jpg"],
  );
});

test("buildLiveTickerItems prefers deposit and sold from real states", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  const items = buildLiveTickerItems(
    [
      listing({
        id: "d1",
        status: "deposit_hold",
        createdAt: "2026-08-16T11:50:00.000Z",
      }),
      listing({
        id: "s1",
        status: "sold",
        metadataSold: true,
        createdAt: "2026-08-16T11:40:00.000Z",
      }),
      listing({
        id: "n1",
        createdAt: "2026-08-16T11:00:00.000Z",
      }),
    ],
    now,
    5,
  );
  assert.ok(items.some((i) => i.kind === "deposit"));
  assert.ok(items.some((i) => i.kind === "sold"));
  assert.ok(items.some((i) => i.kind === "new_listing"));
});

test("feed sections rank by interest and just arrived", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  const rows = [
    listing({ id: "a", favoriteCount: 2, createdAt: "2026-08-10T12:00:00.000Z" }),
    listing({ id: "b", favoriteCount: 20, createdAt: "2026-08-10T12:00:00.000Z" }),
    listing({ id: "c", favoriteCount: 0, createdAt: "2026-08-16T10:00:00.000Z" }),
  ];
  assert.equal(pickTopInterestedListings(rows, 1, now)[0]?.id, "b");
  assert.deepEqual(
    pickJustArrivedListings(rows, 5, now).map((l) => l.id),
    ["c"],
  );
  assert.ok(listingInterestScore(rows[1], now) > listingInterestScore(rows[0], now));
});

test("quick categories match breed needles and just arrived", () => {
  assert.equal(parseQuickCategory("corgi"), "corgi");
  assert.equal(parseQuickCategory("nope"), "all");
  assert.equal(
    listingMatchesQuickCategory(
      listing({ breed: "Pembroke Corgi", title: "Corgi pup" }),
      "corgi",
    ),
    true,
  );
  const now = Date.parse("2026-08-16T12:00:00.000Z");
  assert.equal(
    listingMatchesQuickCategory(
      listing({ createdAt: "2026-08-16T11:00:00.000Z" }),
      "just_arrived",
      now,
    ),
    true,
  );
});

test("groupBreederPetThumbs groups open-sale media with price", () => {
  const map = groupBreederPetThumbs([
    listing({ id: "1", price: "4500000", breeder: { ...breeder, id: "b1" } }),
    listing({ id: "2", price: "5000000", breeder: { ...breeder, id: "b1" } }),
    listing({
      id: "3",
      status: "sold",
      metadataSold: true,
      breeder: { ...breeder, id: "b1" },
    }),
  ]);
  assert.equal(map.b1?.length, 2);
  assert.equal(map.b1?.[0]?.price, "4500000");
});

test("pickHallOfFameBreeders assigns gold silver bronze by reviews", () => {
  const entries = pickHallOfFameBreeders(
    [
      {
        ...breeder,
        id: "bronze",
        name: "C",
        reviewAverage: 4.5,
        reviewCount: 5,
        trustScore: 50,
      },
      {
        ...breeder,
        id: "gold",
        name: "A",
        reviewAverage: 5,
        reviewCount: 40,
        trustScore: 90,
      },
      {
        ...breeder,
        id: "silver",
        name: "B",
        reviewAverage: 4.9,
        reviewCount: 20,
        trustScore: 80,
      },
    ],
    3,
  );
  assert.deepEqual(
    entries.map((e) => [e.breeder.id, e.medal]),
    [
      ["gold", "gold"],
      ["silver", "silver"],
      ["bronze", "bronze"],
    ],
  );
});

test("buildLiveTickerItems pads with 10 demo pulses when quiet", () => {
  const items = buildLiveTickerItems([], Date.now(), 10);
  assert.equal(items.length, 10);
  assert.ok(items.every((i) => i.kind === "demo"));
  assert.ok(items[0]?.messageVI);
});

test("liveTickerDisplayText prefers demo bilingual copy", () => {
  const text = liveTickerDisplayText(DEMO_LIVE_TICKER_ITEMS[0]!, "VI", {
    deposit: "",
    sold: "",
    newListing: "",
    newBatch: "",
  });
  assert.match(text, /Sen Lan/);
});

test("feed extra filter merges gender and escrow", () => {
  assert.equal(parseFeedExtraFilter("escrow"), "escrow");
  assert.equal(feedExtraToEscrowOnly("escrow"), true);
  assert.equal(feedExtraToGender("male"), "male");
  assert.equal(feedExtraToGender("escrow"), "all");
});

test("breederActivityCue never claims online presence", () => {
  assert.equal(breederActivityCue(breeder).kind, "fast_response");
  assert.equal(
    breederActivityCue({
      ...breeder,
      trustScore: 10,
      reviewCount: 0,
      activeListings: 0,
      warrantyPolicies: [],
    }).kind,
    "none",
  );
  assert.equal(
    breederActivityCue({
      ...breeder,
      trustScore: 45,
      reviewCount: 0,
      activeListings: 1,
    }).kind,
    "active_kennel",
  );
});
