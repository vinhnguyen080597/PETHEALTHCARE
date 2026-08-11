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
    [key: string]: unknown;
  } | null;
};

export const DEPOSIT_CANCEL_DEAL_ACTION = "confirm-cancel";

const DEAL_ACTION_NOTIFICATION_TYPES = new Set([
  "deposit_request",
  "deposit_cancel_request",
  "deal_complete_request",
]);

const DEAL_INFO_NOTIFICATION_TYPES = new Set([
  "deposit_confirmed",
  "deposit_cancelled",
  "deal_completed",
  "deal_dispute_opened",
  "deal_dispute_resolved",
]);

export type NotificationInboxCtaFallbacks = {
  verified: string;
  rejected: string;
  listingApproved: string;
  listingRejected: string;
  adminRequest: string;
  depositCancelConfirm: string;
  depositConfirm: string;
  dealCompleteConfirm: string;
  viewListing: string;
};

export function notificationType(item: NotificationDeepLinkInput) {
  return item.type || "post_comment";
}

export function isNotificationUnread(item: NotificationDeepLinkInput) {
  if (item.read_at) return false;
  if (typeof item.is_unread === "boolean") return item.is_unread;
  return true;
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
  if (type === "admin_breeder_pending") {
    return "/app/admin?section=requests&type=breeder";
  }
  if (type === "admin_listing_pending") {
    return "/app/admin?section=requests&type=post";
  }
  if (type === "admin_report_open") {
    return "/app/admin?section=requests&type=report";
  }
  return "/app/admin?section=requests";
}

export function isDepositCancelRequestNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return type === "deposit_cancel_request";
}

export function isDealActionNotification(
  item: NotificationDeepLinkInput | string | null | undefined,
) {
  const type =
    typeof item === "string" || !item ? String(item || "") : notificationType(item);
  return DEAL_ACTION_NOTIFICATION_TYPES.has(type);
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
  if (
    type === "admin_breeder_pending" ||
    type === "admin_listing_pending" ||
    type === "admin_report_open"
  ) {
    return stored || fallbacks.adminRequest;
  }
  if (type === "deposit_cancel_request") {
    return stored || fallbacks.depositCancelConfirm;
  }
  if (type === "deposit_request") return stored || fallbacks.depositConfirm;
  if (type === "deal_complete_request") {
    return stored || fallbacks.dealCompleteConfirm;
  }
  if (DEAL_INFO_NOTIFICATION_TYPES.has(type)) {
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

/** Listing deep link for deal / comment notifications. Cancel-request adds dealAction. */
export function listingNotificationHref(item: NotificationDeepLinkInput): string | null {
  const postId = String(item.post_id || "").trim();
  const stored =
    typeof item.metadata?.cta_href === "string" ? item.metadata.cta_href : "";
  const path = listingPathFromStoredHref(stored, postId);
  if (!path) return null;
  if (!isDepositCancelRequestNotification(item)) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}dealAction=${DEPOSIT_CANCEL_DEAL_ACTION}`;
}
