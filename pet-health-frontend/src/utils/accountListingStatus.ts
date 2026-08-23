/** Normalize raw status / accidental i18n keys to a listing status token. */
function normalizeListingStatus(status: string): string {
  let normalized = String(status ?? '').trim().toLowerCase();
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    normalized = parts[parts.length - 1] ?? normalized;
  }
  return normalized;
}

/** Account listing status badge: observable label key for i18n. */
export function accountListingStatusLabelKey(status: string): string {
  const normalized = normalizeListingStatus(status);
  if (
    normalized === 'draft'
    || normalized === 'pending_review'
    || normalized === 'published'
    || normalized === 'archived'
    || normalized === 'sold'
    || normalized === 'cancelled'
    || normalized === 'deposit_hold'
  ) {
    return `petFeed.status.${normalized}`;
  }
  return 'petFeed.status.published';
}

/** Visual tone for listing status chips on Account (web-aligned). */
export function accountListingStatusTone(status: string): 'published' | 'pending' | 'sold' | 'cancelled' | 'neutral' {
  const normalized = normalizeListingStatus(status);
  if (normalized === 'published') return 'published';
  if (normalized === 'pending_review') return 'pending';
  if (normalized === 'sold' || normalized === 'deposit_hold') return 'sold';
  if (normalized === 'cancelled') return 'cancelled';
  return 'neutral';
}
