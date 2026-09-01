import { farmDetailHref } from "../farmTabs";

export type NotificationDeepLinkInput = {
  type?: string | null;
  post_id?: string | null;
  breeder_profile_id?: string | null;
  read_at?: string | null;
  is_unread?: boolean;
  cta_label?: string | null;
  metadata?: {
    cta_href?: string;
    cta_label?: string;
    report_id?: string;
    submission_id?: string;
    warning_id?: string;
    review_id?: string;
    [key: string]: unknown;
  } | null;
};

export const DEPOSIT_CANCEL_DEAL_ACTION = "confirm-cancel";
export const DEPOSIT_CONFIRM_DEAL_ACTION = "confirm-deposit";
export const HANDOFF_CONFIRM_DEAL_ACTION = "confirm-receipt";

const DEAL_INFO_NOTIFICATION_TYPES = new Set([
  "deposit_confirmed",
  "deposit_cancelled",
  "deal_completed",
  "deal_reviewed",
  "deal_dispute_opened",
  "deal_dispute_resolved",
]);

const FARM_SALE_REVIEW_NOTIFICATION_TYPES = new Set(["farm_sale_review_request"]);

const ADMIN_QUEUE_NOTIFICATION_TYPES = new Set([
  "admin_breeder_pending",
  "admin_breeder_detail_pending",
  "admin_transparency_appeal",
  "admin_listing_pending",
  "admin_report_open",
  "admin_feedback_open",
  "admin_scam_open",
  "admin_farm_review_pending",
]);

/** CTA copy is “view farm profile” — must not land on /app/account/breeder. */
const FARM_PROFILE_NOTIFICATION_TYPES = new Set([
  "breeder_verified",
  "breeder_detail_approved",
  "transparency_warning_resolved",
]);

const ACCOUNT_BREEDER_NOTIFICATION_TYPES = new Set([
  "transparency_warning",
  "breeder_detail_rejected",
]);

