import test from "node:test";
import assert from "node:assert/strict";
import { buildListingGalleryItems } from "../src/lib/listingGallery";

test("buildListingGalleryItems appends video after photos", () => {
  const items = buildListingGalleryItems({
    mediaUrls: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    videoUrl: "https://cdn.example/clip.mp4",
  });
  assert.deepEqual(items, [
    { type: "image", url: "https://cdn.example/a.jpg" },
    { type: "image", url: "https://cdn.example/b.jpg" },
    { type: "video", url: "https://cdn.example/clip.mp4" },
  ]);
});

test("buildListingGalleryItems supports video-only and placeholder", () => {
  assert.deepEqual(
    buildListingGalleryItems({
      mediaUrls: [],
      videoUrl: "https://cdn.example/clip.mp4",
    }),
    [{ type: "video", url: "https://cdn.example/clip.mp4" }],
  );
  assert.deepEqual(
    buildListingGalleryItems({
      mediaUrls: [],
      placeholder: "https://cdn.example/ph.jpg",
    }),
    [{ type: "image", url: "https://cdn.example/ph.jpg" }],
  );
});
