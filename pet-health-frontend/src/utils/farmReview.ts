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

export type FarmReviewValidationError =
  | 'invalid_rating'
  | 'body_too_long'
  | 'too_many_photos';

export function farmReviewValidationError(input: {
  rating?: unknown;
  body?: unknown;
  photoUrls?: unknown;
}): FarmReviewValidationError | null {
  const rating = normalizeFarmReviewRating(input.rating);
  if (!rating) return 'invalid_rating';
  const body = String(input.body ?? '').trim();
  if (body.length > FARM_REVIEW_BODY_MAX) return 'body_too_long';
  const photos = normalizeFarmReviewPhotoUrls(input.photoUrls);
  if (photos.length > FARM_REVIEW_MAX_PHOTOS) return 'too_many_photos';
  return null;
}

export function validateFarmReviewInput(input: {
  rating?: unknown;
  body?: unknown;
  photoUrls?: unknown;
}): string | null {
  const code = farmReviewValidationError(input);
  if (!code) return null;
  if (code === 'invalid_rating') return 'Rating must be between 1 and 5';
  if (code === 'body_too_long') return 'Review is too long';
  return 'Too many photos';
}

export function formatBreederReviewLabel(
  avg: number,
  count: number,
  lang: 'vi' | 'en' = 'vi',
): string {
  const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (c <= 0) return '';
  const a = Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0;
  return lang === 'en'
    ? `★ ${a} (${c} review${c === 1 ? '' : 's'})`
    : `★ ${a} (${c} đánh giá)`;
}

export type FarmReviewStatus = 'pending' | 'approved' | 'rejected';

export function normalizeFarmReviewStatus(value: unknown): FarmReviewStatus {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'approved' || status === 'rejected') return status;
  return 'pending';
}

export function isFarmReviewApproved(row: { status?: unknown }): boolean {
  return normalizeFarmReviewStatus(row?.status) === 'approved';
}

export function filterApprovedFarmReviews<T extends { status?: unknown }>(reviews: T[]): T[] {
  return reviews.filter((row) => isFarmReviewApproved(row));
}

export function computeFarmReviewPool(
  reviews: Array<{ kind?: string; rating?: unknown; reviewer_user_id?: string; status?: unknown }>,
): { review_avg: number; review_count: number; pool: number[] } {
  const pool: number[] = [];
  const directByUser = new Map<string, number[]>();
  for (const row of filterApprovedFarmReviews(reviews)) {
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

export function isSaleFarmReviewKind(kind: unknown): boolean {
  return String(kind || '').trim().toLowerCase() === 'sale';
}

export type FarmReviewThreadPreview = {
  id: string;
  kind?: 'primary' | 'supplement' | 'sale';
  postId?: string | null;
  rating: number;
  body: string;
  photoUrls: string[];
  status?: FarmReviewStatus;
  reviewerDisplayName?: string;
  reviewerAvatarUrl?: string | null;
  supplements: Array<{
    id: string;
    rating: number;
    body: string;
    photoUrls: string[];
    status?: FarmReviewStatus;
    reviewerDisplayName?: string;
    reviewerAvatarUrl?: string | null;
  }>;
};

export function farmReviewAuthorLabel(name: string | null | undefined, fallback: string): string {
  const trimmed = String(name ?? '').trim();
  return trimmed || fallback;
}

export function farmReviewStarCount(rating: unknown): number {
  return normalizeFarmReviewRating(rating);
}

export function filterApprovedFarmReviewThreads<
  T extends { status?: unknown; supplements?: Array<{ status?: unknown }> },
>(threads: T[]): T[] {
  return threads
    .filter((row) => isFarmReviewApproved(row))
    .map((row) => ({
      ...row,
      supplements: Array.isArray(row.supplements)
        ? row.supplements.filter((item) => isFarmReviewApproved(item))
        : [],
    }));
}

export function mapFarmReviewThreads(threads: unknown): FarmReviewThreadPreview[] {
  if (!Array.isArray(threads)) return [];
  const result: FarmReviewThreadPreview[] = [];
  for (const row of threads) {
    const primary = row as {
      id?: string;
      kind?: string;
      post_id?: string | null;
      rating?: number;
      body?: string;
      status?: string;
      photo_urls?: unknown;
      photoUrls?: unknown;
      reviewer_display_name?: string;
      reviewer_avatar_url?: string | null;
      supplements?: Array<{
        id?: string;
        rating?: number;
        body?: string;
        status?: string;
        photo_urls?: unknown;
        photoUrls?: unknown;
        reviewer_display_name?: string;
        reviewer_avatar_url?: string | null;
      }>;
    };
    const id = String(primary.id || '').trim();
    if (!id) continue;
    const supplements = Array.isArray(primary.supplements)
      ? primary.supplements
          .map((item) => ({
            id: String(item.id || '').trim(),
            rating: Number(item.rating) || 0,
            body: String(item.body || '').trim(),
            photoUrls: normalizeFarmReviewPhotoUrls(item.photo_urls ?? item.photoUrls),
            status: normalizeFarmReviewStatus(item.status),
            reviewerDisplayName: String(item.reviewer_display_name || '').trim(),
            reviewerAvatarUrl:
              typeof item.reviewer_avatar_url === 'string' && item.reviewer_avatar_url.trim()
                ? item.reviewer_avatar_url.trim()
                : null,
          }))
          .filter((item) => item.id && item.rating > 0 && isFarmReviewApproved(item))
      : [];
    const status = normalizeFarmReviewStatus(primary.status);
    if (!isFarmReviewApproved({ status })) continue;
    const rating = Number(primary.rating) || 0;
    if (!rating) continue;
    result.push({
      id,
      kind: String(primary.kind || 'primary').trim().toLowerCase() as FarmReviewThreadPreview['kind'],
      postId: primary.post_id ?? null,
      rating,
      body: String(primary.body || '').trim(),
      photoUrls: normalizeFarmReviewPhotoUrls(primary.photo_urls ?? primary.photoUrls),
      status,
      reviewerDisplayName: String(primary.reviewer_display_name || '').trim(),
      reviewerAvatarUrl:
        typeof primary.reviewer_avatar_url === 'string' && primary.reviewer_avatar_url.trim()
          ? primary.reviewer_avatar_url.trim()
          : null,
      supplements,
    });
  }
  return result;
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

export function farmReviewedNotificationReviewId(item: {
  metadata?: { review_id?: string | null } | null;
}): string | null {
  const id =
    typeof item.metadata?.review_id === 'string' ? item.metadata.review_id.trim() : '';
  return id || null;
}

/** Collapse long supplement threads on farm review cards. */
export const FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE = 1;
export const FARM_REVIEW_SUPPLEMENTS_TOGGLE_MIN = 2;

export function farmReviewSupplementsCollapsible(count: number): boolean {
  return count >= FARM_REVIEW_SUPPLEMENTS_TOGGLE_MIN;
}

export function farmReviewSupplementsToShow<T>(supplements: T[], expanded: boolean): T[] {
  if (!farmReviewSupplementsCollapsible(supplements.length) || expanded) return supplements;
  return supplements.slice(0, FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE);
}

export function farmReviewSupplementsHiddenCount(supplements: unknown[], expanded: boolean): number {
  if (!farmReviewSupplementsCollapsible(supplements.length) || expanded) return 0;
  return Math.max(0, supplements.length - FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE);
}
