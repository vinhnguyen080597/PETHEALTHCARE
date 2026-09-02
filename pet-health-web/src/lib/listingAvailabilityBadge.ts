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

export type ListingOverlayStatusLabelKey =
  | "listing.availability.available"
  | "listing.availability.depositHold"
  | "feed.card.sold";

/** Top-right overlay pill: Có sẵn / Đã cọc / Đã bán only (mobile parity). */
export function listingOverlayStatusLabelKey(input: {
  status?: string | null;
  isSold?: boolean;
  isCancelled?: boolean;
}): ListingOverlayStatusLabelKey | null {
  if (input.isCancelled) return null;
  if (input.isSold) return "feed.card.sold";
  return listingAvailabilityBadgeI18nKey(
    listingAvailabilityBadgeKey(input.status),
  );
}

export function listingOverlayStatusPillClass(
  labelKey: ListingOverlayStatusLabelKey,
): string {
  const base =
    "absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm pointer-events-none";
  if (labelKey === "feed.card.sold") return `${base} bg-slate-900/85`;
  if (labelKey === "listing.availability.available") {
    return `${base} bg-emerald-600/95`;
  }
  return `${base} bg-[#D97706]/95`;
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
