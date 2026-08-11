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
  depositCancelConfirm: string;
  depositConfirm: string;
  dealCompleteConfirm: string;
  viewListing: string;
};

const DEAL_INFO_TYPES = new Set([
  'deposit_confirmed',
  'deposit_cancelled',
  'deal_completed',
  'deal_dispute_opened',
  'deal_dispute_resolved',
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
  if (
    type === 'admin_breeder_pending' ||
    type === 'admin_listing_pending' ||
    type === 'admin_report_open'
  ) {
    return stored || fallbacks.adminRequest;
  }
  if (type === 'deposit_cancel_request') return stored || fallbacks.depositCancelConfirm;
  if (type === 'deposit_request') return stored || fallbacks.depositConfirm;
  if (type === 'deal_complete_request') return stored || fallbacks.dealCompleteConfirm;
  if (DEAL_INFO_TYPES.has(type)) return stored || fallbacks.viewListing;
  return null;
}
