import test from "node:test";
import assert from "node:assert/strict";
import {
  canAddFarmReviewPhoto,
  computeFarmReviewPool,
  farmReviewThreadDisplayCount,
  FARM_REVIEW_MAX_PHOTOS,
  farmReviewedNotificationReviewId,
  mapFarmReviewThreads,
  parseFarmReviewFocusId,
  parseFarmReviewScrollQuery,
  parseSaleReviewQuery,
  countFarmReviewDisplayThreads,
  validateFarmReviewInput,
  withFarmReviewNotificationParams,
} from "../src/lib/breederFarmReviews.ts";

test("computeFarmReviewPool: users B/C bundles + user D sale x2 → 4.75", () => {
  const reviews = [
    { kind: "primary", reviewer_user_id: "user-b", rating: 5, status: "approved" },
    { kind: "supplement", reviewer_user_id: "user-b", rating: 4, status: "approved" },
    { kind: "primary", reviewer_user_id: "user-c", rating: 5, status: "approved" },
    { kind: "supplement", reviewer_user_id: "user-c", rating: 4, status: "approved" },
    { kind: "sale", reviewer_user_id: "user-d", rating: 5, post_id: "post-1", status: "approved" },
  ];
  const result = computeFarmReviewPool(reviews);
  assert.equal(result.review_count, 4);
  assert.equal(result.review_avg, 4.75);
});

test("parseSaleReviewQuery", () => {
  assert.equal(parseSaleReviewQuery("1"), true);
  assert.equal(parseSaleReviewQuery(null), false);
});

test("farm review notification query helpers", () => {
  assert.equal(parseFarmReviewScrollQuery("true"), true);
  assert.equal(parseFarmReviewFocusId(" rev-1 "), "rev-1");
  assert.equal(farmReviewedNotificationReviewId({ metadata: { review_id: "r9" } }), "r9");
  assert.equal(
    withFarmReviewNotificationParams("/app/breeders/farm-9", "rev-1"),
    "/app/breeders/farm-9?reviews=1&focusReview=rev-1",
  );
  assert.equal(
    withFarmReviewNotificationParams("/app/breeders/farm-9?from=account"),
    "/app/breeders/farm-9?from=account&reviews=1",
  );
});

test("computeFarmReviewPool ignores pending reviews", () => {
  const reviews = [
    { kind: "primary", reviewer_user_id: "user-a", rating: 5, status: "approved" },
    { kind: "primary", reviewer_user_id: "user-b", rating: 1, status: "pending" },
  ];
  const result = computeFarmReviewPool(reviews);
  assert.equal(result.review_count, 1);
  assert.equal(result.review_avg, 5);
});

test("validateFarmReviewInput", () => {
  assert.equal(validateFarmReviewInput({ rating: 3 }), null);
  assert.match(validateFarmReviewInput({ rating: 0 }) || "", /1 and 5/);
  assert.equal(canAddFarmReviewPhoto(FARM_REVIEW_MAX_PHOTOS), false);
});

test("mapFarmReviewThreads maps approved threads and drops pending", () => {
  const threads = mapFarmReviewThreads([
    {
      id: "rev-1",
      rating: 4,
      body: "Tuyệt lắm",
      status: "approved",
      reviewer_display_name: "Zhen Long",
      photo_urls: ["https://cdn.test/1.jpg"],
      supplements: [
        {
          id: "sup-1",
          rating: 5,
          body: "Cập nhật",
          status: "approved",
        },
      ],
    },
    {
      id: "rev-2",
      rating: 5,
      status: "pending",
      reviewer_display_name: "Pending User",
    },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0]?.id, "rev-1");
  assert.equal(threads[0]?.supplements.length, 1);
  assert.equal(farmReviewThreadDisplayCount(threads), 1);
});

test("mapFarmReviewThreads skips top-level supplement rows", () => {
  const threads = mapFarmReviewThreads([
    {
      id: "rev-1",
      kind: "primary",
      rating: 5,
      status: "approved",
      reviewer_display_name: "Bảo",
      supplements: [
        { id: "sup-1", kind: "supplement", rating: 5, status: "approved", body: "Cũng tốt" },
      ],
    },
    {
      id: "sup-orphan",
      kind: "supplement",
      rating: 4,
      status: "approved",
      reviewer_display_name: "Bảo",
    },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0]?.id, "rev-1");
  assert.equal(farmReviewThreadDisplayCount(threads), 1);
});

test("countFarmReviewDisplayThreads counts cards not pool weight", () => {
  assert.equal(
    countFarmReviewDisplayThreads([
      { kind: "sale", rating: 4, status: "approved" },
    ]),
    1,
  );
  const pool = computeFarmReviewPool([
    { kind: "sale", reviewer_user_id: "user-a", rating: 4, status: "approved" },
  ]);
  assert.equal(pool.review_count, 2);
});

test("farmReviewThreadDisplayCount matches visible cards not pool weight", () => {
  const pool = computeFarmReviewPool([
    { kind: "sale", reviewer_user_id: "user-a", rating: 4, status: "approved" },
  ]);
  assert.equal(pool.review_count, 2);
  const threads = mapFarmReviewThreads([
    {
      id: "sale-1",
      kind: "sale",
      rating: 4,
      status: "approved",
      reviewer_display_name: "Buyer",
    },
  ]);
  assert.equal(farmReviewThreadDisplayCount(threads), 1);
});
