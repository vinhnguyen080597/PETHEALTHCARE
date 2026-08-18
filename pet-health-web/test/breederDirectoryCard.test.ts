import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  BREEDER_CARD_ACTIONS_CLASS,
  BREEDER_CARD_PETS_PREVIEW_CLASS,
  breederCardHasPetPreview,
  breederCardPetsPreviewTitleKey,
  breederCardVisitCtaClass,
} from "../src/lib/breederDirectoryCard";

test("directory cards always reserve a pets preview strip", () => {
  assert.equal(breederCardHasPetPreview(0), false);
  assert.equal(breederCardHasPetPreview(1), true);
  assert.equal(
    breederCardPetsPreviewTitleKey(0),
    "breeders.card.petsPreviewEmpty",
  );
  assert.equal(
    breederCardPetsPreviewTitleKey(2),
    "breeders.card.petsPreviewCount",
  );
  assert.match(BREEDER_CARD_PETS_PREVIEW_CLASS, /min-h-/);
});

test("visit CTA stays half-width in a two-column footer", () => {
  assert.match(BREEDER_CARD_ACTIONS_CLASS, /mt-auto/);
  assert.match(BREEDER_CARD_ACTIONS_CLASS, /grid-cols-2/);
  assert.equal(breederCardVisitCtaClass(), "w-full");
});

test("empty pets preview copy exists in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.equal(viDict["breeders.card.petsPreviewEmpty"], "Chưa có bé đang mở bán");
  assert.equal(enDict["breeders.card.petsPreviewEmpty"], "No pets currently for sale");
});
