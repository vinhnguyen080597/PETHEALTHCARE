/** Deal handoff (complete) + cancel UI helpers — mobile parity with web. */

export const COMPLETE_HANDOFF_DEADLINE_DAYS = 7;
export const COMPLETE_HANDOFF_MAX_PHOTOS = 5;
export const COMPLETE_HANDOFF_MIN_PHOTOS = 1;
export const CANCEL_DEPOSIT_MAX_PHOTOS = 5;
export const DEAL_DISPUTE_MAX_PHOTOS = 5;

export const CANCEL_DEPOSIT_REASON_KEYS = [
  'no_contact',
  'buyer_changed_mind',
  'pet_unavailable',
  'other',
] as const;

export type CancelDepositReasonKey = (typeof CANCEL_DEPOSIT_REASON_KEYS)[number];

export type DealHandoffPhase =
  | 'none'
  | 'pending_sen'
  | 'deposit_hold'
  | 'pending_sen_complete'
  | 'pending_cancel_confirm'
  | 'dispute_open'
  | 'completed'
  | 'cancelled'
  | 'other';

export function resolveDealHandoffPhase(input: {
  listingStatus?: string | null;
  dealStatus?: string | null;
}): DealHandoffPhase {
  const listing = String(input.listingStatus || '')
    .trim()
    .toLowerCase();
  const deal = String(input.dealStatus || '')
    .trim()
    .toLowerCase();
  if (listing === 'sold') return 'completed';
  if (listing === 'cancelled') return 'cancelled';

  if (deal === 'pending_sen_complete' || deal === 'pending_complete') {
    return 'pending_sen_complete';
  }
  if (deal === 'pending_cancel_confirm') return 'pending_cancel_confirm';
  if (deal === 'dispute_open') return 'dispute_open';
  if (deal === 'pending_sen') return 'pending_sen';

  const held = listing === 'deposit_hold' || deal === 'deposit_hold';
  if (!held) return 'none';
  if (!deal || deal === 'deposit_hold') {
    return 'deposit_hold';
  }
  return 'other';
}

export function readDealFromPostMetadata(
  metadata: Record<string, unknown> | null | undefined,
): {
  status: string;
  senUserId: string;
  senDisplayName: string;
  cancelReason: string;
  disputeMessage: string;
  completeDeadlineAt: string | null;
} {
  const deal =
    metadata && typeof metadata.deal === 'object' && metadata.deal && !Array.isArray(metadata.deal)
      ? (metadata.deal as Record<string, unknown>)
      : {};
  const dispute =
    deal.dispute && typeof deal.dispute === 'object' && !Array.isArray(deal.dispute)
      ? (deal.dispute as Record<string, unknown>)
      : {};
  return {
    status: String(deal.status || '').trim(),
    senUserId: String(deal.sen_user_id || deal.senUserId || '').trim(),
    senDisplayName: String(deal.sen_display_name || deal.senDisplayName || '').trim(),
    cancelReason: String(deal.cancel_reason || deal.cancelReason || '').trim(),
    disputeMessage: String(dispute.message || '').trim(),
    completeDeadlineAt: (() => {
      const raw = deal.complete_deadline_at ?? deal.completeDeadlineAt;
      return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    })(),
  };
}

export function canBreederRequestHandoff(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isOwner) return false;
  return resolveDealHandoffPhase(input) === 'deposit_hold';
}

export function canBreederCancelDeposit(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isOwner) return false;
  return resolveDealHandoffPhase(input) === 'deposit_hold';
}

export function canBreederConfirmDeposit(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isOwner) return false;
  return resolveDealHandoffPhase(input) === 'pending_sen';
}

export function canSenWithdrawDepositRequest(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === 'pending_sen';
}

const DEAL_STATUSES_BLOCKING_NEW_DEPOSIT = new Set([
  'pending_sen',
  'deposit_hold',
  'pending_cancel_confirm',
  'pending_sen_complete',
  'pending_complete',
  'dispute_open',
]);

export function canShowDepositRequest(input: {
  isOwner: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (input.isOwner) return false;
  if (String(input.listingStatus || '').trim().toLowerCase() !== 'published') {
    return false;
  }
  const deal = String(input.dealStatus || '').trim().toLowerCase();
  return !DEAL_STATUSES_BLOCKING_NEW_DEPOSIT.has(deal);
}

export function canSenConfirmHandoff(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === 'pending_sen_complete';
}

export function canSenAbandonHandoff(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  return canSenConfirmHandoff(input);
}

export function canSenConfirmCancel(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === 'pending_cancel_confirm';
}

export function canSenOpenDispute(input: {
  isDealSen: boolean;
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  if (!input.isDealSen) return false;
  return resolveDealHandoffPhase(input) === 'pending_sen_complete';
}

export function isDealDisputeOpen(input: {
  listingStatus?: string | null;
  dealStatus?: string | null;
}): boolean {
  return resolveDealHandoffPhase(input) === 'dispute_open';
}

export function daysLeftUntilDeadline(
  deadlineIso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!deadlineIso) return null;
  const end = new Date(deadlineIso).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - nowMs) / 86400000);
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

export function validateHandoffPhotos(photoCount: number): string | null {
  if (photoCount < COMPLETE_HANDOFF_MIN_PHOTOS) return 'photos_required';
  if (photoCount > COMPLETE_HANDOFF_MAX_PHOTOS) return 'photos_too_many';
  return null;
}

export function validateCancelDepositRequest(input: {
  reasonKey: string;
  note: string;
  photoCount: number;
}): 'reason_required' | 'photos_too_many' | null {
  const key = String(input.reasonKey || '').trim();
  if (!(CANCEL_DEPOSIT_REASON_KEYS as readonly string[]).includes(key)) {
    return 'reason_required';
  }
  if (key === 'other' && !String(input.note || '').trim()) {
    return 'reason_required';
  }
  if (input.photoCount > CANCEL_DEPOSIT_MAX_PHOTOS) return 'photos_too_many';
  return null;
}

export function validateDisputeRequest(input: {
  message: string;
  photoCount: number;
}): 'message_required' | 'photos_required' | 'photos_too_many' | null {
  if (!String(input.message || '').trim()) return 'message_required';
  if (input.photoCount < 1) return 'photos_required';
  if (input.photoCount > DEAL_DISPUTE_MAX_PHOTOS) return 'photos_too_many';
  return null;
}

export function buildCancelDepositReasonText(input: {
  reasonKey: string;
  reasonLabel: string;
  note: string;
}): string {
  const note = String(input.note || '').trim();
  if (input.reasonKey === 'other') return note;
  return note ? `${input.reasonLabel}: ${note}` : input.reasonLabel;
}

export type ListingDealMutation =
  | { type: 'deposit_confirm'; senUserId?: string }
  | { type: 'deposit_decline' }
  | { type: 'complete_request'; photoUris: string[] }
  | { type: 'complete_confirm' }
  | { type: 'handoff_abandon' }
  | { type: 'complete_dispute'; message: string; photoUris: string[] }
  | { type: 'cancel_request'; reason: string; photoUris: string[] }
  | { type: 'cancel_confirm' };
