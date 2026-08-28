import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  buildListingCreatePayload,
  listingMediaUploadErrorKey,
} from "../src/lib/listingCreate";

test("buildListingCreatePayload matches mobile sequential-upload contract", () => {
  const payload = buildListingCreatePayload({
    title: " Bé mèo ",
    species: "cat",
    breed: "Anh lông ngắn",
    gender: "Đực",
    ageMonths: "2",
    location: "An Giang",
    priceNote: "3.000.000",
    description: "Mô tả",
    vaccineStatus: "Chưa tiêm",
    dewormingStatus: "Đã tẩy gần đây",
    personality: ["Thân thiện"],
    paperwork: ["Sổ tiêm"],
    mediaUrls: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    videoUrl: "https://cdn.example/v.mp4",
    warrantyPolicyId: "wp-1",
    healthEvidenceUrls: ["https://cdn.example/ev.jpg"],
  });

  assert.equal(payload.title, "Bé mèo");
  assert.equal(payload.ageMonths, 2);
  assert.deepEqual(payload.mediaUrls, [
    "https://cdn.example/a.jpg",
    "https://cdn.example/b.jpg",
  ]);
  assert.equal(payload.videoUrl, "https://cdn.example/v.mp4");
  assert.equal(payload.status, "pending_review");
  const metadata = payload.metadata as Record<string, unknown>;
  assert.equal(metadata.warranty_policy_id, "wp-1");
  assert.deepEqual(metadata.health_evidence_urls, ["https://cdn.example/ev.jpg"]);
  assert.equal(metadata.video_poster_url, "https://cdn.example/a.jpg");
});

test("listingMediaUploadErrorKey maps storage limit codes to i18n keys", () => {
  assert.equal(
    listingMediaUploadErrorKey({ code: "PET_FEED_VIDEO_TOO_LARGE" }),
    "listing.new.field.mediaTooLarge",
  );
  assert.equal(
    listingMediaUploadErrorKey({ code: "LISTING_UPLOAD_TOO_LARGE" }),
    "listing.new.field.uploadTooLarge",
  );
  assert.equal(listingMediaUploadErrorKey({ code: "OTHER" }), null);

  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.ok(enDict["listing.new.field.mediaTooLarge"]);
  assert.ok(viDict["listing.new.field.mediaTooLarge"]);
  assert.match(viDict["listing.new.field.mediaTooLarge"], /8MB/);
});
