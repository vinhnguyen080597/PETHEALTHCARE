import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBreederReviewLabel,
  normalizeDealReviewRating,
  parseReviewStatsFromMeta,
  validateDealReviewInput,
} from "../src/lib/breederDealReviews.ts";

test("normalizeDealReviewRating accepts 1-5 only", () => {
  assert.equal(normalizeDealReviewRating(5), 5);
  assert.equal(normalizeDealReviewRating(0), 0);
  assert.equal(normalizeDealReviewRating("4"), 4);
});

test("validateDealReviewInput", () => {
  assert.equal(validateDealReviewInput({ rating: 3 }), null);
  assert.match(validateDealReviewInput({ rating: 0 }) || "", /1 and 5/);
});

test("formatBreederReviewLabel hides when count is zero", () => {
  assert.equal(formatBreederReviewLabel(4.8, 0, "VI"), "");
  assert.equal(formatBreederReviewLabel(4.8, 12, "VI"), "★ 4.8 (12 đánh giá)");
});

test("parseReviewStatsFromMeta", () => {
  const stats = parseReviewStatsFromMeta({
    review_avg: 4.5,
    review_count: 8,
    five_star_review_count: 3,
    sen_confirmed_completions: 5,
  });
  assert.equal(stats.reviewAverage, 4.5);
  assert.equal(stats.reviewCount, 8);
  assert.equal(stats.fiveStarReviewCount, 3);
  assert.equal(stats.senConfirmedCompletions, 5);
});
