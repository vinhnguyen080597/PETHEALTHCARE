import type { PetFeedNotification } from "../api/petFeed";
import {
  adminRequestHref,
  breederTransparencyNotificationHref,
  farmSaleReviewNotificationHref,
  farmReviewedNotificationHref,
  isAdminQueueNotification,
  isNotificationUnread,
  listingNotificationHref,
  notificationType,
} from "./deepLinks";

const REJECTION_TYPES = new Set([
  "breeder_rejected",
  "listing_rejected",
  "breeder_detail_rejected",
  "farm_review_rejected",
]);

export function isRejectionReasonNotification(
  item: PetFeedNotification | string | null | undefined,
): boolean {
  const type =
    typeof item === "string" || !item
      ? String(item || "")
      : notificationType(item);
  return REJECTION_TYPES.has(type);
}

/** Shared open behavior for full page + header popover. */
export async function openPetFeedNotification(opts: {
  item: PetFeedNotification;
  allItems: PetFeedNotification[];
  markIdsRead: (ids: string[]) => Promise<void>;
  navigate: (href: string) => void;
  onRejection: (item: PetFeedNotification) => void;
}): Promise<void> {
  const { item, allItems, markIdsRead, navigate, onRejection } = opts;
  const type = notificationType(item);

  if (isNotificationUnread(item)) {
    await markIdsRead([item.id]);
  }

  if (isAdminQueueNotification(item)) {
    navigate(adminRequestHref(item));
    return;
  }
  if (isRejectionReasonNotification(item)) {
    onRejection(item);
    return;
  }

  const farmHref = breederTransparencyNotificationHref(item);
  if (farmHref) {
    navigate(farmHref);
    return;
  }
  const farmReviewedHref = farmReviewedNotificationHref(item);
  if (farmReviewedHref) {
    navigate(farmReviewedHref);
    return;
  }
  if (item.post_id) {
    const unreadIds = allItems
      .filter(
        (n) =>
          isNotificationUnread(n) &&
          n.post_id === item.post_id &&
          n.id !== item.id,
      )
      .map((n) => n.id);
    if (unreadIds.length) await markIdsRead(unreadIds);
    navigate(
      farmSaleReviewNotificationHref(item) ||
        listingNotificationHref(item) ||
        `/app/pet-feed/posts/${encodeURIComponent(item.post_id)}`,
    );
    return;
  }

  // Fallback: types without a deep link stay on the list (e.g. rare legacy).
  void type;
}
