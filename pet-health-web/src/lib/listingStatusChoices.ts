export const LISTING_STATUS_CHOICES = [
  "published",
  "deposit_hold",
  "sold",
] as const;

export type ListingStatusChoice = (typeof LISTING_STATUS_CHOICES)[number];

export function normalizeListingStatusChoice(
  status: string | null | undefined,
): ListingStatusChoice | null {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "published" || value === "deposit_hold" || value === "sold") {
    return value;
  }
  return null;
}

/** Status options for the update modal — excludes the listing's current status. */
export function listingStatusChoicesExcludingCurrent(
  currentStatus: string | null | undefined,
): ListingStatusChoice[] {
  const current = normalizeListingStatusChoice(currentStatus);
  return LISTING_STATUS_CHOICES.filter((choice) => choice !== current);
}