const FARM_PROFILE_HREF = /^\/app\/breeders\/([^/?#]+)/;

export type NotificationInboxCtaFallbacks = {
  verified: string;
  rejected: string;
  listingApproved: string;
  listingRejected: string;
  adminRequest: string;
  detailApproved: string;
  detailRejected: string;
  transparencyWarning: string;
  transparencyResolved: string;
  depositCancelConfirm: string;
  depositConfirm: string;
  dealCompleteConfirm: string;
  viewListing: string;
  farmSaleReview: string;
  farmReviewed: string;
};

export function notificationType(item: NotificationDeepLinkInput) {
  return item.type || "post_comment";
}

export function isNotificationUnread(item: NotificationDeepLinkInput) {
  if (item.read_at) return false;
  if (typeof item.is_unread === "boolean") return item.is_unread;
  return true;
}

export function isAdminQueueNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return ADMIN_QUEUE_NOTIFICATION_TYPES.has(type);
}

/** Admin request notification → Admin Console deep link (with focus when possible). */
export function adminRequestHref(item: NotificationDeepLinkInput) {
  const type = notificationType(item);
  const stored =
    typeof item.metadata?.cta_href === "string" ? item.metadata.cta_href.trim() : "";
  if (stored.includes("focus=")) return stored;

  if (type === "admin_breeder_pending" && item.breeder_profile_id) {
    return `/app/admin?section=requests&type=breeder&focus=${encodeURIComponent(item.breeder_profile_id)}`;
  }
  if (type === "admin_listing_pending" && item.post_id) {
    return `/app/admin?section=requests&type=post&focus=${encodeURIComponent(item.post_id)}`;
  }
  if (type === "admin_report_open") {
    const reportId =
      (typeof item.metadata?.report_id === "string" && item.metadata.report_id) || "";
    if (reportId) {
      return `/app/admin?section=requests&type=report&focus=${encodeURIComponent(reportId)}`;
    }
  }
  if (type === "admin_feedback_open") {
    const ticketId =
      (typeof item.metadata?.ticket_id === "string" && item.metadata.ticket_id) || "";
    if (ticketId) {
      return `/app/admin?section=requests&type=feedback&focus=${encodeURIComponent(ticketId)}`;
    }
    return "/app/admin?section=requests&type=feedback";
  }
  if (type === "admin_scam_open") {
    const ticketId =
      (typeof item.metadata?.ticket_id === "string" && item.metadata.ticket_id) || "";
    if (ticketId) {
      return `/app/admin?section=requests&type=scam&focus=${encodeURIComponent(ticketId)}`;
    }
    return "/app/admin?section=requests&type=scam";
  }
  if (type === "admin_breeder_detail_pending") {
    const submissionId =
      (typeof item.metadata?.submission_id === "string" && item.metadata.submission_id) ||
      "";
    if (submissionId) {
      return `/app/admin?section=requests&type=detail&focus=${encodeURIComponent(submissionId)}`;
    }
    return "/app/admin?section=requests&type=detail";
  }
  if (type === "admin_transparency_appeal") {
    const warningId =
      (typeof item.metadata?.warning_id === "string" && item.metadata.warning_id) || "";
    if (warningId) {
      return `/app/admin?section=requests&type=appeal&focus=${encodeURIComponent(warningId)}`;
    }
    return "/app/admin?section=requests&type=appeal";
  }
  if (type === "admin_farm_review_pending") {
    const reviewId =
      (typeof item.metadata?.review_id === "string" && item.metadata.review_id) || "";
    if (reviewId) {
      return `/app/admin?section=requests&type=farm_review&focus=${encodeURIComponent(reviewId)}`;
    }
    return "/app/admin?section=requests&type=farm_review";
  }
  if (type === "admin_breeder_pending") {
    return "/app/admin?section=requests&type=breeder";
  }
  if (type === "admin_listing_pending") {
    return "/app/admin?section=requests&type=post";
  }
  if (type === "admin_report_open") {
    return "/app/admin?section=requests&type=report";
  }
  if (type === "admin_feedback_open") {
    return "/app/admin?section=requests&type=feedback";
  }
  if (type === "admin_scam_open") {
    return "/app/admin?section=requests&type=scam";
  }
  return "/app/admin?section=requests";
}

function storedCtaHref(item: NotificationDeepLinkInput) {
  return typeof item.metadata?.cta_href === "string"
    ? item.metadata.cta_href.trim()
    : "";
}

/** Public farm profile for “Xem hồ sơ trại”. Ignores stored account/breeder hrefs. */
export function farmProfileNotificationHref(
  item: NotificationDeepLinkInput,
): string | null {
  const profileId = String(item.breeder_profile_id || "").trim();
  if (profileId) return farmDetailHref(profileId);
  const storedMatch = storedCtaHref(item).match(FARM_PROFILE_HREF);
  if (storedMatch?.[1]) {
    try {
      return farmDetailHref(decodeURIComponent(storedMatch[1]));
    } catch {
      return farmDetailHref(storedMatch[1]);
    }
  }
  return null;
}

/** Breeder-facing notification → public farm profile, or account when they need to edit. */
export function breederTransparencyNotificationHref(
  item: NotificationDeepLinkInput,
): string | null {
  const type = notificationType(item);
  if (FARM_PROFILE_NOTIFICATION_TYPES.has(type)) {
    return farmProfileNotificationHref(item) || "/app/account/breeder";
  }
  if (ACCOUNT_BREEDER_NOTIFICATION_TYPES.has(type)) {
    const stored = storedCtaHref(item);
    if (stored.startsWith("/app/")) return stored;
    return "/app/account/breeder";
  }
  return null;
}

export function isDepositCancelRequestNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "deposit_cancel_request";
}

export function isDepositRequestNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "deposit_request";
}

export function isDealCompleteRequestNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "deal_complete_request";
}

export function isFarmSaleReviewRequestNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return FARM_SALE_REVIEW_NOTIFICATION_TYPES.has(type);
}

export function farmSaleReviewNotificationHref(
  item: NotificationDeepLinkInput,
): string | null {
  if (!isFarmSaleReviewRequestNotification(item)) return null;
  const postId = String(item.post_id || "").trim();
  if (!postId) return null;
  return `/app/pet-feed/posts/${encodeURIComponent(postId)}?saleReview=1`;
}

