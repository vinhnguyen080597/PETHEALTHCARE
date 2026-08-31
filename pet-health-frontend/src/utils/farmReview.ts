/** Farm review helpers — mirrors web `breederFarmReviews.ts`. */

export const FARM_REVIEW_RATING_MIN = 1;
export const FARM_REVIEW_RATING_MAX = 5;
export const FARM_REVIEW_BODY_MAX = 500;

export function normalizeFarmReviewRating(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < FARM_REVIEW_RATING_MIN || rounded > FARM_REVIEW_RATING_MAX) return 0;
  return rounded;
}

export function validateFarmReviewInput(input: {
  rating?: unknown;
  body?: unknown;
}): string | null {
  const rating = normalizeFarmReviewRating(input.rating);
  if (!rating) return 'Rating must be between 1 and 5';
  const body = String(input.body ?? '').trim();
  if (body.length > FARM_REVIEW_BODY_MAX) return 'Review is too long';
  return null;
}

export function computeFarmReviewPool(
  reviews: Array<{ kind?: string; rating?: unknown; reviewer_user_id?: string }>,
): { review_avg: number; review_count: number; pool: number[] } {
  const pool: number[] = [];
  const directByUser = new Map<string, number[]>();
  for (const row of reviews) {
    const kind = String(row.kind || '').trim().toLowerCase();
    const rating = normalizeFarmReviewRating(row.rating);
    if (!rating) continue;
    if (kind === 'primary' || kind === 'supplement') {
      const userId = String(row.reviewer_user_id || '').trim();
      if (!userId) continue;
      const list = directByUser.get(userId) ?? [];
      list.push(rating);
      directByUser.set(userId, list);
      continue;
    }
    if (kind === 'sale') pool.push(rating, rating);
  }
  for (const ratings of directByUser.values()) {
    if (!ratings.length) continue;
    pool.push(ratings.reduce((a, b) => a + b, 0) / ratings.length);
  }
  if (!pool.length) return { review_avg: 0, review_count: 0, pool: [] };
  const sum = pool.reduce((a, b) => a + b, 0);
  return {
    review_avg: Math.round((sum / pool.length) * 100) / 100,
    review_count: pool.length,
    pool,
  };
}

export function parseSaleReviewFlag(value: string | null | undefined): boolean {
  const v = String(value || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
