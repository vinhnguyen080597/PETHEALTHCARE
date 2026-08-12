/** Sen deal reviews — shared validation + display helpers. */

export const DEAL_REVIEW_RATING_MIN = 1;
export const DEAL_REVIEW_RATING_MAX = 5;

export type BreederDealReview = {
  id: string;
  post_id: string;
  sen_user_id: string;
  breeder_profile_id: string;
  rating: number;
  body?: string;
  created_at?: string;
};

export type BreederDealReviewAggregate = {
  review_count: number;
  review_avg: number;
  five_star_review_count: number;
  sen_confirmed_completions: number;
  reviews?: BreederDealReview[];
};

export function normalizeDealReviewRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < DEAL_REVIEW_RATING_MIN || rounded > DEAL_REVIEW_RATING_MAX) return 0;
  return rounded;
}

export function validateDealReviewInput(input: {
  rating?: unknown;
  body?: unknown;
}): string | null {
  const rating = normalizeDealReviewRating(input.rating);
  if (!rating) return "Rating must be between 1 and 5";
  const body = String(input.body ?? "").trim();
  if (body.length > 500) return "Review is too long";
  return null;
}

export function formatBreederReviewLabel(
  avg: number,
  count: number,
  lang: "VI" | "EN" = "VI",
): string {
  const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (c <= 0) return "";
  const a = Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0;
  return lang === "EN"
    ? `★ ${a} (${c} review${c === 1 ? "" : "s"})`
    : `★ ${a} (${c} đánh giá)`;
}

export function parseReviewStatsFromMeta(meta: Record<string, unknown>): {
  reviewAverage: number;
  reviewCount: number;
  fiveStarReviewCount: number;
  senConfirmedCompletions: number;
} {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    reviewAverage: num(meta.review_avg ?? meta.reviewAverage),
    reviewCount: Math.floor(num(meta.review_count ?? meta.reviewCount)),
    fiveStarReviewCount: Math.floor(
      num(meta.five_star_review_count ?? meta.review_5star_count),
    ),
    senConfirmedCompletions: Math.floor(
      num(meta.sen_confirmed_completions ?? meta.senConfirmedCompletions),
    ),
  };
}
