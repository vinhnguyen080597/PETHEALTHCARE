/** Deal handoff (complete) + cancel UI helpers. */

export const COMPLETE_HANDOFF_DEADLINE_DAYS = 7;
export const COMPLETE_HANDOFF_MAX_PHOTOS = 5;
export const COMPLETE_HANDOFF_MIN_PHOTOS = 1;
export const CANCEL_DEPOSIT_MAX_PHOTOS = 5;

export const CANCEL_DEPOSIT_REASON_KEYS = [
  "no_contact",
  "buyer_changed_mind",
  "pet_unavailable",
  "other",
] as const;

export type CancelDepositReasonKey = (typeof CANCEL_DEPOSIT_REASON_KEYS)[number];

export type DealHandoffPhase =
  | "none"
  | "deposit_hold"
  | "pending_sen_complete"
  | "pending_cancel_confirm"
  | "dispute_open"
  | "completed"
  | "cancelled"
  | "other";

export function resolveDealHandoffPhase(input: {
  listingStatus?: string | null;
  dealStatus?: string | null;
}): DealHandoffPhase {
  const listing = String(input.listingStatus || "")
    .trim()
    .toLowerCase();
  const deal = String(input.dealStatus || "")
    .trim()
    .toLowerCase();
  if (listing === "sold") return "completed";
  if (listing === "cancelled") return "cancelled";

  if (deal === "pending_sen_complete" || deal === "pending_complete") {
    return "pending_sen_complete";
  }
  if (deal === "pending_cancel_confirm") return "pending_cancel_confirm";
  if (deal === "dispute_open") return "dispute_open";

  const held = listing === "deposit_hold" || deal === "deposit_hold";
  if (!held) return "none";
  if (!deal || deal === "deposit_hold" || deal === "pending_sen") {
    return "deposit_hold";
  }
  return "other";
}

export function canBreederRequestHandoff(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isOwner) return false;
  return resolveDealHandoffPhase(input) === "deposit_hold";
}

export function canBreederCancelDeposit(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isOwner) return false;
  return resolveDealHandoffPhase(input) === "deposit_hold";
}

export function canSenConfirmHandoff(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === "pending_sen_complete";
}

export function canSenConfirmCancel(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
  /** Notification / account deep link — backend still enforces Sen identity. */
  allowLoggedInDeepLink?: boolean;
}): boolean {
  if (!input.isDealSen && !input.allowLoggedInDeepLink) return false;
  return resolveDealHandoffPhase(input) === "pending_cancel_confirm";
}

export function canSenOpenDispute(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === "pending_sen_complete";
}

export function isDealDisputeOpen(input: {
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  return resolveDealHandoffPhase(input) === "dispute_open";
}

export const DEAL_DISPUTE_MAX_PHOTOS = 5;

export function validateDisputeRequest(input: {
  message: string;
  photos: File[];
}): "message_required" | "photos_required" | "photos_too_many" | null {
  if (!String(input.message || "").trim()) return "message_required";
  if (input.photos.length < 1) return "photos_required";
  if (input.photos.length > DEAL_DISPUTE_MAX_PHOTOS) return "photos_too_many";
  return null;
}

export function daysLeftUntilDeadline(
  deadlineIso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!deadlineIso) return null;
  const end = new Date(deadlineIso).getTime();
  if (!Number.isFinite(end)) return null;
  const days = Math.ceil((end - nowMs) / 86400000);
  return days;
}

export function waitingForSenMessage(
  template: string,
  daysLeft: number | null,
  fallbackDays: number = COMPLETE_HANDOFF_DEADLINE_DAYS,
): string {
  const n =
    daysLeft != null && Number.isFinite(daysLeft)
      ? Math.max(0, daysLeft)
      : fallbackDays;
  return template.replace(/\{days\}/g, String(n));
}

export function validateHandoffPhotos(files: File[]): string | null {
  if (files.length < COMPLETE_HANDOFF_MIN_PHOTOS) {
    return "photos_required";
  }
  if (files.length > COMPLETE_HANDOFF_MAX_PHOTOS) {
    return "photos_too_many";
  }
  return null;
}

const IMAGE_MIME_PREFIX = "image/";

/** Append newly picked images, drop empties/non-images, cap at max. */
export function mergeDealPhotoFiles(
  existing: File[],
  incoming: FileList | File[] | null | undefined,
  max: number,
): File[] {
  const cap = Math.max(0, Math.floor(max));
  const next = Array.isArray(incoming)
    ? incoming
    : incoming
      ? Array.from(incoming)
      : [];
  const images = next.filter(
    (f) => f && f.size > 0 && String(f.type || "").startsWith(IMAGE_MIME_PREFIX),
  );
  return [...existing, ...images].slice(0, cap);
}

export function dealPhotosDropHint(template: string, max: number): string {
  return String(template || "").replace(/\{max\}/g, String(max));
}

export function validateCancelDepositRequest(input: {
  reasonKey: string;
  note: string;
  photos: File[];
}): "reason_required" | "photos_too_many" | null {
  const key = String(input.reasonKey || "").trim();
  if (!(CANCEL_DEPOSIT_REASON_KEYS as readonly string[]).includes(key)) {
    return "reason_required";
  }
  if (key === "other" && !String(input.note || "").trim()) {
    return "reason_required";
  }
  if (input.photos.length > CANCEL_DEPOSIT_MAX_PHOTOS) {
    return "photos_too_many";
  }
  return null;
}

export function buildCancelDepositReasonText(input: {
  reasonKey: string;
  reasonLabel: string;
  note: string;
}): string {
  const note = String(input.note || "").trim();
  if (input.reasonKey === "other") return note;
  return note ? `${input.reasonLabel}: ${note}` : input.reasonLabel;
}
