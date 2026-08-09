/** Owner “My listings” row click: pending posts open review popup (not public detail). */

export function opensMyListingReviewPopup(
  status: string | null | undefined,
): boolean {
  return String(status || '').trim().toLowerCase() === 'pending_review';
}
