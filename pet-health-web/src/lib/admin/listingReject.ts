/** Pure helpers for admin listing rejection (pending_review → archived). */

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
    String(nextStatus || "").toLowerCase() === "archived" &&
    String(beforeStatus || "").toLowerCase() === "pending_review"
  );
}

export function listingRejectReasonMissing(
  beforeStatus: string | null | undefined,
  nextStatus: string | null | undefined,
  reason: string | null | undefined,
): boolean {
  if (!listingRejectRequiresReason(beforeStatus, nextStatus)) return false;
  return !String(reason || "").trim();
}

export function buildListingStatusBody(
  status: string,
  extras?: ListingRejectExtras,
): Record<string, string> {
  const body: Record<string, string> = { status };
  const reason = extras?.rejectionReason?.trim();
  if (reason) body.rejectionReason = reason;
  const action = extras?.adminAction?.trim();
  if (action) body.adminAction = action;
  const note = extras?.adminNote?.trim();
  if (note) body.adminNote = note;
  return body;
}
