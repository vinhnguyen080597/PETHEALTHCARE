/** Closed listing outcomes: sold (positive) vs cancelled (negative). */

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function outcomeFromMetadata(metadata) {
  const meta = asObject(metadata);
  const outcome = String(meta.listing_outcome ?? meta.outcome ?? '').trim().toLowerCase();
  if (outcome === 'cancelled' || outcome === 'canceled') return 'cancelled';
  if (outcome === 'sold' || outcome === 'completed' || outcome === 'rehomed') return 'sold';
  if (
    meta.cancelled === true
    || meta.cancelled === 1
    || meta.cancelled === 'true'
    || meta.cancelled === '1'
  ) {
    return 'cancelled';
  }
  if (
    meta.sold === true
    || meta.completed === true
    || meta.rehomed === true
    || meta.sold === 1
    || meta.sold === 'true'
    || meta.sold === '1'
  ) {
    return 'sold';
  }
  return null;
}

export function isSoldListingMetadata(metadata) {
  return outcomeFromMetadata(metadata) === 'sold';
}

export function isCancelledListingMetadata(metadata) {
  return outcomeFromMetadata(metadata) === 'cancelled';
}

/** @returns {'sold' | 'cancelled' | null} */
export function resolveListingCloseOutcome(status, metadata) {
  const raw = String(status ?? '').trim().toLowerCase();
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
  if (raw === 'sold') return 'sold';
  const soft = String(asObject(metadata).soft_status ?? '').trim().toLowerCase();
  if (soft === 'cancelled' || soft === 'canceled') return 'cancelled';
  if (soft === 'sold') return 'sold';
  return outcomeFromMetadata(metadata);
}

/** Future trust scoring: sold adds, cancelled subtracts. */
export function listingTrustOutcome(status, metadata) {
  const close = resolveListingCloseOutcome(status, metadata);
  if (close === 'sold') return 'positive';
  if (close === 'cancelled') return 'negative';
  return null;
}