export function isFarmReviewedNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "farm_reviewed";
}

export function isFarmReviewRejectedNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "farm_review_rejected";
}

export function farmReviewedBreederProfileId(item: NotificationDeepLinkInput): string | null {
  const top = String(item.breeder_profile_id || "").trim();
  if (top) return top;
  const meta =
    typeof item.metadata?.breeder_profile_id === "string"
      ? item.metadata.breeder_profile_id.trim()
      : "";
  return meta || null;
}

/** Breeder notified of a new farm review — open reviews tab, not the listing. */
export function farmReviewedNotificationHref(
  item: NotificationDeepLinkInput,
): string | null {
  if (!isFarmReviewedNotification(item)) return null;
  const stored = storedCtaHref(item);
  if (stored.startsWith("/app/breeders/")) return stored;
  const profileId = farmReviewedBreederProfileId(item);
  if (!profileId) return null;
  return farmDetailHref(profileId, "reviews");
}

export function isDealActionNotification(
  _item: NotificationDeepLinkInput | string | null | undefined,
) {
  // Escrow/deposit CTAs removed — legacy deal notifications open the listing only.
  return false;
}

function storedCtaLabel(item: NotificationDeepLinkInput) {
  const top = typeof item.cta_label === "string" ? item.cta_label.trim() : "";
  if (top) return top;
  const meta =
    typeof item.metadata?.cta_label === "string" ? item.metadata.cta_label.trim() : "";
  return meta;
}

/** Visible inbox CTA. Deal cancel/confirm types must not fall through as “no action”. */
export function notificationInboxCta(
  item: NotificationDeepLinkInput,
  fallbacks: NotificationInboxCtaFallbacks,
): string | null {
  const type = notificationType(item);
  const stored = storedCtaLabel(item);

  if (type === "breeder_verified") return stored || fallbacks.verified;
  if (type === "breeder_rejected") return stored || fallbacks.rejected;
  if (type === "listing_approved") return stored || fallbacks.listingApproved;
  if (type === "listing_rejected") return stored || fallbacks.listingRejected;
  if (type === "breeder_detail_approved") return stored || fallbacks.detailApproved;
  if (type === "breeder_detail_rejected") return stored || fallbacks.detailRejected;
  if (type === "transparency_warning") return stored || fallbacks.transparencyWarning;
  if (type === "transparency_warning_resolved") {
    return stored || fallbacks.transparencyResolved;
  }
  if (isFarmSaleReviewRequestNotification(type)) {
    return stored || fallbacks.farmSaleReview;
  }
  if (isFarmReviewedNotification(type)) {
    return stored || fallbacks.farmReviewed;
  }
  if (isAdminQueueNotification(type)) {
    return stored || fallbacks.adminRequest;
  }
  if (
    DEAL_INFO_NOTIFICATION_TYPES.has(type)
    || type === "deposit_cancel_request"
    || type === "deposit_request"
    || type === "deal_complete_request"
  ) {
    return stored || fallbacks.viewListing;
  }
  return null;
}

function listingPathFromStoredHref(stored: string, postId: string) {
  const href = stored.trim();
  if (href.startsWith("/app/pet-feed/posts/")) return href.split("?")[0] || href;
  if (href.startsWith("/app/posts/")) {
    const id = href.replace(/^\/app\/posts\//, "").split("?")[0];
    if (id) return `/app/pet-feed/posts/${encodeURIComponent(id)}`;
  }
  if (postId) return `/app/pet-feed/posts/${encodeURIComponent(postId)}`;
  return "";
}

/** Listing deep link for comment / legacy deal notifications (view-only). */
export function listingNotificationHref(item: NotificationDeepLinkInput): string | null {
  const postId = String(item.post_id || "").trim();
  const stored =
    typeof item.metadata?.cta_href === "string" ? item.metadata.cta_href : "";
  return listingPathFromStoredHref(stored, postId) || null;
}
