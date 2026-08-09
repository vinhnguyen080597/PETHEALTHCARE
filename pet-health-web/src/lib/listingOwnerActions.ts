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
