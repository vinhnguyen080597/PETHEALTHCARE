import type { PetFeedPost } from '../types';

export const OWNER_DELETE_SOLD_COOLDOWN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OwnerDeleteBlockReason =
  | 'not_owner'
  | 'deposit_hold'
  | 'sold_cooldown'
  | 'already_deleted'
  | 'not_allowed';

export type OwnerDeleteDecision = {
  allowed: boolean;
  reason: OwnerDeleteBlockReason | null;
  daysRemaining?: number;
  eligibleAt?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseTimeMs(value: unknown): number | null {
  if (value == null || value === '') return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function metadataMarksOwnerDeleted(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const meta = asRecord(metadata);
  return Boolean(meta.owner_deleted_at || meta.owner_deleted === true);
}

function metadataMarksSold(metadata: Record<string, unknown> | null | undefined): boolean {
  const meta = asRecord(metadata);
  const outcome = String(meta.listing_outcome ?? meta.outcome ?? '')
    .trim()
    .toLowerCase();
  if (outcome === 'sold' || outcome === 'completed' || outcome === 'rehomed') return true;
  return (
    meta.sold === true ||
    meta.completed === true ||
    meta.rehomed === true ||
    meta.sold === 1 ||
    meta.sold === 'true' ||
    meta.sold === '1'
  );
}

export function listingCompletionAtMs(input: {
  metadata?: Record<string, unknown> | null;
  completedAt?: string | null;
  senConfirmedCompleteAt?: string | null;
  autoCompletedAt?: string | null;
  soldAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}): number | null {
  const meta = asRecord(input.metadata);
  const deal = asRecord(meta.deal);
  const candidates = [
    input.completedAt,
    input.senConfirmedCompleteAt,
    input.autoCompletedAt,
    input.soldAt,
    deal.completed_at,
    deal.completedAt,
    deal.sen_confirmed_complete_at,
    deal.senConfirmedCompleteAt,
    deal.auto_completed_at,
    deal.autoCompletedAt,
    meta.sold_at,
    meta.completed_at,
    input.updatedAt,
    input.createdAt,
  ];
  for (const value of candidates) {
    const ms = parseTimeMs(value);
    if (ms != null) return ms;
  }
  return null;
}

export function evaluateOwnerDeleteListing(
  input: {
    isOwner?: boolean;
    status?: string | null;
    metadataSold?: boolean;
    ownerDeleted?: boolean;
    metadata?: Record<string, unknown> | null;
    completedAt?: string | null;
    senConfirmedCompleteAt?: string | null;
    autoCompletedAt?: string | null;
    soldAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
  },
  now: number | Date = Date.now(),
): OwnerDeleteDecision {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  if (input.isOwner === false) {
    return { allowed: false, reason: 'not_owner' };
  }

  if (input.ownerDeleted === true || metadataMarksOwnerDeleted(input.metadata)) {
    return { allowed: false, reason: 'already_deleted' };
  }

  const status = String(input.status || '').trim().toLowerCase();
  const sold =
    status === 'sold' ||
    Boolean(input.metadataSold) ||
    (status === 'archived' && Boolean(input.metadataSold));

  if (status === 'deposit_hold') {
    return { allowed: false, reason: 'deposit_hold' };
  }

  if (sold) {
    const completedMs = listingCompletionAtMs(input) ?? nowMs;
    const eligibleAt = completedMs + OWNER_DELETE_SOLD_COOLDOWN_DAYS * DAY_MS;
    if (nowMs < eligibleAt) {
      return {
        allowed: false,
        reason: 'sold_cooldown',
        daysRemaining: Math.max(1, Math.ceil((eligibleAt - nowMs) / DAY_MS)),
        eligibleAt: new Date(eligibleAt).toISOString(),
      };
    }
    return { allowed: true, reason: null };
  }

  if (status === 'archived') {
    return { allowed: false, reason: 'already_deleted' };
  }

  if (
    status === 'draft' ||
    status === 'pending_review' ||
    status === 'published' ||
    status === ''
  ) {
    return { allowed: true, reason: null };
  }

  return { allowed: false, reason: 'not_allowed' };
}

export function evaluatePetFeedPostDelete(
  post: Pick<PetFeedPost, 'user_id' | 'status' | 'metadata' | 'created_at' | 'updated_at'>,
  currentUserId?: string | null,
  now: number | Date = Date.now(),
): OwnerDeleteDecision {
  const owner = String(currentUserId || '').trim();
  const postOwner = String(post.user_id || '').trim();
  return evaluateOwnerDeleteListing(
    {
      isOwner: !owner || !postOwner ? true : owner === postOwner,
      status: post.status,
      metadata: post.metadata,
      metadataSold: metadataMarksSold(post.metadata),
      updatedAt: post.updated_at,
      createdAt: post.created_at,
    },
    now,
  );
}
