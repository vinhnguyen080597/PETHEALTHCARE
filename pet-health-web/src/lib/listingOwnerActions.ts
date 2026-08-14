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

/**
 * Share sits beside Delete (owner) or Report (visitor).
 * Update-details stays on its own row above when shown.
 */
export function listingDetailShareActionsCols(input: {
  showDelete: boolean;
  showReport: boolean;
}): 1 | 2 {
  return input.showDelete || input.showReport ? 2 : 1;
}

const DEAL_STATUSES_BLOCKING_NEW_DEPOSIT = new Set([
  "pending_sen",
  "deposit_hold",
  "pending_cancel_confirm",
  "pending_sen_complete",
  "pending_complete",
  "dispute_open",
]);

/** Soft-deposit CTA — Sen (visitor) on an open listing, not the breeder. */
export function canShowDepositRequest(input: {
  isOwner?: boolean;
  status: string | null | undefined;
  dealStatus?: string | null;
}): boolean {
  if (input.isOwner) return false;
  if (!isListingAvailableStatus(input.status)) return false;
  const deal = String(input.dealStatus || "")
    .trim()
    .toLowerCase();
  if (DEAL_STATUSES_BLOCKING_NEW_DEPOSIT.has(deal)) return false;
  return true;
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

export type ListingDetailFrom = "account";
export type ListingDealAction =
  | "confirm-cancel"
  | "confirm-deposit"
  | "confirm-receipt";

/** Public listing detail URL; pass `from=account` when opened from My listings. */
export function listingDetailHref(
  postId: string,
  options?: {
    from?: ListingDetailFrom | null;
    dealAction?: ListingDealAction | null;
  },
): string {
  const id = String(postId || "").trim();
  const base = `/app/pet-feed/posts/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (options?.from === "account") params.set("from", "account");
  if (options?.dealAction) params.set("dealAction", options.dealAction);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseListingDetailFrom(
  value: string | null | undefined,
): ListingDetailFrom | null {
  return value === "account" ? "account" : null;
}

/** Back target for listing detail (Account vs New Pets). */
export function listingDetailBackHref(
  from?: ListingDetailFrom | string | null,
): string {
  return parseListingDetailFrom(from) === "account"
    ? "/app/account"
    : "/app/pet-feed";
}

/** Pending listings are not public — open owner review popup instead of detail. */
export function opensMyListingReviewPopup(
  status: string | null | undefined,
): boolean {
  return String(status || "").trim().toLowerCase() === "pending_review";
}
