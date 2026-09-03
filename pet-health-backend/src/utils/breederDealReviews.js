/** Breeder deal review helpers — validation + display. */

export const DEAL_REVIEW_RATING_MIN = 1;
export const DEAL_REVIEW_RATING_MAX = 5;
export const DEAL_REVIEW_BODY_MAX = 500;

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeDealReviewRating(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < DEAL_REVIEW_RATING_MIN || rounded > DEAL_REVIEW_RATING_MAX) return 0;
  return rounded;
}

export function validateDealReviewInput(payload = {}) {
  const rating = normalizeDealReviewRating(payload.rating);
  const body = trimText(payload.body ?? payload.comment ?? payload.note, DEAL_REVIEW_BODY_MAX);
  if (!rating) {
    return { ok: false, code: 'INVALID_REVIEW_RATING', error: 'rating must be between 1 and 5' };
  }
  return { ok: true, rating, body };
}

export function formatReviewAverage(avg, count) {
  const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (c <= 0) return { average: 0, count: 0, label: '' };
  const a = Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0;
  return { average: a, count: c, label: `${a} (${c})` };
}

export function isSenConfirmedDeal(deal) {
  if (!deal || typeof deal !== 'object') return false;
  if (!deal.sen_confirmed_complete_at && !deal.senConfirmedCompleteAt) return false;
  if (deal.completed_by_system === true || deal.completedBySystem === true) return false;
  return true;
}

/** Reviews no longer award transparency points (profile-only score). Kept for API compat. */
export function transparencyPointsForDealReview(_rating) {
  return 0;
}

/**
 * Breeder inbox preview after Sen reviews a completed deal.
 * Keeps under createDealNotification's 220-char body_preview cap.
 */
export function buildDealReviewedNotificationPreview(input = {}) {
  const title = trimText(input.title ?? input.postTitle, 60) || 'tin đăng';
  const rating = normalizeDealReviewRating(input.rating) || 0;
  const body = trimText(input.body ?? input.note ?? input.comment, 100);
  const stars = rating ? `${rating}★` : '★';
  let preview = `Sen đánh giá ${stars} cho "${title}".`;
  if (body) preview += ` "${body}"`;
  return trimText(preview, 220);
}
