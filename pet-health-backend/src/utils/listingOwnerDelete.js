/** Owner delete rules for marketplace listings. */

export const OWNER_DELETE_SOLD_COOLDOWN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseTimeMs(value) {
  if (value == null || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isOwnerDeletedListing(metadata) {
  const meta = asObject(metadata);
  return Boolean(meta.owner_deleted_at || meta.owner_deleted === true);
}

export function listingCompletionAtMs(input = {}) {
  const meta = asObject(input.metadata);
  const deal = asObject(meta.deal);
  const candidates = [
    input.completedAt,
    input.senConfirmedCompleteAt,
    input.autoCompletedAt,
    input.soldAt,
    deal.completed_at,
    deal.completedAt,
    deal.sen_confirmed_complete_at,
    deal.senConfirmedCompleteAt,
    deal.auto_completed_at,
    deal.autoCompletedAt,
    meta.sold_at,
    meta.completed_at,
    input.updatedAt,
    input.createdAt,
  ];
  for (const value of candidates) {
    const ms = parseTimeMs(value);
    if (ms != null) return ms;
  }
  return null;
}

/**
 * @returns {{
 *   allowed: boolean,
 *   reason: 'not_owner' | 'deposit_hold' | 'sold_cooldown' | 'already_deleted' | 'not_allowed' | null,
 *   daysRemaining?: number,
 *   eligibleAt?: string | null,
 * }}
 */
export function evaluateOwnerDeleteListing(input = {}, now = Date.now()) {
  const nowMs = typeof now === 'number' ? now : new Date(now).getTime();
  if (input.isOwner === false) {
    return { allowed: false, reason: 'not_owner' };
  }

  if (input.ownerDeleted === true || isOwnerDeletedListing(input.metadata)) {
    return { allowed: false, reason: 'already_deleted' };
  }

  const status = String(input.status || '').trim().toLowerCase();
  const sold = status === 'sold'
    || Boolean(input.metadataSold)
    || (status === 'archived' && Boolean(input.metadataSold));

  if (status === 'deposit_hold') {
    return { allowed: false, reason: 'deposit_hold' };
  }

  if (sold) {
    const completedMs = listingCompletionAtMs(input) ?? nowMs;
    const eligibleAt = completedMs + OWNER_DELETE_SOLD_COOLDOWN_DAYS * DAY_MS;
    if (nowMs < eligibleAt) {
      return {
        allowed: false,
        reason: 'sold_cooldown',
        daysRemaining: Math.max(1, Math.ceil((eligibleAt - nowMs) / DAY_MS)),
        eligibleAt: new Date(eligibleAt).toISOString(),
      };
    }
    return { allowed: true, reason: null };
  }

  if (status === 'archived') {
    return { allowed: false, reason: 'already_deleted' };
  }

  if (
    status === 'draft'
    || status === 'pending_review'
    || status === 'published'
    || status === ''
  ) {
    return { allowed: true, reason: null };
  }

  return { allowed: false, reason: 'not_allowed' };
}
