export type NotificationInboxCtaInput = {
  type?: string | null;
  cta_label?: string | null;
  metadata?: { cta_label?: string | null } | null;
};

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
};

const DEAL_INFO_TYPES = new Set([
  'deposit_confirmed',
  'deposit_cancelled',
  'deal_completed',
  'deal_reviewed',
  'deal_dispute_opened',
  'deal_dispute_resolved',
  'farm_reviewed',
]);

const ADMIN_QUEUE_TYPES = new Set([
  'admin_breeder_pending',
  'admin_breeder_detail_pending',
  'admin_transparency_appeal',
  'admin_listing_pending',
  'admin_report_open',
  'admin_feedback_open',
  'admin_scam_open',
]);

function storedCtaLabel(item: NotificationInboxCtaInput) {
  const top = typeof item.cta_label === 'string' ? item.cta_label.trim() : '';
  if (top) return top;
  const meta = typeof item.metadata?.cta_label === 'string' ? item.metadata.cta_label.trim() : '';
  return meta;
}

export function notificationType(item: NotificationInboxCtaInput) {
  return item.type || 'post_comment';
}

export function isDepositCancelRequestNotification(type: string | null | undefined) {
  return type === 'deposit_cancel_request';
}

export function isAdminQueueNotification(type: string | null | undefined) {
  return ADMIN_QUEUE_TYPES.has(String(type || ''));
}

/** Visible inbox CTA. Deal cancel must not fall through as “no action”. */
export function notificationInboxCta(
  item: NotificationInboxCtaInput,
  fallbacks: NotificationInboxCtaFallbacks,
): string | null {
  const type = notificationType(item);
  const stored = storedCtaLabel(item);

  if (type === 'breeder_verified') return stored || fallbacks.verified;
  if (type === 'breeder_rejected') return stored || fallbacks.rejected;
  if (type === 'listing_approved') return stored || fallbacks.listingApproved;
  if (type === 'listing_rejected') return stored || fallbacks.listingRejected;
  if (type === 'breeder_detail_approved') return stored || fallbacks.detailApproved;
  if (type === 'breeder_detail_rejected') return stored || fallbacks.detailRejected;
  if (type === 'transparency_warning') return stored || fallbacks.transparencyWarning;
  if (type === 'transparency_warning_resolved') {
    return stored || fallbacks.transparencyResolved;
  }
  if (type === 'farm_sale_review_request') {
    return stored || fallbacks.farmSaleReview;
  }
  if (isAdminQueueNotification(type)) return stored || fallbacks.adminRequest;
  if (
    DEAL_INFO_TYPES.has(type)
    || type === 'deposit_cancel_request'
    || type === 'deposit_request'
    || type === 'deal_complete_request'
  ) {
    return stored || fallbacks.viewListing;
  }
  return null;
}
