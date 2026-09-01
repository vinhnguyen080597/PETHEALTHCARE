import test from "node:test";
import assert from "node:assert/strict";
import {
  canAddFarmReviewPhoto,
  computeFarmReviewPool,
  FARM_REVIEW_MAX_PHOTOS,
  parseSaleReviewQuery,
  validateFarmReviewInput,
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
