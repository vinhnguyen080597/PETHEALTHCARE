/** Thumbnail badge for published / deposit_hold listings. */

export type ListingAvailabilityBadgeKey = "available" | "deposit_hold";

export function listingAvailabilityBadgeKey(
  status: string | null | undefined,
): ListingAvailabilityBadgeKey | null {
  const s = String(status || "").trim().toLowerCase();
  if (s === "published") return "available";
  if (s === "deposit_hold") return "deposit_hold";
  return null;
}

export function listingAvailabilityBadgeI18nKey(
  badge: ListingAvailabilityBadgeKey | null,
): "listing.availability.available" | "listing.availability.depositHold" | null {
  if (badge === "available") return "listing.availability.available";
  if (badge === "deposit_hold") return "listing.availability.depositHold";
  return null;
}

export type ListingStatusChoice = "published" | "deposit_hold" | "sold";
export type SaleChannelChoice = "on_platform" | "off_platform";

export const LISTING_STATUS_CHOICES: ListingStatusChoice[] = [
  "published",
  "deposit_hold",
  "sold",
];

export function listingStatusChoiceI18nKey(
  status: ListingStatusChoice,
): `listing.statusChoice.${ListingStatusChoice}` {
  return `listing.statusChoice.${status}`;
}

export function validateListingStatusPayload(input: {
  status?: unknown;
  saleChannel?: unknown;
}): string | null {
  const status = String(input.status || "").trim().toLowerCase();
  if (!LISTING_STATUS_CHOICES.includes(status as ListingStatusChoice)) {
    return "Invalid status";
  }
  if (status === "sold") {
    const channel = String(input.saleChannel || "").trim().toLowerCase();
    if (channel !== "on_platform" && channel !== "off_platform") {
      return "Sale channel is required";
    }
  }
  return null;
}
