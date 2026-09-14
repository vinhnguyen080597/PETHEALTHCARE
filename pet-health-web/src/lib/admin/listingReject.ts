/** Pure helpers for admin listing rejection (pending_review → archived). */

export type ListingRejectExtras = {
  rejectionReason?: string;
  adminAction?: string;
  adminNote?: string;
};

const LISTING_STATUS_I18N = [
  "draft",
  "pending_review",
  "published",
  "archived",
  "sold",
  "cancelled",
  "deposit_hold",
  "reserved",
] as const;

export function listingStatusLabelKey(status: string | null | undefined): string {
  const value = String(status || "pending_review").trim().toLowerCase();
  if ((LISTING_STATUS_I18N as readonly string[]).includes(value)) {
    return `listing.status.${value}`;
  }
  return "listing.status.pending_review";
}

export function listingPublicHref(postId: string): string {
  return `/app/pet-feed/posts/${encodeURIComponent(postId)}`;
}

export function listingRejectionReason(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const raw = metadata?.rejection_reason ?? metadata?.rejectionReason;
  return typeof raw === "string" ? raw.trim() : "";
}

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
