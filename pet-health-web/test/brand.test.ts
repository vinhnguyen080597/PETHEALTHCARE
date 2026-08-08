import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND_AVATAR_PATH } from "../src/lib/brand";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("brand avatar public asset exists", () => {
  assert.equal(BRAND_AVATAR_PATH, "/images/pet-avatar.png");
  assert.ok(
    existsSync(path.join(root, "public", "images", "pet-avatar.png")),
    "missing public/images/pet-avatar.png",
  );
});

test("app icon.png exists for tab favicon", () => {
  assert.ok(
    existsSync(path.join(root, "src", "app", "icon.png")),
    "missing src/app/icon.png",
  );
});
