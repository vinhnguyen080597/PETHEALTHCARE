import test from "node:test";
import assert from "node:assert/strict";
import {
  DealSubmitError,
  dealPhotoSubmitErrorKey,
  dealSubmitErrorMessage,
  FUNCTION_SAFE_PHOTO_BYTES,
  httpPhotoUrls,
  isFunctionPayloadTooLarge,
  shouldCompressDealPhoto,
} from "../src/lib/dealPhotoUpload";

test("shouldCompressDealPhoto only for oversized or heavy formats", () => {
  assert.equal(
    shouldCompressDealPhoto({ size: 200_000, type: "image/jpeg" }),
    false,
  );
  assert.equal(
    shouldCompressDealPhoto({
      size: FUNCTION_SAFE_PHOTO_BYTES + 1,
      type: "image/jpeg",
    }),
    true,
  );
  assert.equal(
    shouldCompressDealPhoto({ size: 200_000, type: "image/png" }),
    true,
  );
});

test("isFunctionPayloadTooLarge reads 413 and platform codes", () => {
  assert.equal(isFunctionPayloadTooLarge({ status: 413 }), true);
  assert.equal(
    isFunctionPayloadTooLarge({ code: "FUNCTION_PAYLOAD_TOO_LARGE" }),
    true,
  );
  assert.equal(
    isFunctionPayloadTooLarge({ message: "Request Entity Too Large" }),
    true,
  );
  assert.equal(isFunctionPayloadTooLarge({ status: 400, message: "nope" }), false);
  assert.equal(dealPhotoSubmitErrorKey({ status: 413 }), "deal.photosTooLarge");
  assert.equal(dealPhotoSubmitErrorKey({ status: 500 }), null);
});

test("httpPhotoUrls keeps only http(s) strings", () => {
  assert.deepEqual(
    httpPhotoUrls([
      " https://cdn.example/a.jpg ",
      "ftp://bad",
      "/relative",
      12,
      "http://ok/b.png",
    ]),
    ["https://cdn.example/a.jpg", "http://ok/b.png"],
  );
  assert.deepEqual(httpPhotoUrls(null), []);
});

test("dealSubmitErrorMessage maps payload-too-large to i18n key", () => {
  assert.equal(
    dealSubmitErrorMessage(
      new DealSubmitError("Request Entity Too Large", 413, "FUNCTION_PAYLOAD_TOO_LARGE"),
      () => "Ảnh quá lớn",
    ),
    "Ảnh quá lớn",
  );
  assert.equal(
    dealSubmitErrorMessage(new DealSubmitError("Nope", 400), () => "Ảnh quá lớn"),
    "Nope",
  );
});
