import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  canDownloadPostMedia,
  listingMediaDownloadFallback,
  mediaDownloadFileName,
  shouldBlockMediaSave,
} from "../src/lib/mediaDownload";

test("only admin can download post media", () => {
  assert.equal(canDownloadPostMedia(true), true);
  assert.equal(canDownloadPostMedia(false), false);
  assert.equal(shouldBlockMediaSave(false), true);
  assert.equal(shouldBlockMediaSave(true), false);
});

test("mediaDownloadFileName prefers URL basename", () => {
  assert.equal(
    mediaDownloadFileName("https://cdn.example.com/pet-feed/photos/abc.jpg"),
    "abc.jpg",
  );
  assert.match(
    listingMediaDownloadFallback("p1", "video", 0),
    /pet-marketplace-p1-video-1\.mp4/,
  );
});

test("admin media download i18n keys exist EN/VI", () => {
  assert.ok(en["detail.downloadMedia"]);
  assert.ok(vi["detail.downloadMedia"]);
  assert.ok(en["detail.downloadMediaHint"]);
  assert.ok(vi["detail.downloadMediaHint"]);
});
