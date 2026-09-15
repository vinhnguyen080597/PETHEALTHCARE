import type { PetFeedNotification } from "../api/petFeed";
import {
  isAdminQueueNotification,
  isNotificationUnread,
  notificationType,
} from "./deepLinks";

export const NOTIFICATIONS_PAGE_HREF = "/app/notifications";
/** Header popover — keep small; each row is enriched server-side. */
export const NOTIFICATIONS_PREVIEW_LIMIT = 12;
/** Full `/app/notifications` page initial fetch. */
export const NOTIFICATIONS_PAGE_LIMIT = 20;
export const NOTIFICATIONS_PAGE_LOAD_STEP = 20;

export const NOTIFICATION_FILTER_ALL = "all" as const;
export const NOTIFICATION_FILTER_UNREAD = "unread" as const;
export type NotificationFilter =
  | typeof NOTIFICATION_FILTER_ALL
  | typeof NOTIFICATION_FILTER_UNREAD;

const PHC_TOGGLE_NOTIFICATIONS_EVENT = "phc:toggle-notifications";

export function requestToggleNotifications(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PHC_TOGGLE_NOTIFICATIONS_EVENT));
}

export function subscribeToggleNotifications(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(PHC_TOGGLE_NOTIFICATIONS_EVENT, listener);
  return () => window.removeEventListener(PHC_TOGGLE_NOTIFICATIONS_EVENT, listener);
}

export function dispatchNotificationsRead(count: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("phc:notifications-read", {
      detail: { count: Math.max(0, count) },
    }),
  );
}

export function notificationThumbEmoji(item: PetFeedNotification): string {
  const type = notificationType(item);
  if (
    type === "breeder_verified" ||
    type === "listing_approved" ||
    type === "breeder_detail_approved" ||
    type === "transparency_warning_resolved"
  ) {
    return "✅";
  }
  if (
    type === "breeder_rejected" ||
    type === "listing_rejected" ||
    type === "breeder_detail_rejected" ||
    type === "farm_review_rejected" ||
    type === "transparency_warning"
  ) {
    return "⚠️";
  }
  if (isAdminQueueNotification(type)) return "📋";
  return "🔔";
}

/** Filter by unread only (no i18n). Search is applied separately by callers. */
export function filterNotificationsByStatus(
  items: PetFeedNotification[],
  filter: NotificationFilter = NOTIFICATION_FILTER_ALL,
): PetFeedNotification[] {
  if (filter === NOTIFICATION_FILTER_UNREAD) {
    return items.filter(isNotificationUnread);
  }
  return items;
}

export function matchesNotificationQuery(
  haystack: string,
  query: string,
): boolean {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}
