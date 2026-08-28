import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  firstNewListingErrorField,
  LISTING_MAX_REQUEST_BYTES,
  LISTING_PAPERWORK_KEYS,
  LISTING_SPECIES,
  listingBreedKeysForSpecies,
  listingMaxRequestBodyConfig,
  listingSpeciesEmoji,
  mergeListingMediaFiles,
  moveListingMediaItem,
  nextListingBreedForSpecies,
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
  "listing.new.termsBefore",
  "listing.new.termsAnd",
  "listing.new.termsAfter",
  "listing.new.field.termsRequired",
  "listing.new.field.uploadTooLarge",
  "listing.new.field.mediaTooLarge",
  "legal.terms",
  "legal.guidelines",
] as const;

test("listing upload body limit covers max photos, evidence, and video", () => {
  assert.equal(listingMaxRequestBodyConfig(), "124mb");
  assert.ok(LISTING_MAX_REQUEST_BYTES > 100 * 1024 * 1024);
});

test("listing new form i18n keys exist in EN and VI", () => {
  for (const key of KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.equal(vi["listing.new.warrantyNone"], "Không bảo hành");
  assert.equal(en["listing.new.warrantyNone"], "No warranty");
});

test("listing preview terms copy names Terms and Marketplace Guidelines", () => {
  assert.match(vi["listing.new.termsBefore"], /đã đọc và đồng ý/i);
  assert.match(vi["listing.new.termsAfter"], /chính xác và trung thực/i);
  assert.doesNotMatch(vi["listing.new.termsAfter"], /thông tin tin tin/);
  assert.equal(vi["legal.terms"], "Điều khoản dịch vụ");
  assert.equal(vi["legal.guidelines"], "Nội quy Marketplace");
  assert.match(vi["listing.new.field.termsRequired"], /Điều khoản dịch vụ/);
  assert.match(vi["listing.new.field.termsRequired"], /Nội quy Marketplace/);

  assert.match(en["listing.new.termsBefore"], /read and agree/i);
  assert.match(en["listing.new.termsAfter"], /accurate and truthful/i);
  assert.equal(en["legal.terms"], "Terms of Service");
  assert.equal(en["legal.guidelines"], "Marketplace Guidelines");
  assert.match(en["listing.new.field.termsRequired"], /Terms of Service/);
  assert.match(en["listing.new.field.termsRequired"], /Marketplace Guidelines/);
});

test("new listing form does not collect optional listing contact", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of [
    "listing.new.field.contact",
    "listing.new.field.facebook",
    "listing.new.field.zalo",
    "listing.new.field.phone",
  ]) {
    assert.equal(enDict[key], undefined, `stale EN ${key}`);
    assert.equal(viDict[key], undefined, `stale VI ${key}`);
  }
  assert.ok(en["listing.new.section.story"]);
  assert.ok(vi["listing.new.section.story"]);
});

test("listing paperwork options are vaccine book, origin, and pedigree on request", () => {
  assert.deepEqual([...LISTING_PAPERWORK_KEYS], [
    "vaccineBook",
    "origin",
    "pedigreeOnRequest",
  ]);
  for (const id of LISTING_PAPERWORK_KEYS) {
    const key = `listing.new.paperwork.${id}`;
    assert.ok(en[key as keyof typeof en], `missing EN ${key}`);
    assert.ok(vi[key as keyof typeof vi], `missing VI ${key}`);
  }
  assert.equal(vi["listing.new.paperwork.vaccineBook"], "Sổ tiêm");
  assert.equal(vi["listing.new.paperwork.origin"], "Giấy nguồn gốc");
  assert.equal(vi["listing.new.paperwork.pedigreeOnRequest"], "Làm phả theo yêu cầu");
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(enDict["listing.new.paperwork.microchip"], undefined);
  assert.equal(viDict["listing.new.paperwork.contract"], undefined);
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
      location: "TP. Hà Nội",
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
    "rabbit",
    "hamster",
    "reptile",
  ]);
  for (const id of LISTING_SPECIES) {
    const key = `listing.new.species.${id}`;
    assert.ok(en[key as keyof typeof en], `missing EN ${key}`);
    assert.ok(vi[key as keyof typeof vi], `missing VI ${key}`);
  }
  assert.equal(vi["listing.new.species.fish"], "Cá cảnh");
  assert.equal(vi["listing.new.species.rabbit"], "Thỏ");
  assert.equal(vi["listing.new.species.hamster"], "Hamster");
  assert.equal(vi["listing.new.species.reptile"], "Bò sát");
  assert.equal(listingSpeciesEmoji("rabbit"), "🐰");
  assert.equal(listingSpeciesEmoji("hamster"), "🐹");
  assert.equal(listingSpeciesEmoji("reptile"), "🐍");
  assert.equal(listingSpeciesEmoji("fish"), "🐠");
});

test("listing breed dropdown follows the selected species", () => {
  const dogBreeds = listingBreedKeysForSpecies("dog");
  const catBreeds = listingBreedKeysForSpecies("cat");
  assert.ok(dogBreeds.includes("poodle"));
  assert.ok(dogBreeds.includes("phu_quoc"));
  assert.equal(dogBreeds.includes("meo_muop"), false);
  assert.ok(catBreeds.includes("meo_muop"));
  assert.equal(catBreeds.includes("poodle"), false);
  assert.ok(listingBreedKeysForSpecies("bird").includes("budgie"));
  assert.ok(listingBreedKeysForSpecies("fish").includes("betta"));
  assert.ok(listingBreedKeysForSpecies("rabbit").includes("holland_lop"));
  assert.ok(listingBreedKeysForSpecies("hamster").includes("syrian"));
  assert.ok(listingBreedKeysForSpecies("reptile").includes("turtle"));

  for (const species of LISTING_SPECIES) {
    const keys = listingBreedKeysForSpecies(species);
    assert.ok(keys.includes("mixed"), `${species} missing mixed`);
    assert.ok(keys.includes("other"), `${species} missing other`);
    assert.equal(keys[keys.length - 2], "mixed");
    assert.equal(keys[keys.length - 1], "other");
    for (const id of keys) {
      const key = `listing.new.breed.${id}`;
      assert.ok(en[key as keyof typeof en], `missing EN ${key}`);
      assert.ok(vi[key as keyof typeof vi], `missing VI ${key}`);
    }
  }

  assert.equal(nextListingBreedForSpecies("dog", "meo_muop"), "poodle");
  assert.equal(nextListingBreedForSpecies("dog", "mixed"), "mixed");
  assert.equal(nextListingBreedForSpecies("cat", "poodle"), "meo_ta");
  assert.equal(nextListingBreedForSpecies("bird", ""), "");
  assert.equal(vi["listing.new.breed.mixed"], "Giống lai");
  assert.equal(vi["listing.new.breed.pomeranian"], "Phốc sóc");
  assert.equal(vi["listing.new.breed.phu_quoc"], "Chó Phú Quốc");
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
