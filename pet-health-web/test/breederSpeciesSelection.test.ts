import test from "node:test";
import assert from "node:assert/strict";
import {
  breederDisplaySpecies,
  breederSpeciesForSave,
  selectPrimarySpecies,
  splitBreederSpeciesForForm,
} from "../src/lib/breederSpeciesSelection";

test("selectPrimarySpecies replaces the current choice", () => {
  assert.equal(selectPrimarySpecies("cat", "dog"), "dog");
  assert.equal(selectPrimarySpecies("dog", "dog"), "dog");
});

test("splitBreederSpeciesForForm keeps the first primary species", () => {
  assert.equal(splitBreederSpeciesForForm(["dog", "cat"]), "dog");
  assert.equal(splitBreederSpeciesForForm([]), "");
});

test("breederSpeciesForSave keeps one primary species", () => {
  assert.deepEqual(breederSpeciesForSave("dog"), {
    primarySpecies: ["dog"],
  });
  assert.deepEqual(breederSpeciesForSave(""), {
    primarySpecies: [],
  });
});

test("breederDisplaySpecies returns primary list only", () => {
  assert.deepEqual(breederDisplaySpecies(["dog"]), ["dog"]);
  assert.deepEqual(breederDisplaySpecies("cat"), ["cat"]);
});
