export type ListingRejectExtras = {
  rejectionReason?: string;
  adminAction?: string;
  adminNote?: string;
};

export function listingRejectRequiresReason(
  beforeStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  return (
    String(nextStatus || '').toLowerCase() === 'archived' &&
    String(beforeStatus || '').toLowerCase() === 'pending_review'
  );
}

export function listingRejectReasonMissing(
  beforeStatus: string | null | undefined,
  nextStatus: string | null | undefined,
  reason: string | null | undefined,
): boolean {
  if (!listingRejectRequiresReason(beforeStatus, nextStatus)) return false;
  return !String(reason || '').trim();
}
