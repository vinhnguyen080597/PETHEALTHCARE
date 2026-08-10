/** Visitor actions on a listing detail page (not for the post owner). */

export function isListingOwner(
  currentUserId: string | null | undefined,
  ownerUserId: string | null | undefined,
): boolean {
  const current = String(currentUserId || "").trim();
  const owner = String(ownerUserId || "").trim();
  return Boolean(current && owner && current === owner);
}

export function listingVisitorActions(isOwner: boolean): {
  showMessage: boolean;
  showReport: boolean;
} {
  return {
    showMessage: !isOwner,
    showReport: !isOwner,
  };
}

/** Soft-deposit CTA on any published listing (warranty optional). */
export function canShowDepositRequest(input: {
  status: string | null | undefined;
}): boolean {
  return isListingAvailableStatus(input.status);
}

/**
 * "Available" for owner edits = published / for sale (not deposit hold, sold, etc.).
 */
export function isListingAvailableStatus(
  status: string | null | undefined,
): boolean {
  return String(status || "").trim().toLowerCase() === "published";
}

/** Owner may update listing details only while the post is available. */
export function canShowListingUpdateDetails(input: {
  isOwner: boolean;
  status: string | null | undefined;
}): boolean {
  return Boolean(input.isOwner) && isListingAvailableStatus(input.status);
}

/** Warranty attach/update CTA — same availability gate as detail edits. */
export function canShowWarrantyUpdateCta(input: {
  isOwner: boolean;
  status: string | null | undefined;
  frozen?: boolean;
}): boolean {
  if (!input.isOwner || input.frozen) return false;
  return isListingAvailableStatus(input.status);
}

/** Edit listing page for the owner (web). */
export function listingEditHref(postId: string): string {
  const id = String(postId || "").trim();
  return `/app/account/listings/${encodeURIComponent(id)}/edit`;
}

/** Pending listings are not public — open owner review popup instead of detail. */
export function opensMyListingReviewPopup(
  status: string | null | undefined,
): boolean {
  return String(status || "").trim().toLowerCase() === "pending_review";
}
