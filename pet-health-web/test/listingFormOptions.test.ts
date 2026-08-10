import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  firstNewListingErrorField,
  LISTING_SPECIES,
  mergeListingMediaFiles,
  moveListingMediaItem,
  validateNewListingForm,
  vaccineStatusRequiresHealthEvidence,
} from "../src/lib/listingFormOptions";

const KEYS = [
  "listing.new.field.title",
  "listing.new.field.breedRequired",
  "listing.new.field.healthEvidenceRequired",
  "listing.new.vaccine.not_yet",
  "listing.new.vaccine.first_dose",
  "listing.new.species.cat",
  "listing.new.breed.meo_ta",
  "listing.new.personality.friendly",
  "listing.new.paperwork.vaccineBook",
  "listing.new.section.basics",
  "listing.new.section.health",
  "listing.new.section.story",
  "listing.new.section.media",
  "listing.new.photosDrop",
  "listing.new.warrantyCreate",
  "listing.new.warrantyNone",
  "listing.new.vaccineShort.first_dose",
  "listing.new.dewormingShort.recent",
  "listing.new.review",
  "listing.new.edit",
  "listing.new.submitting",
  "listing.new.reviewNote",
  "listing.new.previewUntitled",
] as const;

test("listing new form i18n keys exist in EN and VI", () => {
  for (const key of KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.equal(vi["listing.new.warrantyNone"], "Không bảo hành");
  assert.equal(en["listing.new.warrantyNone"], "No warranty");
});

test("vaccine status requires health evidence like mobile", () => {
  assert.equal(vaccineStatusRequiresHealthEvidence(""), false);
  assert.equal(vaccineStatusRequiresHealthEvidence("unknown"), false);
  assert.equal(vaccineStatusRequiresHealthEvidence("Not vaccinated yet"), false);
  assert.equal(vaccineStatusRequiresHealthEvidence("Chưa tiêm"), false);
  assert.equal(vaccineStatusRequiresHealthEvidence("First dose completed"), true);
  assert.equal(vaccineStatusRequiresHealthEvidence("Đã tiêm mũi đầu"), true);
});

test("validateNewListingForm requires mobile parity fields", () => {
  const messages = {
    title: "t",
    species: "s",
    breed: "b",
    gender: "g",
    ageMonths: "a",
    location: "l",
    priceNote: "p",
    photos: "ph",
    video: "v",
    healthEvidence: "h",
    terms: "tm",
  };
  const errors = validateNewListingForm(
    {
      title: "",
      species: "",
      breed: "",
      customBreed: "",
      gender: "",
      ageMonths: "",
      location: "",
      priceNote: "",
      vaccineKey: "first_dose",
      vaccineLabel: "First dose completed",
      photoCount: 0,
      hasVideo: false,
      healthEvidenceCount: 0,
      termsAccepted: false,
    },
    messages,
  );
  assert.equal(errors.title, "t");
  assert.equal(errors.breed, "b");
  assert.equal(errors.healthEvidence, "h");
  assert.equal(errors.terms, "tm");
  assert.equal(firstNewListingErrorField(errors), "title");

  const reviewErrors = validateNewListingForm(
    {
      title: "Ready",
      species: "cat",
      breed: "meo_ta",
      customBreed: "",
      gender: "male",
      ageMonths: "2",
      location: "Hà Nội",
      priceNote: "3.500.000",
      vaccineKey: "not_yet",
      vaccineLabel: "Not vaccinated yet",
      photoCount: 1,
      hasVideo: true,
      healthEvidenceCount: 0,
      termsAccepted: false,
    },
    messages,
    { requireTerms: false },
  );
  assert.equal(Object.keys(reviewErrors).length, 0);
});

test("listing species options match mobile active set", () => {
  assert.deepEqual([...LISTING_SPECIES], [
    "dog",
    "cat",
    "bird",
    "fish",
    "mouse",
    "cow",
    "pig",
    "chicken",
  ]);
});

test("mergeListingMediaFiles respects max", () => {
  const a = new File(["a"], "a.jpg", { type: "image/jpeg" });
  const b = new File(["b"], "b.jpg", { type: "image/jpeg" });
  const c = new File(["c"], "c.jpg", { type: "image/jpeg" });
  assert.equal(mergeListingMediaFiles([a], [b, c], 2).length, 2);
  assert.equal(mergeListingMediaFiles([a, b], [c], 2).length, 2);
});

test("moveListingMediaItem reorders cover photo", () => {
  const a = new File(["a"], "a.jpg");
  const b = new File(["b"], "b.jpg");
  const c = new File(["c"], "c.jpg");
  const moved = moveListingMediaItem([a, b, c], 2, 0);
  assert.equal(moved[0].name, "c.jpg");
  assert.equal(moved[1].name, "a.jpg");
  assert.equal(moved[2].name, "b.jpg");
});
