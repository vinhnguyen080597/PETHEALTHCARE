import test from "node:test";
import assert from "node:assert/strict";
import {
  countFarmPetsByAvailability,
  farmPetAvailability,
  farmPetTabCount,
  filterFarmPetsByAvailability,
  isFarmPetListing,
  listingMetadataMarksSold,
  parseFarmPetAvailabilityFilter,
  sortFarmPets,
} from "../src/lib/farmPets";
import type { Listing } from "../src/lib/types";

function listing(
  overrides: Partial<Listing> & Pick<Listing, "id" | "status">,
): Listing {
  return {
    title: "Pet",
    titleVI: "Pet",
    species: "dog",
    breed: "Poodle",
    gender: "female",
    ageMonths: 3,
    location: "HCM",
    price: "5.000.000",
    description: "",
    descriptionVI: "",
    personality: [],
    personalityVI: [],
    vaccineStatus: "",
    dewormingStatus: "",
    mediaUrl: "",
    mediaUrls: [],
    breeder: {
      id: "bp",
      name: "Farm",
      displayNameVI: "Farm",
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
      template: "T1",
      contact: {},
      scale: "",
      careEnvironment: "",
      commitments: [],
      checklist: [],
      verificationTier: 1,
    },
    saved: false,
    escrowEnabled: false,
    ...overrides,
  };
}

test("listingMetadataMarksSold reads sold flags", () => {
  assert.equal(listingMetadataMarksSold({ sold: true }), true);
  assert.equal(listingMetadataMarksSold({ listing_outcome: "sold" }), true);
  assert.equal(listingMetadataMarksSold({}), false);
});

test("farm pets include for-sale, deposit hold, and completed", () => {
  assert.equal(farmPetAvailability(listing({ id: "1", status: "published" })), "for_sale");
  assert.equal(
    farmPetAvailability(
      listing({ id: "1c", status: "published", metadataSold: true }),
    ),
    "completed",
  );
  assert.equal(
    farmPetAvailability(listing({ id: "1b", status: "deposit_hold" })),
    "deposit_hold",
  );
  assert.equal(farmPetAvailability(listing({ id: "2", status: "sold" })), "completed");
  assert.equal(
    farmPetAvailability(
      listing({ id: "3", status: "archived", metadataSold: true }),
    ),
    "completed",
  );
  assert.equal(isFarmPetListing(listing({ id: "4", status: "draft" })), false);
  assert.equal(isFarmPetListing(listing({ id: "5", status: "archived" })), false);
  assert.equal(
    farmPetAvailability(
      listing({ id: "6", status: "sold", ownerDeleted: true }),
    ),
    null,
  );
  assert.equal(
    isFarmPetListing(
      listing({
        id: "7",
        status: "archived",
        metadataSold: true,
        ownerDeleted: true,
      }),
    ),
    false,
  );
});

test("sortFarmPets puts for-sale before hold before completed", () => {
  const sorted = sortFarmPets([
    listing({ id: "sold", status: "sold" }),
    listing({ id: "hold", status: "deposit_hold" }),
    listing({ id: "live", status: "published" }),
    listing({ id: "done", status: "archived", metadataSold: true }),
  ]);
  assert.deepEqual(
    sorted.map((l) => l.id),
    ["live", "hold", "sold", "done"],
  );
  assert.equal(farmPetTabCount(sorted), 4);
});

test("countFarmPetsByAvailability and filterFarmPetsByAvailability", () => {
  const rows = [
    listing({ id: "a", status: "published" }),
    listing({ id: "b", status: "published" }),
    listing({ id: "c", status: "deposit_hold" }),
    listing({ id: "d", status: "sold" }),
    listing({ id: "e", status: "draft" }),
  ];
  assert.deepEqual(countFarmPetsByAvailability(rows), {
    for_sale: 2,
    deposit_hold: 1,
    completed: 1,
  });
  assert.deepEqual(
    filterFarmPetsByAvailability(rows, "for_sale").map((l) => l.id),
    ["a", "b"],
  );
  assert.deepEqual(
    filterFarmPetsByAvailability(rows, "deposit_hold").map((l) => l.id),
    ["c"],
  );
  assert.deepEqual(
    filterFarmPetsByAvailability(rows, "completed").map((l) => l.id),
    ["d"],
  );
  assert.equal(filterFarmPetsByAvailability(rows, "all").length, 4);
});

test("parseFarmPetAvailabilityFilter accepts known values only", () => {
  assert.equal(parseFarmPetAvailabilityFilter("for_sale"), "for_sale");
  assert.equal(parseFarmPetAvailabilityFilter("DEPOSIT_HOLD"), "deposit_hold");
  assert.equal(parseFarmPetAvailabilityFilter("nope"), "all");
  assert.equal(parseFarmPetAvailabilityFilter(null), "all");
});
