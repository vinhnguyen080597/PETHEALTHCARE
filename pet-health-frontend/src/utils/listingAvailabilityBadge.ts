export type ListingAvailabilityBadgeKey = 'available' | 'deposit_hold';

export function listingAvailabilityBadgeKey(
  status: string | null | undefined,
): ListingAvailabilityBadgeKey | null {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'published') return 'available';
  if (s === 'deposit_hold') return 'deposit_hold';
  return null;
}

export function listingAvailabilityBadgeLabelKey(
  badge: ListingAvailabilityBadgeKey | null,
): 'listing.availability.available' | 'listing.availability.depositHold' | null {
  if (badge === 'available') return 'listing.availability.available';
  if (badge === 'deposit_hold') return 'listing.availability.depositHold';
  return null;
}

export type ListingOverlayStatusLabelKey =
  | 'listing.availability.available'
  | 'listing.availability.depositHold'
  | 'petFeed.card.sold';

/** Top-right overlay pill: Có sẵn / Đã cọc / Đã bán only. */
export function listingOverlayStatusLabelKey(input: {
  status?: string | null;
  isSold?: boolean;
  isCancelled?: boolean;
}): ListingOverlayStatusLabelKey | null {
  if (input.isCancelled) return null;
  if (input.isSold) return 'petFeed.card.sold';
  return listingAvailabilityBadgeLabelKey(listingAvailabilityBadgeKey(input.status));
}

export function canShowListingStatusUpdate(input: {
  isOwner: boolean;
  status: string | null | undefined;
}): boolean {
  if (!input.isOwner) return false;
  const s = String(input.status || '').trim().toLowerCase();
  return s === 'published' || s === 'deposit_hold';
}
