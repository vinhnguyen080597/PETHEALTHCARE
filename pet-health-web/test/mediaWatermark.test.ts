import test from "node:test";
import assert from "node:assert/strict";
import { MEDIA_WATERMARK_TEXT } from "../src/lib/mediaWatermark";

test("media watermark brand text is PetCare: Pet Marketplace", () => {
  assert.equal(MEDIA_WATERMARK_TEXT, "PetCare: Pet Marketplace");
});
