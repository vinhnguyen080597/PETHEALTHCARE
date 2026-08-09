import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  appendWarrantyVaccinePreset,
  resolveWarrantyFarmSpecies,
  warrantyInfectiousFieldKey,
  warrantyVaccinePlaceholderKey,
  warrantyVaccinePresetIds,
} from "../src/lib/warrantySpeciesCopy";
import { warrantyCoverageRows } from "../src/lib/warrantyPolicyView";

const SPECIES_KEYS = [
  "warranty.field.careParvo.dog",
  "warranty.field.careParvo.cat",
  "warranty.field.respiratory.dog",
  "warranty.field.respiratory.cat",
  "warranty.viewer.summaryCareParvo.dog",
  "warranty.viewer.summaryCareParvo.cat",
  "warranty.evidence.rapid_test_photo.dog",
  "warranty.evidence.rapid_test_photo.cat",
  "warranty.vaccine.placeholder.dog",
  "warranty.vaccine.placeholder.cat",
  "warranty.vaccine.placeholder.mixed",
  "warranty.vaccine.preset.dog_5in1",
  "warranty.vaccine.preset.cat_3in1",
  "warranty.vaccine.preset.cat_felv",
] as const;

test("warranty species i18n keys exist in EN and VI", () => {
  for (const key of SPECIES_KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});

test("resolveWarrantyFarmSpecies prefers listing then farm primary", () => {
  assert.equal(
    resolveWarrantyFarmSpecies({ listingSpecies: "cat", primarySpecies: ["dog"] }),
    "cat",
  );
  assert.equal(resolveWarrantyFarmSpecies({ primarySpecies: ["dog"] }), "dog");
  assert.equal(resolveWarrantyFarmSpecies({ primarySpecies: ["cat"] }), "cat");
  assert.equal(
    resolveWarrantyFarmSpecies({ primarySpecies: ["dog", "cat"] }),
    "mixed",
  );
});

test("infectious disease coverage label is vaccine-based (not Care/Parvo names)", () => {
  assert.equal(
    vi["warranty.field.careParvo.dog"],
    "Các bệnh truyền nhiễm nguy hiểm (có trong vaccine)",
  );
  assert.equal(
    vi["warranty.field.careParvo.cat"],
    "Các bệnh truyền nhiễm nguy hiểm (có trong vaccine)",
  );
  assert.match(
    en["warranty.field.careParvo.dog"],
    /covered by vaccines/i,
  );
});

test("appendWarrantyVaccinePreset avoids duplicates", () => {
  assert.equal(
    appendWarrantyVaccinePreset("5 trong 1 (DHPPL)", "5 trong 1 (DHPPL)"),
    "5 trong 1 (DHPPL)",
  );
  assert.equal(
    appendWarrantyVaccinePreset("5 trong 1 (DHPPL)", "Dại"),
    "5 trong 1 (DHPPL), Dại",
  );
});

test("warrantyCoverageRows uses species-aware field keys", () => {
  const dogRows = warrantyCoverageRows(
    {
      careParvoCoverageDays: 14,
      respiratorySkinCoverageDays: 7,
      congenitalCoverageDays: 30,
    },
    "dog",
  );
  assert.equal(dogRows[0]?.fieldKey, "warranty.field.careParvo.dog");
  assert.equal(dogRows[1]?.fieldKey, "warranty.field.respiratory.dog");

  const catRows = warrantyCoverageRows(
    {
      careParvoCoverageDays: 14,
      respiratorySkinCoverageDays: 7,
      congenitalCoverageDays: 0,
    },
    "cat",
  );
  assert.equal(catRows[0]?.fieldKey, "warranty.field.careParvo.cat");
  assert.equal(catRows[1]?.fieldKey, "warranty.field.respiratory.cat");
});
