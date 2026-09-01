/** Farm review helpers — mirrors web `breederFarmReviews.ts`. */

export const FARM_REVIEW_RATING_MIN = 1;
export const FARM_REVIEW_RATING_MAX = 5;
export const FARM_REVIEW_BODY_MAX = 500;
export const FARM_REVIEW_MAX_PHOTOS = 5;

export function normalizeFarmReviewPhotoUrls(
  raw: unknown,
  max = FARM_REVIEW_MAX_PHOTOS,
): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, max);
}

export function canAddFarmReviewPhoto(currentCount: number, max = FARM_REVIEW_MAX_PHOTOS): boolean {
  return currentCount < max;
}

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
  photoUrls?: unknown;
}): string | null {
  const rating = normalizeFarmReviewRating(input.rating);
  if (!rating) return 'Rating must be between 1 and 5';
  const body = String(input.body ?? '').trim();
  if (body.length > FARM_REVIEW_BODY_MAX) return 'Review is too long';
  const photos = normalizeFarmReviewPhotoUrls(input.photoUrls);
  if (photos.length > FARM_REVIEW_MAX_PHOTOS) return 'Too many photos';
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

export type FarmReviewThreadPreview = {
  id: string;
  rating: number;
  body: string;
  supplements: Array<{ id: string; rating: number; body: string }>;
};

export function mapFarmReviewThreads(threads: unknown): FarmReviewThreadPreview[] {
  if (!Array.isArray(threads)) return [];
  return threads
    .map((row) => {
      const primary = row as {
        id?: string;
        rating?: number;
        body?: string;
        supplements?: Array<{ id?: string; rating?: number; body?: string }>;
      };
      const id = String(primary.id || '').trim();
      if (!id) return null;
      const supplements = Array.isArray(primary.supplements)
        ? primary.supplements
            .map((item) => ({
              id: String(item.id || '').trim(),
              rating: Number(item.rating) || 0,
              body: String(item.body || '').trim(),
            }))
            .filter((item) => item.id && item.rating > 0)
        : [];
      return {
        id,
        rating: Number(primary.rating) || 0,
        body: String(primary.body || '').trim(),
        supplements,
      };
    })
    .filter((row): row is FarmReviewThreadPreview => Boolean(row?.id && row.rating > 0));
}

export function farmReviewedBreederProfileId(item: {
  type?: string | null;
  breeder_profile_id?: string | null;
  metadata?: { breeder_profile_id?: string | null } | null;
}): string | null {
  if (String(item.type || '').trim() !== 'farm_reviewed') return null;
  const top = String(item.breeder_profile_id || '').trim();
  if (top) return top;
  const meta =
    typeof item.metadata?.breeder_profile_id === 'string'
      ? item.metadata.breeder_profile_id.trim()
      : '';
  return meta || null;
}
