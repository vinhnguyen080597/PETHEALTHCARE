import test from "node:test";
import assert from "node:assert/strict";
import {
  displayRegistrationUnit,
  normalizeRegistrationUnitSelection,
  registrationUnitsForSpecies,
  REGISTRATION_UNIT_OTHER,
  splitRegistrationUnitForForm,
} from "../src/lib/breederRegistrationUnits";

test("registrationUnitsForSpecies returns Vietnam-relevant authorities", () => {
  assert.deepEqual(registrationUnitsForSpecies("cat"), [
    "wcf_vca",
    "vca",
    "tica",
    "cfa",
    "avf",
    REGISTRATION_UNIT_OTHER,
  ]);
  assert.deepEqual(registrationUnitsForSpecies("dog"), ["vka", REGISTRATION_UNIT_OTHER]);
  assert.equal(registrationUnitsForSpecies("bird").includes("vocas"), true);
  assert.equal(registrationUnitsForSpecies("unknown").length, 1);
});

test("normalizeRegistrationUnitSelection keeps other text only for Khác", () => {
  assert.deepEqual(
    normalizeRegistrationUnitSelection({
      species: "dog",
      unit: "vka",
      other: "ignored",
    }),
    { registrationUnit: "vka", registrationUnitOther: "" },
  );
  assert.deepEqual(
    normalizeRegistrationUnitSelection({
      species: "cat",
      unit: "bad",
      other: "Custom club",
    }),
    { registrationUnit: REGISTRATION_UNIT_OTHER, registrationUnitOther: "Custom club" },
  );
});

test("displayRegistrationUnit resolves slug or other label", () => {
  assert.equal(
    displayRegistrationUnit("vka", "", (key) => key),
    "breederForm.registrationUnits.vka",
  );
  assert.equal(displayRegistrationUnit(REGISTRATION_UNIT_OTHER, "My club"), "My club");
});

test("splitRegistrationUnitForForm maps legacy free text to Khác", () => {
  assert.deepEqual(
    splitRegistrationUnitForForm({
      species: "dog",
      legacyMetadataUnit: "Custom club",
    }),
    { registrationUnit: REGISTRATION_UNIT_OTHER, registrationUnitOther: "Custom club" },
  );
});
