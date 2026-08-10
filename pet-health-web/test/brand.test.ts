import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_AVATAR_PATH,
  BRAND_NAME,
  BRAND_NAME_SHORT,
  BRAND_PRIMARY,
  brandUi,
  splitBrandName,
} from "../src/lib/brand";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("brand avatar public asset exists", () => {
  assert.equal(BRAND_AVATAR_PATH, "/images/PetMarketAvatar.png");
  assert.ok(
    existsSync(path.join(root, "public", "images", "PetMarketAvatar.png")),
    "missing public/images/PetMarketAvatar.png",
  );
});

test("app icon.png exists for tab favicon", () => {
  assert.ok(
    existsSync(path.join(root, "src", "app", "icon.png")),
    "missing src/app/icon.png",
  );
});

test("brand primary matches marketplace amber", () => {
  assert.equal(BRAND_PRIMARY, "#D97706");
  assert.match(brandUi.primaryBg, /D97706/);
  assert.equal(brandUi.primarySoftBg, "bg-amber-50");
});

test("brand display name is PetCare: Pet Marketplace", () => {
  assert.equal(BRAND_NAME, "PetCare: Pet Marketplace");
  assert.equal(BRAND_NAME_SHORT, "PetCare");
  assert.deepEqual(splitBrandName(BRAND_NAME), {
    lead: "PetCare",
    rest: ": Pet Marketplace",
  });
  assert.match(brandUi.primaryText, /D97706/);
});
