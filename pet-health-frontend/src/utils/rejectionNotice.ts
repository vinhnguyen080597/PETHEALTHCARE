function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

/** Generic status sentence used when admin reason was not stored on the notification. */
export function isGenericListingRejectedPreview(
  text: string | null | undefined,
): boolean {
  const value = String(text || '').trim();
  if (!value) return true;
  return (
    /chưa được duyệt/i.test(value) ||
    /not approved/i.test(value) ||
    /did not approve/i.test(value)
  );
}

export type RejectionNoticeInput = {
  rejection_reason?: string | null;
  admin_action?: string | null;
  admin_note?: string | null;
  body_preview?: string | null;
  metadata?: {
    rejection_reason?: string | null;
    admin_action?: string | null;
    admin_note?: string | null;
  } | null;
};

export function resolveRejectionNotice(item: RejectionNoticeInput | null | undefined): {
  reason: string;
  adminAction: string;
  adminNote: string;
} {
  const meta = asRecord(item?.metadata);
  const reason = firstText(item?.rejection_reason, meta.rejection_reason);
  const preview = firstText(item?.body_preview);
  return {
    reason:
      reason ||
      (preview && !isGenericListingRejectedPreview(preview) ? preview : ''),
    adminAction: firstText(item?.admin_action, meta.admin_action),
    adminNote: firstText(item?.admin_note, meta.admin_note),
  };
}
