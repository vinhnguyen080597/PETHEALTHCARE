import test from "node:test";
import assert from "node:assert/strict";
import {
  FarmReviewMediaUploadError,
  farmReviewMediaUploadErrorKey,
  farmReviewUploadPercent,
} from "../src/lib/uploadFarmReviewMedia";
import { farmReviewUploadProgressLabel } from "../src/lib/farmReviewUploadProgress";

test("farmReviewUploadPercent clamps to 0-100", () => {
  assert.equal(farmReviewUploadPercent(0, 3), 0);
  assert.equal(farmReviewUploadPercent(1, 3), 33);
  assert.equal(farmReviewUploadPercent(3, 3), 100);
  assert.equal(farmReviewUploadPercent(0, 0), 100);
});

test("farmReviewMediaUploadErrorKey maps payload-too-large errors", () => {
  assert.equal(
    farmReviewMediaUploadErrorKey({ status: 413 }),
    "farm.review.photosTooLarge",
  );
  assert.equal(
    farmReviewMediaUploadErrorKey({ code: "FUNCTION_PAYLOAD_TOO_LARGE" }),
    "farm.review.photosTooLarge",
  );
  assert.equal(
    farmReviewMediaUploadErrorKey({ code: "PET_FEED_PHOTO_TOO_LARGE" }),
    "farm.review.photosTooLarge",
  );
  assert.equal(farmReviewMediaUploadErrorKey({ status: 500 }), null);
});

test("FarmReviewMediaUploadError carries status and code", () => {
  const err = new FarmReviewMediaUploadError("too big", 413, "FUNCTION_PAYLOAD_TOO_LARGE");
  assert.equal(err.status, 413);
  assert.equal(err.code, "FUNCTION_PAYLOAD_TOO_LARGE");
});

test("farmReviewUploadProgressLabel includes percent and phase", () => {
  const translate = (_lang: "en" | "vi", key: string) => key;
  assert.match(
    farmReviewUploadProgressLabel(
      "en",
      { phase: "uploading_photo", completedSteps: 0, totalSteps: 3, current: 1, total: 2 },
      translate,
    ),
    /farm\.review\.uploadingPhoto \(0%\)/,
  );
  assert.match(
    farmReviewUploadProgressLabel(
      "en",
      { phase: "submitting", completedSteps: 2, totalSteps: 3 },
      translate,
    ),
    /farm\.review\.submittingReview \(67%\)/,
  );
});
