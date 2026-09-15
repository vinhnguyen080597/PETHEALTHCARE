import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import type { PetFeedNotification } from "@/lib/api/petFeed";
import {
  notificationInboxCta,
  notificationType,
} from "@/lib/notifications/deepLinks";
import { resolveRejectionNotice } from "@/lib/notifications/rejectionNotice";
import { formatInboxRelativeTime } from "@/lib/messages";
import {
  filterNotificationsByStatus,
  matchesNotificationQuery,
  NOTIFICATION_FILTER_ALL,
  type NotificationFilter,
} from "@/lib/notifications/inboxCore";

export {
  NOTIFICATIONS_PAGE_HREF,
  NOTIFICATIONS_PREVIEW_LIMIT,
  NOTIFICATIONS_PAGE_LIMIT,
  NOTIFICATIONS_PAGE_LOAD_STEP,
  NOTIFICATION_FILTER_ALL,
  NOTIFICATION_FILTER_UNREAD,
  requestToggleNotifications,
  subscribeToggleNotifications,
  dispatchNotificationsRead,
  notificationThumbEmoji,
  type NotificationFilter,
} from "@/lib/notifications/inboxCore";

export function formatNotificationListTime(
  value: string | undefined,
  lang: Lang,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(lang === "VI" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNotificationPreviewTime(
  value: string | undefined,
  lang: Lang,
): string {
  return formatInboxRelativeTime(value, lang);
}

export function notificationTitle(lang: Lang, item: PetFeedNotification): string {
  const type = notificationType(item);
  if (type === "breeder_verified") return t(lang, "notifications.verifiedTitle");
  if (type === "breeder_rejected") return t(lang, "notifications.rejectedTitle");
  if (type === "listing_approved") return t(lang, "notifications.listingApprovedTitle");
  if (type === "listing_rejected") return t(lang, "notifications.listingRejectedTitle");
  if (type === "breeder_detail_approved") {
    return t(lang, "notifications.detailApprovedTitle");
  }
  if (type === "breeder_detail_rejected") {
    return t(lang, "notifications.detailRejectedTitle");
  }
  if (type === "transparency_warning") {
    return t(lang, "notifications.transparencyWarningTitle");
  }
  if (type === "transparency_warning_resolved") {
    return t(lang, "notifications.transparencyResolvedTitle");
  }
  if (type === "admin_breeder_pending") return t(lang, "notifications.adminBreederTitle");
  if (type === "admin_breeder_detail_pending") {
    return t(lang, "notifications.adminDetailTitle");
  }
  if (type === "admin_transparency_appeal") {
    return t(lang, "notifications.adminAppealTitle");
  }
  if (type === "admin_listing_pending") return t(lang, "notifications.adminListingTitle");
  if (type === "admin_farm_review_pending") {
    return t(lang, "notifications.adminFarmReviewTitle");
  }
  if (type === "farm_review_rejected") {
    return t(lang, "notifications.farmReviewRejectedTitle");
  }
  if (type === "admin_report_open") return t(lang, "notifications.adminReportTitle");
  if (type === "deposit_cancel_request") {
    return t(lang, "notifications.depositCancelTitle");
  }
  return item.actor_display_name || t(lang, "notifications.someone");
}

export function notificationBody(lang: Lang, item: PetFeedNotification): string {
  const type = notificationType(item);
  if (type === "breeder_verified") {
    return item.body_preview || t(lang, "notifications.verifiedBody");
  }
  if (type === "breeder_rejected") {
    return (
      item.rejection_reason ||
      item.body_preview ||
      t(lang, "notifications.rejectedBody")
    );
  }
  if (type === "listing_approved") {
    return item.body_preview || t(lang, "notifications.listingApprovedBody");
  }
  if (type === "listing_rejected") {
    return (
      resolveRejectionNotice(item).reason ||
      t(lang, "notifications.listingRejectedBody")
    );
  }
  if (type === "breeder_detail_approved") {
    return item.body_preview || t(lang, "notifications.detailApprovedBody");
  }
  if (type === "breeder_detail_rejected") {
    return (
      resolveRejectionNotice(item).reason ||
      item.body_preview ||
      t(lang, "notifications.detailRejectedBody")
    );
  }
  if (type === "transparency_warning") {
    return item.body_preview || t(lang, "notifications.transparencyWarningBody");
  }
  if (type === "transparency_warning_resolved") {
    return item.body_preview || t(lang, "notifications.transparencyResolvedBody");
  }
  if (type === "admin_breeder_pending") {
    return item.body_preview || t(lang, "notifications.adminBreederBody");
  }
  if (type === "admin_breeder_detail_pending") {
    return item.body_preview || t(lang, "notifications.adminDetailBody");
  }
  if (type === "admin_transparency_appeal") {
    return item.body_preview || t(lang, "notifications.adminAppealBody");
  }
  if (type === "admin_listing_pending") {
    return item.body_preview || t(lang, "notifications.adminListingBody");
  }
  if (type === "admin_farm_review_pending") {
    return item.body_preview || t(lang, "notifications.adminFarmReviewBody");
  }
  if (type === "farm_review_rejected") {
    return (
      resolveRejectionNotice(item).reason ||
      item.body_preview ||
      t(lang, "notifications.farmReviewRejectedBody")
    );
  }
  if (type === "admin_report_open") {
    return item.body_preview || t(lang, "notifications.adminReportBody");
  }
  if (type === "deposit_cancel_request") {
    return item.body_preview || t(lang, "notifications.depositCancelBody");
  }
  return item.body_preview || t(lang, "notifications.commentFallback");
}

export function notificationCtaLabel(
  lang: Lang,
  item: PetFeedNotification,
): string | null {
  return notificationInboxCta(item, {
    verified: t(lang, "notifications.verifiedCta"),
    rejected: t(lang, "notifications.rejectedCta"),
    listingApproved: t(lang, "notifications.listingApprovedCta"),
    listingRejected: t(lang, "notifications.listingRejectedCta"),
    adminRequest: t(lang, "notifications.adminRequestCta"),
    detailApproved: t(lang, "notifications.detailApprovedCta"),
    detailRejected: t(lang, "notifications.detailRejectedCta"),
    transparencyWarning: t(lang, "notifications.transparencyWarningCta"),
    transparencyResolved: t(lang, "notifications.transparencyResolvedCta"),
    depositCancelConfirm: t(lang, "notifications.depositCancelCta"),
    depositConfirm: t(lang, "notifications.depositRequestCta"),
    dealCompleteConfirm: t(lang, "notifications.dealCompleteCta"),
    viewListing: t(lang, "notifications.viewListing"),
    farmSaleReview: t(lang, "notifications.farmSaleReview"),
    farmReviewed: t(lang, "notifications.farmReviewed"),
  });
}

export function notificationSearchHaystack(
  lang: Lang,
  item: PetFeedNotification,
): string {
  return [
    notificationTitle(lang, item),
    notificationBody(lang, item),
    item.post_title,
    item.actor_display_name,
    item.breeder_display_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterInboxNotifications(
  items: PetFeedNotification[],
  opts: { query?: string; filter?: NotificationFilter; lang: Lang },
): PetFeedNotification[] {
  const filter = opts.filter ?? NOTIFICATION_FILTER_ALL;
  return filterNotificationsByStatus(items, filter).filter((item) =>
    matchesNotificationQuery(
      notificationSearchHaystack(opts.lang, item),
      opts.query || "",
    ),
  );
}
