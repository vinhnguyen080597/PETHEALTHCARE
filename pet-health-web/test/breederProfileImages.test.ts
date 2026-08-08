import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BREEDER_AVATAR_PATH,
  DEFAULT_BREEDER_COVER_PATH,
  coverUrlFromMetadata,
  isBlankImageUrl,
  resolveBreederAvatarUrl,
  resolveBreederCoverUrl,
} from "../src/lib/breederProfileImages";
import { mapApiBreeder } from "../src/lib/mappers";
import type { ApiBreederProfile } from "../src/lib/types";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("resolveBreederAvatarUrl falls back to local default", () => {
  assert.equal(resolveBreederAvatarUrl(undefined, ""), DEFAULT_BREEDER_AVATAR_PATH);
  assert.equal(
    resolveBreederAvatarUrl("https://cdn.example/a.jpg"),
    "https://cdn.example/a.jpg",
  );
});

test("resolveBreederCoverUrl replaces blank and legacy unsplash", () => {
  assert.equal(resolveBreederCoverUrl(undefined), DEFAULT_BREEDER_COVER_PATH);
  assert.equal(
    resolveBreederCoverUrl(
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1600",
    ),
    DEFAULT_BREEDER_COVER_PATH,
  );
  assert.equal(
    resolveBreederCoverUrl("https://cdn.example/cover.jpg"),
    "https://cdn.example/cover.jpg",
  );
});

test("coverUrlFromMetadata reads web and mobile keys", () => {
  assert.equal(
    coverUrlFromMetadata({ coverImageUrl: "https://cdn.example/m.jpg" }),
    "https://cdn.example/m.jpg",
  );
  assert.equal(
    coverUrlFromMetadata({ cover_url: "https://cdn.example/w.jpg" }),
    "https://cdn.example/w.jpg",
  );
});

test("isBlankImageUrl treats svg placeholders as blank", () => {
  assert.equal(isBlankImageUrl("data:image/svg+xml,%3Csvg"), true);
  assert.equal(isBlankImageUrl("https://cdn.example/x.png"), false);
});

test("mapApiBreeder uses local default avatar and cover when missing", () => {
  const profile: ApiBreederProfile = {
    id: "bp-img",
    display_name: "Farm",
    verification_status: "verified",
    metadata: {},
  };
  const mapped = mapApiBreeder(profile, { activeListings: 0 });
  assert.equal(mapped.avatar, DEFAULT_BREEDER_AVATAR_PATH);
  assert.equal(mapped.coverUrl, DEFAULT_BREEDER_COVER_PATH);
});

test("breeder photo i18n keys exist in EN and VI", () => {
  const keys = [
    "breederForm.photos",
    "breederForm.avatar",
    "breederForm.cover",
    "breederForm.changePhoto",
    "farm.owner.photos",
    "farm.owner.editCover",
    "farm.owner.editAvatar",
  ] as const;
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of keys) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
  }
});
