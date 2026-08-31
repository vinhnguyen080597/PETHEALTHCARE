/** Farm review helpers — validation, rating pool, display. */

export const FARM_REVIEW_RATING_MIN = 1;
export const FARM_REVIEW_RATING_MAX = 5;
export const FARM_REVIEW_BODY_MAX = 500;
export const FARM_REVIEW_MAX_PHOTOS = 5;
export const FARM_REVIEW_KINDS = new Set(['primary', 'supplement', 'sale']);

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeFarmReviewRating(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < FARM_REVIEW_RATING_MIN || rounded > FARM_REVIEW_RATING_MAX) return 0;
  return rounded;
}

export function normalizeFarmReviewPhotoUrls(raw, max = FARM_REVIEW_MAX_PHOTOS) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, max);
}

export function validateFarmReviewInput(payload = {}) {
  const rating = normalizeFarmReviewRating(payload.rating);
  const body = trimText(payload.body ?? payload.comment ?? payload.note, FARM_REVIEW_BODY_MAX);
  const photoUrls = normalizeFarmReviewPhotoUrls(
    payload.photoUrls ?? payload.photo_urls ?? payload.photos,
  );
  if (!rating) {
    return { ok: false, code: 'INVALID_REVIEW_RATING', error: 'rating must be between 1 and 5' };
  }
  return { ok: true, rating, body, photoUrls };
}

/**
 * Rating pool: each user's direct reviews (primary+supplement) → one bundle average;
 * each sale review → rating counted twice.
 */
export function computeFarmReviewPool(reviews) {
  const rows = Array.isArray(reviews) ? reviews : [];
  const pool = [];
  const directByUser = new Map();

  for (const row of rows) {
    const kind = String(row.kind || '').trim().toLowerCase();
    const rating = normalizeFarmReviewRating(row.rating);
    if (!rating) continue;
    if (kind === 'primary' || kind === 'supplement') {
      const userId = String(row.reviewer_user_id || row.reviewerUserId || '').trim();
      if (!userId) continue;
      const list = directByUser.get(userId) ?? [];
      list.push(rating);
      directByUser.set(userId, list);
      continue;
    }
    if (kind === 'sale') {
      pool.push(rating, rating);
    }
  }

  for (const ratings of directByUser.values()) {
    if (ratings.length === 0) continue;
    const sum = ratings.reduce((a, b) => a + b, 0);
    pool.push(sum / ratings.length);
  }

  if (pool.length === 0) {
    return { review_avg: 0, review_count: 0, pool: [] };
  }
  const sum = pool.reduce((a, b) => a + b, 0);
  return {
    review_avg: Math.round((sum / pool.length) * 100) / 100,
    review_count: pool.length,
    pool,
  };
}

/** Five-star direct reviews only (not sale-doubled) for transparency points. */
export function countFiveStarDirectReviews(reviews) {
  const rows = Array.isArray(reviews) ? reviews : [];
  let count = 0;
  for (const row of rows) {
    const kind = String(row.kind || '').trim().toLowerCase();
    if (kind !== 'primary' && kind !== 'supplement') continue;
    if (normalizeFarmReviewRating(row.rating) === 5) count += 1;
  }
  return count;
}

export function transparencyPointsForFarmReview(rating) {
  return normalizeFarmReviewRating(rating) === 5 ? 2 : 0;
}

export function buildFarmSaleReviewRequestPreview(input = {}) {
  const farmName = trimText(input.farmName ?? input.breederName, 60) || 'Trại';
  const title = trimText(input.title ?? input.postTitle, 60) || 'bé';
  return trimText(
    `${farmName} đã xác nhận bạn đã đón bé "${title}". Vui lòng đánh giá trải nghiệm.`,
    220,
  );
}

export function buildFarmReviewedNotificationPreview(input = {}) {
  const farmName = trimText(input.farmName ?? input.breederName, 60) || 'Trại';
  const rating = normalizeFarmReviewRating(input.rating) || 0;
  const body = trimText(input.body ?? input.note, 80);
  const points = transparencyPointsForFarmReview(rating);
  let preview = `Sen đánh giá ${rating}★ cho ${farmName}.`;
  if (points > 0) preview += ` +${points} điểm minh bạch.`;
  if (body) preview += ` "${body}"`;
  return trimText(preview, 220);
}
