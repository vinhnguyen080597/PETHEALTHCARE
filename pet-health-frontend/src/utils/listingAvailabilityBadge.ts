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

export function canShowListingStatusUpdate(input: {
  isOwner: boolean;
  status: string | null | undefined;
}): boolean {
  if (!input.isOwner) return false;
  const s = String(input.status || '').trim().toLowerCase();
  return s === 'published' || s === 'deposit_hold' || s === 'sold';
}
