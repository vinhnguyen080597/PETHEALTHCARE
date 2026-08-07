export type NotificationDeepLinkInput = {
  type?: string | null;
  post_id?: string | null;
  breeder_profile_id?: string | null;
  read_at?: string | null;
  is_unread?: boolean;
  metadata?: {
    cta_href?: string;
    report_id?: string;
    [key: string]: unknown;
  } | null;
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
