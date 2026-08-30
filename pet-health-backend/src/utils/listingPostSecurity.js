import { asObject } from './warrantyPolicy.js';

/** Post metadata keys that must only be written by server-side deal/lifecycle flows. */
export const SERVER_OWNED_POST_METADATA_KEYS = new Set([
  'deal',
  'soft_status',
  'soft_deposit_hold',
  'sold',
  'cancelled',
  'completed',
  'listing_outcome',
  'warranty_policy_snapshot',
  'rejection_reason',
  'rejected_at',
  'owner_deleted_at',
  'owner_deleted',
]);

const DEAL_PII_KEYS = ['sen_email', 'sen_user_id', 'sen_display_name'];

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Merge breeder-editable metadata while preserving server-owned fields from existing row. */
export function mergeClientPostMetadata(clientMeta, existingMeta = {}) {
  const existing = asObject(existingMeta);
  if (clientMeta === undefined) return { ...existing };
  const client = asObject(clientMeta);
  const merged = { ...existing };
  for (const [key, value] of Object.entries(client)) {
    if (SERVER_OWNED_POST_METADATA_KEYS.has(key)) continue;
    merged[key] = value;
  }
  for (const key of SERVER_OWNED_POST_METADATA_KEYS) {
    if (key in existing) merged[key] = existing[key];
    else delete merged[key];
  }
  return merged;
}

export function canViewerSeeDealPii(post, viewerUserId) {
  if (!post || !viewerUserId) return false;
  if (post.user_id === viewerUserId) return true;
  const deal = asObject(asObject(post.metadata).deal);
  const senUserId = trimText(deal.sen_user_id, 80);
  if (senUserId && senUserId === viewerUserId) return true;
  const abandonedBy = trimText(asObject(deal.last_abandoned_handoff).abandoned_by, 80);
  if (abandonedBy && abandonedBy === viewerUserId) return true;
  return false;
}

export function sanitizeDealForViewer(deal, post, viewerUserId) {
  const raw = asObject(deal);
  if (!Object.keys(raw).length) return null;
  if (canViewerSeeDealPii(post, viewerUserId)) return raw;
  const sanitized = { ...raw };
  for (const key of DEAL_PII_KEYS) {
    delete sanitized[key];
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

/** Redact deal PII on API DTOs for non-participants. */
export function applyDealVisibility(post, viewerUserId) {
  if (!post) return post;
  const dealSource = asObject(post.deal ?? asObject(post.metadata).deal);
  if (!Object.keys(dealSource).length) return post;
  const sanitizedDeal = sanitizeDealForViewer(dealSource, post, viewerUserId);
  const metadata = { ...asObject(post.metadata) };
  if (sanitizedDeal) metadata.deal = sanitizedDeal;
  else delete metadata.deal;
  return {
    ...post,
    metadata,
    deal: sanitizedDeal,
  };
}
