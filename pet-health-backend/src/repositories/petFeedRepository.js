import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { assertHealthEvidenceForReview } from '../utils/petFeedHealthEvidence.js';
import { resolveBreederPetType, resolvePostPetType } from '../utils/petType.js';
import {
  getAccountProfile,
  normalizeUserRole as normalizeAccountUserRole,
} from './accountRepository.js';
import {
  asObject,
  buildWarrantySnapshot,
  findWarrantyPolicy,
  isWarrantyPolicyFrozen,
  listWarrantyPoliciesFromMetadata,
  normalizeWarrantyPolicy,
  parseWarrantyPolicyInput,
  resolveListingWarrantyPolicy,
} from '../utils/warrantyPolicy.js';
import {
  evaluateOwnerDeleteListing,
  isOwnerDeletedListing,
  OWNER_DELETE_SOLD_COOLDOWN_DAYS,
} from '../utils/listingOwnerDelete.js';
import {
  isCancelledListingMetadata,
  isSoldListingMetadata,
} from '../utils/listingCloseOutcome.js';
import {
  applyDealVisibility,
  mergeClientPostMetadata,
} from '../utils/listingPostSecurity.js';
import { sanitizeBreederProfileMetadata } from '../utils/breederProfileMetadata.js';
import { resolvePrivateMediaUrls } from '../services/imageStorageService.js';
import { normalizeRegistrationUnitPayload } from '../utils/breederRegistrationUnit.js';
import {
  applyApprovedBreederSubmission,
  normalizeBreederSubmissionStatus,
  normalizeBreederSubmissionType,
  validateBreederSubmissionPayload,
} from '../utils/breederProfileSubmissions.js';
import {
  bindBreederDealReviewMemoryPosts,
  bindBreederDealReviewMemoryProfiles,
  recomputeBreederDealActivity,
} from './breederDealReviewsRepository.js';
import {
  bindTransparencyWarningMemoryProfiles,
  maybeCreateTransparencyWarningAfterPenalty,
} from './transparencyWarningsRepository.js';

const DEFAULT_VIOLATION_PENALTY_POINTS = 10;

const POST_STATUSES = new Set(['draft', 'pending_review', 'published', 'deposit_hold', 'archived', 'sold', 'cancelled']);
const CLOSED_LISTING_STATUSES = new Set(['sold', 'cancelled']);
const POST_KINDS = new Set(['listing', 'announcement']);
const ANNOUNCEMENT_CATEGORIES = new Set(['app_update', 'health_tip', 'community', 'general']);
const VERIFICATION_STATUSES = new Set(['unverified', 'pending_review', 'verified', 'rejected', 'suspended']);
const memoryProfiles = [];
const memoryPosts = [];
const memoryFavorites = [];
const memoryReports = [];
const memoryComments = [];
const memoryBlockedBreeders = [];
const memorySubmissions = [];
bindBreederDealReviewMemoryPosts(() => memoryPosts);
bindBreederDealReviewMemoryProfiles(
  () => memoryProfiles,
  (idx, next) => {
    memoryProfiles[idx] = next;
  },
);
bindTransparencyWarningMemoryProfiles(
  () => memoryProfiles,
  (idx, next) => {
    memoryProfiles[idx] = next;
  },
);
const DEFAULT_FEED_PAGE_LIMIT = 12;
const MAX_FEED_PAGE_LIMIT = 30;

function getFeedSupabase(accessToken) {
  const withJwt = createSupabaseWithUserAccessToken(accessToken);
  if (withJwt) return withJwt;
  return getSupabaseServiceClient();
}

function normalizePetFeedPageLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FEED_PAGE_LIMIT;
  return Math.min(Math.max(Math.round(parsed), 1), MAX_FEED_PAGE_LIMIT);
}

function badCursorError() {
  const err = new Error('Invalid Pet Feed cursor.');
  err.status = 400;
  err.code = 'INVALID_PET_FEED_CURSOR';
  return err;
}

function decodePetFeedCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      throw badCursorError();
    }
    const createdAtMs = new Date(parsed.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || !parsed.id.trim()) throw badCursorError();
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch (err) {
    if (err?.code === 'INVALID_PET_FEED_CURSOR') throw err;
    throw badCursorError();
  }
}

function encodePetFeedCursor(row) {
  if (!row?.created_at || !row?.id) return null;
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id }), 'utf8').toString('base64url');
}

function compareFeedRowsDesc(a, b) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

function isBeforeFeedCursor(row, cursor) {
  if (!cursor) return true;
  if (row.created_at < cursor.createdAt) return true;
  return row.created_at === cursor.createdAt && row.id < cursor.id;
}

function paginateFeedRows(rows, limit, cursor) {
  const window = rows
    .filter((row) => isBeforeFeedCursor(row, cursor))
    .sort(compareFeedRowsDesc)
    .slice(0, limit + 1);
  const pageRows = window.slice(0, limit);
  return {
    rows: pageRows,
    nextCursor: window.length > limit ? encodePetFeedCursor(pageRows[pageRows.length - 1]) : null,
  };
}

function trimText(value, max = 2000) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeStatus(value, fallback = 'draft') {
  const status = trimText(value, 32).toLowerCase();
  return POST_STATUSES.has(status) ? status : fallback;
}

function normalizePostKind(value, fallback = 'listing') {
  const kind = trimText(value, 32).toLowerCase();
  return POST_KINDS.has(kind) ? kind : fallback;
}

function normalizeAnnouncementCategory(value) {
  const category = trimText(value, 32).toLowerCase();
  return ANNOUNCEMENT_CATEGORIES.has(category) ? category : 'general';
}

function normalizeVerificationStatus(value) {
  const status = trimText(value, 32).toLowerCase();
  return VERIFICATION_STATUSES.has(status) ? status : 'unverified';
}

function normalizeUserEditablePostStatus(value, existingStatus = 'draft') {
  // Omit / blank status → keep current (e.g. warranty-only updates must not demote published).
  if (value === undefined || value === null || String(value).trim() === '') {
    return existingStatus;
  }
  const status = normalizeStatus(value, existingStatus);
  if (status === 'pending_review' || status === 'draft' || status === 'archived') return status;
  return existingStatus === 'published' || existingStatus === 'archived' ? 'pending_review' : existingStatus;
}

function normalizeJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeStringArray(value, limit = 8) {
  return Array.isArray(value) ? value.map((item) => trimText(item, 500)).filter(Boolean).slice(0, limit) : [];
}

function normalizeProfilePayload(userId, payload, existingId) {
  const existingStatus = normalizeVerificationStatus(payload.existingVerificationStatus);
  const nextStatus = existingStatus === 'suspended' ? 'suspended' : 'pending_review';
  const primarySpecies = normalizeStringArray(payload.primarySpecies ?? payload.primary_species, 1);
  const metadata = sanitizeBreederProfileMetadata(normalizeJsonObject(payload.metadata));
  const breederType = trimText(metadata.breederType ?? metadata.breeder_type, 64).toLowerCase();
  const registration = breederType === 'registered_kennel'
    ? normalizeRegistrationUnitPayload(
      primarySpecies,
      payload.registrationUnit ?? payload.registration_unit,
      payload.registrationUnitOther ?? payload.registration_unit_other,
    )
    : { registration_unit: '', registration_unit_other: '' };
  return {
    id: existingId ?? payload.id ?? randomUUID(),
    user_id: userId,
    display_name: trimText(payload.displayName ?? payload.display_name, 120) || 'Pet breeder',
    bio: trimText(payload.bio, 1200),
    location: trimText(payload.location, 160),
    avatar_url: trimText(payload.avatarUrl ?? payload.avatar_url, 1000) || null,
    contact: normalizeJsonObject(payload.contact),
    primary_species: primarySpecies,
    main_breeds: normalizeStringArray(payload.mainBreeds ?? payload.main_breeds, 12),
    registration_unit: registration.registration_unit,
    registration_unit_other: registration.registration_unit_other,
    verification_status: nextStatus,
    metadata,
    updated_at: new Date().toISOString(),
  };
}

function normalizePostPayload(userId, payload, existing = {}) {
  const metadata = mergeClientPostMetadata(payload.metadata, existing.metadata);
  const hasMediaUrls = payload.mediaUrls !== undefined || payload.media_urls !== undefined;
  const hasVideoUrl = payload.videoUrl !== undefined || payload.video_url !== undefined;
  const hasPersonality = payload.personality !== undefined;
  const hasPaperwork = payload.paperwork !== undefined;
  const hasContact = payload.contact !== undefined;
  const titleFromPayload = payload.title !== undefined;
  const speciesFromPayload = payload.species !== undefined;
  const breedFromPayload = payload.breed !== undefined;
  const genderFromPayload = payload.gender !== undefined;
  const ageFromPayload = payload.ageMonths !== undefined || payload.age_months !== undefined;
  const locationFromPayload = payload.location !== undefined;
  const priceFromPayload = payload.priceNote !== undefined || payload.price_note !== undefined;
  const descriptionFromPayload = payload.description !== undefined;
  const vaccineFromPayload = payload.vaccineStatus !== undefined || payload.vaccine_status !== undefined;
  const dewormingFromPayload = payload.dewormingStatus !== undefined || payload.deworming_status !== undefined;

  const ageRaw = ageFromPayload ? payload.ageMonths ?? payload.age_months : existing.age_months;
  return {
    id: existing.id ?? payload.id ?? randomUUID(),
    user_id: userId,
    breeder_profile_id: payload.breederProfileId ?? payload.breeder_profile_id ?? existing.breeder_profile_id ?? null,
    title: titleFromPayload
      ? (trimText(payload.title, 180) || existing.title || 'Pet looking for a home')
      : (existing.title || 'Pet looking for a home'),
    species: speciesFromPayload
      ? trimText(payload.species, 32).toLowerCase()
      : String(existing.species || '').toLowerCase(),
    breed: breedFromPayload ? trimText(payload.breed, 120) : (existing.breed || ''),
    gender: genderFromPayload
      ? trimText(payload.gender, 32).toLowerCase()
      : String(existing.gender || '').toLowerCase(),
    age_months: Number.isFinite(Number(ageRaw))
      ? Math.max(0, Math.round(Number(ageRaw)))
      : null,
    location: locationFromPayload ? trimText(payload.location, 160) : (existing.location || ''),
    price_note: priceFromPayload
      ? trimText(payload.priceNote ?? payload.price_note, 160)
      : (existing.price_note || ''),
    description: descriptionFromPayload
      ? trimText(payload.description, 4000)
      : (existing.description || ''),
    personality: hasPersonality
      ? normalizeStringArray(payload.personality, 8)
      : (existing.personality ?? []),
    vaccine_status: vaccineFromPayload
      ? trimText(payload.vaccineStatus ?? payload.vaccine_status, 300)
      : (existing.vaccine_status || ''),
    deworming_status: dewormingFromPayload
      ? trimText(payload.dewormingStatus ?? payload.deworming_status, 300)
      : (existing.deworming_status || ''),
    paperwork: hasPaperwork
      ? normalizeStringArray(payload.paperwork, 10)
      : (existing.paperwork ?? []),
    media_urls: hasMediaUrls ? normalizeStringArray(payload.mediaUrls ?? payload.media_urls, 10) : existing.media_urls ?? [],
    video_url: hasVideoUrl ? trimText(payload.videoUrl ?? payload.video_url, 1000) || null : existing.video_url ?? null,
    contact: hasContact ? normalizeJsonObject(payload.contact) : normalizeJsonObject(existing.contact),
    status: normalizeStatus(payload.status, existing.status ?? 'draft'),
    post_kind: normalizePostKind(payload.postKind ?? payload.post_kind ?? existing.post_kind, existing.post_kind ?? 'listing'),
    metadata,
    updated_at: new Date().toISOString(),
  };
}

function toProfile(row) {
  if (!row) return row;
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio ?? '',
    location: row.location ?? '',
    avatar_url: row.avatar_url ?? null,
    contact: row.contact ?? {},
    primary_species: row.primary_species ?? [],
    main_breeds: row.main_breeds ?? [],
    registration_unit: row.registration_unit ?? '',
    registration_unit_other: row.registration_unit_other ?? '',
    verification_status: row.verification_status ?? 'unverified',
    metadata,
    warranty_policies: listWarrantyPoliciesFromMetadata(metadata),
    warranty_policy_trust_awarded: Boolean(asObject(metadata).warranty_policy_trust_awarded),
    pet_type: resolveBreederPetType(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function httpError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function applyWarrantyPolicyBind(existingRow, nextRow, breederProfile) {
  const existingMeta = asObject(existingRow?.metadata);
  const nextMeta = { ...asObject(nextRow.metadata) };
  const requestedId = nextMeta.warranty_policy_id !== undefined
    ? String(nextMeta.warranty_policy_id ?? '').trim()
    : existingMeta.warranty_policy_id != null
      ? String(existingMeta.warranty_policy_id).trim()
      : '';

  if (isWarrantyPolicyFrozen({ status: existingRow?.status ?? nextRow.status, metadata: existingMeta })) {
    const existingId = String(existingMeta.warranty_policy_id ?? '').trim();
    if (requestedId && requestedId !== existingId) {
      throw httpError(
        'Warranty policy is frozen after deposit confirmation.',
        400,
        'WARRANTY_POLICY_FROZEN',
      );
    }
    nextMeta.warranty_policy_id = existingMeta.warranty_policy_id ?? null;
    if (existingMeta.warranty_policy_snapshot) {
      nextMeta.warranty_policy_snapshot = existingMeta.warranty_policy_snapshot;
    }
    if (existingMeta.deal) nextMeta.deal = existingMeta.deal;
    return { ...nextRow, metadata: nextMeta };
  }

  if (nextMeta.warranty_policy_id !== undefined) {
    if (!requestedId) {
      nextMeta.warranty_policy_id = null;
    } else {
      const policy = findWarrantyPolicy(breederProfile?.metadata, requestedId);
      if (!policy) {
        throw httpError('Warranty policy not found in your library.', 400, 'WARRANTY_POLICY_NOT_FOUND');
      }
      nextMeta.warranty_policy_id = policy.id;
    }
  }

  return { ...nextRow, metadata: nextMeta };
}

async function persistBreederMetadata(userId, metadata, accessToken) {
  const updates = {
    metadata: asObject(metadata),
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    if (idx < 0) throw httpError('Breeder profile not found.', 404, 'BREEDER_PROFILE_NOT_FOUND');
    memoryProfiles[idx] = { ...memoryProfiles[idx], ...updates };
    return toProfile(memoryProfiles[idx]);
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return toProfile(data);
}

async function persistPostRow(postId, patch, accessToken, viewerUserId = null) {
  const updates = { ...patch, updated_at: new Date().toISOString() };
  // Prefer service role: owner JWT RLS historically blocked deposit_hold/sold transitions.
  const service = getSupabaseServiceClient();
  const supabase = service ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId);
    if (idx < 0) return null;
    memoryPosts[idx] = { ...memoryPosts[idx], ...updates };
    const profile = memoryProfiles.find((p) => p.id === memoryPosts[idx].breeder_profile_id) ?? null;
    return toPost(
      { ...memoryPosts[idx], breeder_profile: profile ? toProfile(profile) : null },
      new Set(),
      new Map(profile ? [[profile.id, profile]] : []),
      viewerUserId,
    );
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .update(updates)
    .eq('id', postId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .maybeSingle();
  if (error) {
    const code = String(error.code ?? '');
    const msg = String(error.message ?? '');
    if (/row-level security|42501/i.test(`${code} ${msg}`)) {
      throw httpError(
        'Could not update listing status for deposit. Check server service-role configuration or RLS policies.',
        503,
        'DEPOSIT_PERSIST_FORBIDDEN',
      );
    }
    throw error;
  }
  if (!data) {
    throw httpError('Listing update returned no row.', 500, 'DEPOSIT_PERSIST_EMPTY');
  }
  return toPost(data, new Set(), new Map(), viewerUserId);
}

const ACTIVE_HOLD_DEAL_STATUSES = new Set([
  'deposit_hold',
  'pending_cancel_confirm',
  'pending_sen_complete',
  'pending_complete',
  'dispute_open',
]);

function resolveEffectivePostStatus(row) {
  const raw = String(row?.status ?? '').trim().toLowerCase();
  const meta = asObject(row?.metadata);
  if (isOwnerDeletedListing(meta)) return 'archived';
  const soft = String(meta.soft_status ?? '').trim().toLowerCase();
  if (soft === 'deposit_hold' || soft === 'sold' || soft === 'cancelled') return soft;
  const deal = asObject(meta.deal);
  const dealStatus = String(deal.status || '').trim().toLowerCase();
  if (
    raw === 'archived'
    && (dealStatus === 'deposit_hold' || meta.soft_deposit_hold)
  ) {
    return 'deposit_hold';
  }
  if (
    (raw === 'published' || raw === 'pending_review')
    && ACTIVE_HOLD_DEAL_STATUSES.has(dealStatus)
  ) {
    return 'deposit_hold';
  }
  // Closed deals stamp outcome metadata even if the status column stayed published.
  if (isCancelledListingMetadata(meta) && !ACTIVE_HOLD_DEAL_STATUSES.has(dealStatus)) {
    return 'cancelled';
  }
  if (isSoldListingMetadata(meta) && !ACTIVE_HOLD_DEAL_STATUSES.has(dealStatus)) {
    return 'sold';
  }
  return raw;
}

/** Marketplace listing still visible on detail (published / deposit hold / sold). */
export function isPubliclyViewableListingRow(row) {
  if (!row) return false;
  if (isOwnerDeletedListing(row.metadata)) return false;
  const effective = resolveEffectivePostStatus(row);
  if (
    effective === 'published'
    || effective === 'deposit_hold'
    || effective === 'sold'
    || effective === 'cancelled'
  ) {
    return true;
  }
  return String(row.status || '').trim().toLowerCase() === 'archived'
    && (isSoldListingMetadata(row.metadata) || isCancelledListingMetadata(row.metadata));
}

/** Owner "My listings" hides archived/deleted rows but keeps live, hold, and sold. */
export function isOwnerVisibleMyListing(row) {
  if (!row) return false;
  if (isOwnerDeletedListing(row.metadata)) return false;
  return resolveEffectivePostStatus(row) !== 'archived';
}

/** Owner always; otherwise same as public marketplace visibility. */
export function canViewerAccessPetFeedPost(row, userId) {
  if (!row) return false;
  if (userId && row.user_id === userId) return true;
  return isPubliclyViewableListingRow(row);
}

/** Comment + open conversation allowed while listing is live or on soft deposit. */
export function isPetFeedPostOpenForEngagement(statusOrPost) {
  const status = typeof statusOrPost === 'string' || statusOrPost == null
    ? statusOrPost
    : (statusOrPost.status ?? resolveEffectivePostStatus(statusOrPost));
  const s = String(status || '').trim().toLowerCase();
  return s === 'published' || s === 'deposit_hold';
}

/** Latest live listing for a farm, used when Sen messages the breeder directory card. */
export async function findLatestOpenListingIdForBreeder(profileId, accessToken) {
  const safeId = trimText(profileId, 80);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const post = memoryPosts
      .filter((row) =>
        row.breeder_profile_id === safeId
        && normalizePostKind(row.post_kind, 'listing') === 'listing'
        && isPetFeedPostOpenForEngagement(row))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    return post?.id ?? null;
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('id, status, metadata, post_kind, created_at')
    .eq('breeder_profile_id', safeId)
    .eq('post_kind', 'listing')
    .in('status', ['published', 'deposit_hold'])
    .order('created_at', { ascending: false })
    .limit(24);
  if (error) throw error;
  const row = (data ?? []).find((post) => isPetFeedPostOpenForEngagement(post));
  return row?.id ?? null;
}

function isStatusCheckViolation(err) {
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? '');
  if (code === '23514') {
    return /status/i.test(msg) || /pet_feed_posts_status/i.test(msg);
  }
  return /pet_feed_posts_status_check/i.test(msg);
}

function stampClosedListingMetadata(metadata, outcome) {
  const meta = { ...asObject(metadata) };
  const close = outcome === 'cancelled' ? 'cancelled' : 'sold';
  meta.soft_status = close;
  meta.listing_outcome = close;
  delete meta.soft_deposit_hold;
  if (close === 'cancelled') {
    meta.cancelled = true;
    delete meta.sold;
    delete meta.completed;
    delete meta.rehomed;
  } else {
    meta.sold = true;
    delete meta.cancelled;
  }
  return meta;
}

function clearClosedListingMetadata(metadata) {
  const meta = { ...asObject(metadata) };
  delete meta.soft_status;
  delete meta.soft_deposit_hold;
  delete meta.sold;
  delete meta.cancelled;
  delete meta.listing_outcome;
  delete meta.completed;
  delete meta.rehomed;
  return meta;
}

/** Persist lifecycle status; older DBs without deposit_hold/sold/cancelled fall back to archived + soft_status. */
async function persistListingLifecycle(postId, desiredStatus, metadata, accessToken, viewerUserId = null) {
  const meta = CLOSED_LISTING_STATUSES.has(desiredStatus)
    ? stampClosedListingMetadata(metadata, desiredStatus)
    : { ...asObject(metadata) };
  if (!CLOSED_LISTING_STATUSES.has(desiredStatus)) {
    delete meta.soft_status;
    delete meta.soft_deposit_hold;
  }
  try {
    return await persistPostRow(
      postId,
      { status: desiredStatus, metadata: meta },
      accessToken,
      viewerUserId,
    );
  } catch (err) {
    if (
      !isStatusCheckViolation(err)
      || (desiredStatus !== 'deposit_hold' && !CLOSED_LISTING_STATUSES.has(desiredStatus))
    ) {
      throw err;
    }
    meta.soft_status = desiredStatus;
    if (desiredStatus === 'deposit_hold') meta.soft_deposit_hold = true;
    if (CLOSED_LISTING_STATUSES.has(desiredStatus)) {
      Object.assign(meta, stampClosedListingMetadata(meta, desiredStatus));
    }
    return persistPostRow(
      postId,
      { status: 'archived', metadata: meta },
      accessToken,
      viewerUserId,
    );
  }
}

async function persistClosedListing(postId, outcome, metadata, accessToken, viewerUserId = null) {
  const updated = await persistListingLifecycle(postId, outcome, metadata, accessToken, viewerUserId);
  if (resolveEffectivePostStatus(updated) === outcome) return updated;
  return persistPostRow(
    postId,
    { status: 'archived', metadata: stampClosedListingMetadata(updated?.metadata ?? metadata, outcome) },
    accessToken,
    viewerUserId,
  );
}

function attachWarrantyPolicyDto(post) {
  if (!post) return post;
  const breederMeta = asObject(post.breeder_profile?.metadata);
  const warranty_policy = resolveListingWarrantyPolicy(post, breederMeta);
  const deal = asObject(asObject(post.metadata).deal);
  return {
    ...post,
    warranty_policy,
    deal: Object.keys(deal).length ? deal : null,
  };
}

function resolvePostBreederProfile(row, profilesById = new Map()) {
  if (!row) return null;
  if (profilesById.has(row.breeder_profile_id)) {
    return profilesById.get(row.breeder_profile_id);
  }
  if (row.breeder_profile) {
    return row.breeder_profile.warranty_policies
      ? row.breeder_profile
      : toProfile(row.breeder_profile);
  }
  if (row.breeder_profile_id) {
    const memory = memoryProfiles.find((p) => p.id === row.breeder_profile_id);
    if (memory) return toProfile(memory);
  }
  return null;
}

function toPost(row, favoriteIds = new Set(), profilesById = new Map(), viewerUserId = null) {
  if (!row) return row;
  const breeder = resolvePostBreederProfile(row, profilesById);
  return applyDealVisibility(attachWarrantyPolicyDto({
    id: row.id,
    user_id: row.user_id,
    breeder_profile_id: row.breeder_profile_id,
    title: row.title,
    species: row.species,
    pet_type: resolvePostPetType(row.species),
    breed: row.breed,
    gender: row.gender,
    age_months: row.age_months,
    location: row.location,
    price_note: row.price_note,
    description: row.description,
    personality: row.personality ?? [],
    vaccine_status: row.vaccine_status,
    deworming_status: row.deworming_status,
    paperwork: row.paperwork ?? [],
    media_urls: row.media_urls ?? [],
    video_url: row.video_url ?? null,
    contact: row.contact ?? {},
    status: resolveEffectivePostStatus(row),
    post_kind: normalizePostKind(row.post_kind, 'listing'),
    metadata: row.metadata ?? {},
    breeder_profile: breeder,
    is_favorited: favoriteIds.has(row.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }), viewerUserId);
}

/** Feed card list DTO: first image only + optional video; lighter JSON for scroll. */
function toListPost(row, favoriteIds = new Set(), profilesById = new Map(), viewerUserId = null) {
  const post = toPost(row, favoriteIds, profilesById, viewerUserId);
  if (!post) return post;
  const media = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const listThumb =
    post.metadata && typeof post.metadata.list_thumb_url === 'string' ? post.metadata.list_thumb_url.trim() : '';
  const profile = post.breeder_profile;
  const isAnnouncement = normalizePostKind(post.post_kind, 'listing') === 'announcement';
  const announcementMedia = listThumb
    ? [listThumb, ...media.filter((url) => url !== listThumb)]
    : media;
  return {
    ...post,
    // Announcements expand in-feed — keep full body + gallery. Listings stay slim.
    media_urls: isAnnouncement
      ? announcementMedia
      : (listThumb ? [listThumb] : media.slice(0, 1)),
    media_count: media.length,
    description: isAnnouncement
      ? post.description
      : (typeof post.description === 'string' ? post.description.slice(0, 280) : post.description),
    breeder_profile: profile
      ? {
          id: profile.id,
          user_id: profile.user_id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url ?? null,
          verification_status: profile.verification_status,
          location: profile.location,
          contact: profile.contact ?? {},
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          metadata: slimBreederReviewMetadata(profile.metadata),
        }
      : null,
  };
}

function toReport(row) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    target_type: row.target_type ?? (row.breeder_profile_id ? 'breeder_profile' : row.comment_id ? 'comment' : 'post'),
    post_id: row.post_id ?? null,
    breeder_profile_id: row.breeder_profile_id ?? null,
    comment_id: row.comment_id ?? null,
    breeder_profile: row.breeder_profile ?? null,
    reason: row.reason,
    note: row.note ?? '',
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toComment(row, authorDisplayName = '', authorAvatarUrl = null) {
  if (!row) return row;
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id ?? null,
    body: row.body,
    author_display_name: authorDisplayName || 'Pet Health user',
    author_avatar_url: authorAvatarUrl || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const MAX_PET_FEED_COMMENT_LENGTH = 800;
const DEFAULT_PET_FEED_COMMENTS_LIMIT = 100;
const MAX_PET_FEED_COMMENTS_LIMIT = 150;

async function authorDisplayNamesForUserIds(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return new Map(unique.map((id) => [id, 'Pet Health user']));
  }
  const { data, error } = await supabase.from('app_user_profiles').select('user_id, display_name').in('user_id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.user_id, trimText(row.display_name, 160) || 'Pet Health user']));
}

/** Breeder farm avatars keyed by account user_id (best-effort public photo for comments). */
async function authorAvatarUrlsForUserIds(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = getSupabaseServiceClient();
  if (!supabase) return new Map();
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('user_id, avatar_url')
    .in('user_id', unique);
  if (error) throw error;
  return new Map(
    (data ?? [])
      .map((row) => [row.user_id, trimText(row.avatar_url, 1000) || null])
      .filter((entry) => Boolean(entry[1])),
  );
}

async function enrichCommentsWithAuthors(rows) {
  const list = rows ?? [];
  const userIds = list.map((row) => row.user_id);
  const [names, avatars] = await Promise.all([
    authorDisplayNamesForUserIds(userIds),
    authorAvatarUrlsForUserIds(userIds),
  ]);
  return list.map((row) =>
    toComment(row, names.get(row.user_id), avatars.get(row.user_id) || null),
  );
}

async function commentCountsForPostIds(postIds, accessToken) {
  const ids = [...new Set((postIds ?? []).filter(Boolean))];
  const counts = new Map(ids.map((id) => [id, 0]));
  if (ids.length === 0) return counts;
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    for (const row of memoryComments) {
      if (counts.has(row.post_id)) counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
    }
    return counts;
  }
  const { data, error } = await supabase.from('pet_feed_comments').select('post_id').in('post_id', ids);
  if (error) throw error;
  for (const row of data ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

/** Counts all favorites; uses service role because favorites RLS is select-own only. */
async function favoriteCountsForPostIds(postIds) {
  const ids = [...new Set((postIds ?? []).filter(Boolean))];
  const counts = new Map(ids.map((id) => [id, 0]));
  if (ids.length === 0) return counts;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    for (const row of memoryFavorites) {
      if (counts.has(row.post_id)) counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
    }
    return counts;
  }
  const { data, error } = await supabase.from('pet_feed_favorites').select('post_id').in('post_id', ids);
  if (error) throw error;
  for (const row of data ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

function withCommentCount(post, counts) {
  if (!post) return post;
  return { ...post, comment_count: counts.get(post.id) ?? 0 };
}

function withFavoriteCount(post, counts) {
  if (!post) return post;
  return { ...post, favorite_count: counts.get(post.id) ?? 0 };
}

async function withPostEngagementCounts(post, accessToken) {
  if (!post) return post;
  const [commentCounts, favoriteCounts] = await Promise.all([
    commentCountsForPostIds([post.id], accessToken),
    favoriteCountsForPostIds([post.id]),
  ]);
  return withFavoriteCount(withCommentCount(post, commentCounts), favoriteCounts);
}

async function withSignedBreederAvatars(posts) {
  const rows = posts ?? [];
  if (rows.length === 0) return rows;
  const avatarKeys = rows.map((post) => post.breeder_profile?.avatar_url ?? null);
  const signedAvatars = await resolvePrivateMediaUrls(avatarKeys);
  return rows.map((post, index) => {
    if (!post.breeder_profile) return post;
    const avatarUrl = signedAvatars[index];
    if (!avatarUrl || avatarUrl === post.breeder_profile.avatar_url) return post;
    return {
      ...post,
      breeder_profile: {
        ...post.breeder_profile,
        avatar_url: avatarUrl,
      },
    };
  });
}

async function withPostsEngagementCounts(posts, accessToken) {
  const rows = posts ?? [];
  if (rows.length === 0) return rows;
  const ids = rows.map((post) => post.id);
  const [commentCounts, favoriteCounts] = await Promise.all([
    commentCountsForPostIds(ids, accessToken),
    favoriteCountsForPostIds(ids),
  ]);
  const enriched = rows.map((post) => withFavoriteCount(withCommentCount(post, commentCounts), favoriteCounts));
  return withSignedBreederAvatars(enriched);
}

export async function listPetFeedPostComments(postId, accessToken, options = {}) {
  const safePostId = trimText(postId, 64);
  if (!safePostId) return [];
  const limit = Math.min(
    Math.max(Number(options.limit) || DEFAULT_PET_FEED_COMMENTS_LIMIT, 1),
    MAX_PET_FEED_COMMENTS_LIMIT,
  );
  // Service role: deposit_hold comment rows are hidden by published-only RLS for Sen JWT.
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const rows = memoryComments
      .filter((row) => row.post_id === safePostId)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(0, limit);
    return enrichCommentsWithAuthors(rows);
  }
  const { data, error } = await supabase
    .from('pet_feed_comments')
    .select('*')
    .eq('post_id', safePostId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return enrichCommentsWithAuthors(data ?? []);
}

export async function createPetFeedPostComment(userId, postId, body, accessToken, options = {}) {
  const safePostId = trimText(postId, 64);
  const trimmedBody = trimText(body, MAX_PET_FEED_COMMENT_LENGTH);
  const parentId = trimText(options.parentId ?? options.parent_id, 64) || null;
  if (!safePostId) {
    const err = new Error('postId is required');
    err.status = 400;
    err.code = 'MISSING_POST_ID';
    throw err;
  }
  if (!trimmedBody) {
    const err = new Error('Comment cannot be empty.');
    err.status = 400;
    err.code = 'PET_FEED_COMMENT_EMPTY';
    throw err;
  }
  const post = await getPetFeedPost(userId, safePostId, accessToken);
  if (!post || !isPetFeedPostOpenForEngagement(post)) {
    const err = new Error('Pet feed post not found');
    err.status = 404;
    err.code = 'PET_FEED_POST_NOT_FOUND';
    throw err;
  }

  if (parentId) {
    let parent = null;
    // Service role: comment RLS historically hid deposit_hold parents from Sen JWT.
    const supabaseForParent = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
    if (!supabaseForParent) {
      parent = memoryComments.find((row) => row.id === parentId) ?? null;
    } else {
      const { data: parentRow, error: parentError } = await supabaseForParent
        .from('pet_feed_comments')
        .select('*')
        .eq('id', parentId)
        .maybeSingle();
      if (parentError) throw parentError;
      parent = parentRow;
    }
    if (!parent || parent.post_id !== safePostId) {
      const err = new Error('Parent comment not found.');
      err.status = 404;
      err.code = 'PET_FEED_COMMENT_PARENT_NOT_FOUND';
      throw err;
    }
    if (parent.parent_id) {
      const err = new Error('Replies to replies are not supported.');
      err.status = 400;
      err.code = 'PET_FEED_COMMENT_NESTING_UNSUPPORTED';
      throw err;
    }
  }

  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    post_id: safePostId,
    user_id: userId,
    parent_id: parentId,
    body: trimmedBody,
    created_at: now,
    updated_at: now,
  };
  // Service role bypasses published-only comment RLS until migration is applied.
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    memoryComments.push(row);
    const [enriched] = await enrichCommentsWithAuthors([row]);
    return enriched;
  }
  const { data, error } = await supabase.from('pet_feed_comments').insert(row).select('*').single();
  if (error) throw error;
  const [enriched] = await enrichCommentsWithAuthors([data]);
  return enriched;
}

export async function deletePetFeedPostComment(userId, commentId, accessToken) {
  const safeCommentId = trimText(commentId, 64);
  if (!safeCommentId) {
    const err = new Error('commentId is required');
    err.status = 400;
    err.code = 'MISSING_COMMENT_ID';
    throw err;
  }
  // Prefer service role for cascade deletes (parent → replies); still enforce ownership in app code.
  const service = getSupabaseServiceClient();
  const supabase = service ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryComments.findIndex((row) => row.id === safeCommentId && row.user_id === userId);
    if (idx < 0) {
      const err = new Error('Comment not found');
      err.status = 404;
      err.code = 'PET_FEED_COMMENT_NOT_FOUND';
      throw err;
    }
    const removed = memoryComments[idx];
    memoryComments.splice(idx, 1);
    for (let i = memoryComments.length - 1; i >= 0; i -= 1) {
      if (memoryComments[i].parent_id === safeCommentId) memoryComments.splice(i, 1);
    }
    return toComment(removed);
  }

  const { data: existing, error: findError } = await supabase
    .from('pet_feed_comments')
    .select('*')
    .eq('id', safeCommentId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) {
    const err = new Error('Comment not found');
    err.status = 404;
    err.code = 'PET_FEED_COMMENT_NOT_FOUND';
    throw err;
  }
  if (existing.user_id !== userId) {
    const err = new Error('You can only delete your own comment.');
    err.status = 403;
    err.code = 'PET_FEED_COMMENT_FORBIDDEN';
    throw err;
  }

  // Avoid `.select().maybeSingle()` on DELETE — cascade reply deletes can confuse RETURNING.
  const { error } = await supabase
    .from('pet_feed_comments')
    .delete()
    .eq('id', safeCommentId)
    .eq('user_id', userId);
  if (error) throw error;
  return toComment(existing);
}

function assertVerifiedBreederProfile(profile) {
  if (profile?.verification_status === 'verified') return;
  const err = new Error('Breeder verification is required before creating or managing Pet Feed posts.');
  err.status = 403;
  err.code = 'BREEDER_VERIFICATION_REQUIRED';
  throw err;
}

async function favoriteIdsForUser(supabase, userId) {
  const { data, error } = await supabase.from('pet_feed_favorites').select('post_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.post_id));
}

async function blockedBreederIdsForUser(supabase, userId) {
  const { data, error } = await supabase.from('pet_feed_blocked_breeders').select('breeder_profile_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.breeder_profile_id));
}

export async function listPublishedPetFeedPosts(userId, accessToken, options = {}) {
  const kind = options.kind ? normalizePostKind(options.kind, 'listing') : 'listing';
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const blockedBreederIds = new Set(memoryBlockedBreeders.filter((row) => row.user_id === userId).map((row) => row.breeder_profile_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => resolveEffectivePostStatus(post) === 'published'
        && normalizePostKind(post.post_kind, 'listing') === kind
        && (kind === 'announcement' || !blockedBreederIds.has(post.breeder_profile_id)))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, favoriteIds, profilesById, userId));
  }

  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const blockedBreederIds = kind === 'announcement' ? new Set() : await blockedBreederIdsForUser(supabase, userId);
  let query = supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('status', 'published')
    .eq('post_kind', kind)
    .order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? [])
    .filter((row) => resolveEffectivePostStatus(row) === 'published')
    .filter((row) => kind === 'announcement' || !blockedBreederIds.has(row.breeder_profile_id))
    .map((row) => toPost(row, favoriteIds, new Map(), userId));
}

export async function listPublishedPetFeedPostPage(userId, accessToken, options = {}) {
  const limit = normalizePetFeedPageLimit(options.limit);
  const cursor = decodePetFeedCursor(options.cursor);
  const kind = options.kind ? normalizePostKind(options.kind, 'listing') : 'listing';
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const blockedBreederIds = new Set(memoryBlockedBreeders.filter((row) => row.user_id === userId).map((row) => row.breeder_profile_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    const { rows, nextCursor } = paginateFeedRows(
      memoryPosts.filter((post) => resolveEffectivePostStatus(post) === 'published'
        && normalizePostKind(post.post_kind, 'listing') === kind
        && (kind === 'announcement' || !blockedBreederIds.has(post.breeder_profile_id))),
      limit,
      cursor,
    );
    return {
      data: await withPostsEngagementCounts(
        rows.map((post) => toListPost(post, favoriteIds, profilesById, userId)),
        accessToken,
      ),
      nextCursor,
    };
  }

  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const blockedBreederIds = kind === 'announcement' ? new Set() : await blockedBreederIdsForUser(supabase, userId);
  let query = supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('status', 'published')
    .eq('post_kind', kind)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (blockedBreederIds.size > 0) {
    query = query.not('breeder_profile_id', 'in', `(${Array.from(blockedBreederIds).join(',')})`);
  }
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).filter((row) => resolveEffectivePostStatus(row) === 'published');
  const pageRows = rows.slice(0, limit);
  return {
    data: await withPostsEngagementCounts(
      pageRows.map((row) => toListPost(row, favoriteIds, new Map(), userId)),
      accessToken,
    ),
    nextCursor: rows.length > limit ? encodePetFeedCursor(pageRows[pageRows.length - 1]) : null,
  };
}

export async function listVerifiedBreederProfiles(userId, accessToken) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const blockedBreederIds = new Set(memoryBlockedBreeders.filter((row) => row.user_id === userId).map((row) => row.breeder_profile_id));
    return memoryProfiles
      .filter((profile) => profile.verification_status === 'verified' && !blockedBreederIds.has(profile.id))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(toProfile);
  }
  const blockedBreederIds = userId ? await blockedBreederIdsForUser(supabase, userId) : new Set();
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((profile) => !blockedBreederIds.has(profile.id)).map(toProfile);
}

export async function getPetFeedPost(userId, postId, accessToken) {
  // Service role: Sen JWT RLS historically hides deposit_hold/sold from non-owners.
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const favoriteIds = new Set(memoryFavorites.filter((row) => row.user_id === userId).map((row) => row.post_id));
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    const row = memoryPosts.find((post) => post.id === postId);
    if (!canViewerAccessPetFeedPost(row, userId)) return null;
    const post = toPost(row, favoriteIds, profilesById, userId);
    if (!post) return post;
    return withPostEngagementCounts(post, accessToken);
  }
  const favoriteIds = await favoriteIdsForUser(supabase, userId);
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!canViewerAccessPetFeedPost(data, userId)) return null;
  const post = toPost(data, favoriteIds, new Map(), userId);
  if (!post) return post;
  return withPostEngagementCounts(post, accessToken);
}

/** Public share/OG card for published listings only (no auth, no contact/private fields). */
export async function getPublishedPetFeedShareCard(postId) {
  const safePostId = trimText(postId, 80);
  if (!safePostId) return null;

  const supabase = getSupabaseServiceClient();
  let row = null;
  if (!supabase) {
    row = memoryPosts.find((post) => post.id === safePostId && post.status === 'published') ?? null;
  } else {
    const { data, error } = await supabase
      .from('pet_feed_posts')
      .select('id, title, description, species, breed, location, price_note, media_urls, metadata, status, post_kind, created_at')
      .eq('id', safePostId)
      .eq('status', 'published')
      .maybeSingle();
    if (error) {
      // Invalid UUID / not found → treat as missing for public share cards.
      if (error.code === '22P02' || error.code === 'PGRST116') return null;
      throw error;
    }
    row = data;
  }
  if (!row) return null;

  const media = Array.isArray(row.media_urls) ? row.media_urls.filter(Boolean) : [];
  const listThumb =
    row.metadata && typeof row.metadata.list_thumb_url === 'string' ? row.metadata.list_thumb_url.trim() : '';
  const imageUrl = listThumb || media[0] || '';
  const title = trimText(row.title, 120) || 'PetCare: Pet Marketplace listing';
  const description = trimText(
    [row.breed, row.location, row.price_note].filter(Boolean).join(' · ')
      || row.description
      || 'Xem tin đăng thú cưng trên PetCare: Pet Marketplace.',
    200,
  );

  return {
    id: row.id,
    title,
    description,
    imageUrl,
    species: trimText(row.species, 40),
    breed: trimText(row.breed, 80),
    location: trimText(row.location, 80),
    priceNote: trimText(row.price_note, 80),
    postKind: normalizePostKind(row.post_kind, 'listing'),
    createdAt: row.created_at ?? null,
  };
}

/** Review stats only — safe to include on feed list cards without full breeder metadata. */
function slimBreederReviewMetadata(metadata) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  const out = {};
  const reviewCount = Number(meta.review_count ?? meta.reviewCount);
  if (Number.isFinite(reviewCount) && reviewCount > 0) {
    out.review_count = Math.floor(reviewCount);
  }
  const reviewAvg = Number(meta.review_avg ?? meta.reviewAverage);
  if (Number.isFinite(reviewAvg) && reviewAvg > 0) {
    out.review_avg = reviewAvg;
  }
  return out;
}

function contactPresenceFromContact(contact, metadata = {}) {
  const c = contact && typeof contact === 'object' ? contact : {};
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  const has = (v) => typeof v === 'string' && v.trim().length > 0;
  return {
    zalo: has(c.zalo),
    phone: has(c.phone),
    facebook: has(c.facebook),
    tiktok: has(c.tiktok) || has(meta.tiktok_url),
  };
}

/** Strip contact values for public list, keep boolean presence for trust scoring. */
function stripContactFromProfile(profile) {
  if (!profile) return null;
  const { contact, ...rest } = profile;
  const metadata = {
    ...(rest.metadata && typeof rest.metadata === 'object' ? rest.metadata : {}),
    contact_presence: contactPresenceFromContact(contact, rest.metadata),
  };
  return { ...rest, metadata };
}

/** Public list card: slim media, no contact fields. */
function toPublicListPost(row) {
  const post = toListPost(row, new Set());
  if (!post) return post;
  return {
    ...post,
    contact: {},
    is_favorited: false,
    breeder_profile: stripContactFromProfile(post.breeder_profile),
  };
}

/** Public detail: full media/description; contact kept for marketplace outreach. */
function toPublicDetailPost(row) {
  const post = toPost(row, new Set());
  if (!post) return post;
  return {
    ...post,
    is_favorited: false,
    breeder_profile: post.breeder_profile
      ? {
          ...post.breeder_profile,
          contact: post.breeder_profile.contact ?? {},
        }
      : null,
  };
}

function toPublicBreeder(profile, { includeContact = false } = {}) {
  const mapped = toProfile(profile);
  if (!mapped) return mapped;
  const withPolicies = {
    ...mapped,
    warranty_policies: listWarrantyPoliciesFromMetadata(mapped.metadata),
    warranty_policy_trust_awarded: Boolean(asObject(mapped.metadata).warranty_policy_trust_awarded),
  };
  if (includeContact) return withPolicies;
  return stripContactFromProfile(withPolicies);
}

async function withPublicBreederListingCounts(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) return profiles;
  const ids = profiles.map((p) => p.id).filter(Boolean);
  const activeCounts = new Map(ids.map((id) => [id, 0]));
  const soldCounts = new Map(ids.map((id) => [id, 0]));
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    for (const post of memoryPosts) {
      if (
        normalizePostKind(post.post_kind, 'listing') !== 'listing'
        || !activeCounts.has(post.breeder_profile_id)
      ) {
        continue;
      }
      const effective = resolveEffectivePostStatus(post);
      if (effective === 'published') {
        activeCounts.set(
          post.breeder_profile_id,
          (activeCounts.get(post.breeder_profile_id) || 0) + 1,
        );
      } else if (!isOwnerDeletedListing(post.metadata) && effective === 'sold') {
        soldCounts.set(
          post.breeder_profile_id,
          (soldCounts.get(post.breeder_profile_id) || 0) + 1,
        );
      }
    }
  } else {
    const { data, error } = await supabase
      .from('pet_feed_posts')
      .select('breeder_profile_id, status, metadata')
      .in('breeder_profile_id', ids)
      .eq('post_kind', 'listing')
      .in('status', ['published', 'sold', 'cancelled', 'archived']);
    if (error) throw error;
    for (const row of data ?? []) {
      const id = row.breeder_profile_id;
      if (!activeCounts.has(id)) continue;
      const effective = resolveEffectivePostStatus(row);
      if (effective === 'published') {
        activeCounts.set(id, (activeCounts.get(id) || 0) + 1);
      } else if (!isOwnerDeletedListing(row.metadata) && effective === 'sold') {
        soldCounts.set(id, (soldCounts.get(id) || 0) + 1);
      }
    }
  }

  return profiles.map((profile) => {
    const active = activeCounts.get(profile.id) || 0;
    const sold = soldCounts.get(profile.id) || 0;
    return {
      ...profile,
      metadata: {
        ...(profile.metadata && typeof profile.metadata === 'object'
          ? profile.metadata
          : {}),
        active_listings: active,
        pets_rehomed: sold,
      },
    };
  });
}

function enrichPublicProfileWithFarmPetCounts(profile, listings) {
  let active = 0;
  let sold = 0;
  for (const post of listings || []) {
    if (post.status === 'published') active += 1;
    else if (!isOwnerDeletedListing(post.metadata) && post.status === 'sold') {
      sold += 1;
    }
  }
  return {
    ...profile,
    metadata: {
      ...(profile.metadata && typeof profile.metadata === 'object'
        ? profile.metadata
        : {}),
      active_listings: active,
      pets_rehomed: sold,
    },
  };
}

/** Public SEO feed page (published only, no auth / no block filters). */
export async function listPublicPetFeedPostPage(options = {}) {
  const limit = normalizePetFeedPageLimit(options.limit);
  const cursor = decodePetFeedCursor(options.cursor);
  const kind = options.kind ? normalizePostKind(options.kind, 'listing') : 'listing';
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    const { rows, nextCursor } = paginateFeedRows(
      memoryPosts.filter(
        (post) => resolveEffectivePostStatus(post) === 'published'
          && normalizePostKind(post.post_kind, 'listing') === kind,
      ),
      limit,
      cursor,
    );
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    const data = await withPostsEngagementCounts(
      rows.map((post) => toPublicListPost({ ...post, breeder_profile: profilesById.get(post.breeder_profile_id) ?? null })),
      null,
    );
    return { data, nextCursor };
  }

  let query = supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('status', 'published')
    .eq('post_kind', kind)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).filter((row) => resolveEffectivePostStatus(row) === 'published');
  const pageRows = rows.slice(0, limit);
  return {
    data: await withPostsEngagementCounts(pageRows.map((row) => toPublicListPost(row)), null),
    nextCursor: rows.length > limit ? encodePetFeedCursor(pageRows[pageRows.length - 1]) : null,
  };
}

/** Public SEO post detail (published only). */
export async function getPublicPetFeedPost(postId) {
  const safePostId = trimText(postId, 80);
  if (!safePostId) return null;
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    const row = memoryPosts.find((post) => post.id === safePostId && isPubliclyViewableListingRow(post));
    if (!row) return null;
    const post = toPublicDetailPost({ ...row, breeder_profile: profilesById.get(row.breeder_profile_id) ?? null });
    return withPostEngagementCounts(post, null);
  }

  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', safePostId)
    .in('status', ['published', 'deposit_hold', 'sold', 'cancelled', 'archived'])
    .maybeSingle();
  if (error) {
    if (error.code === '22P02' || error.code === 'PGRST116') return null;
    throw error;
  }
  if (!isPubliclyViewableListingRow(data)) return null;
  return withPostEngagementCounts(toPublicDetailPost(data), null);
}

/** Public verified breeders directory. */
export async function listPublicVerifiedBreederProfiles(options = {}) {
  const limit = normalizePetFeedPageLimit(options.limit ?? 24);
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    const rows = memoryProfiles
      .filter((profile) => profile.verification_status === 'verified')
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map((profile) => toPublicBreeder(profile, { includeContact: false }));
    return {
      data: await withPublicBreederListingCounts(rows),
      nextCursor: null,
    };
  }

  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).map((profile) =>
    toPublicBreeder(profile, { includeContact: false }),
  );
  return {
    data: await withPublicBreederListingCounts(rows),
    nextCursor: null,
  };
}

/** Public farm "Thú cưng" tab: for-sale + deposit hold + completed/sold/cancelled listings. */
function isPublicFarmPetListing(post) {
  if (normalizePostKind(post.post_kind, 'listing') !== 'listing') return false;
  if (isOwnerDeletedListing(post.metadata)) return false;
  const status = resolveEffectivePostStatus(post);
  if (
    status === 'published'
    || status === 'deposit_hold'
    || status === 'sold'
    || status === 'cancelled'
  ) {
    return true;
  }
  if (
    status === 'archived'
    && (isSoldListingMetadata(post.metadata) || isCancelledListingMetadata(post.metadata))
  ) {
    return true;
  }
  return false;
}

function sortPublicFarmPetListings(a, b) {
  const rank = (post) => {
    const status = resolveEffectivePostStatus(post);
    if (status === 'published') return 0;
    if (status === 'deposit_hold') return 1;
    return 2;
  };
  const d = rank(a) - rank(b);
  if (d !== 0) return d;
  return a.created_at < b.created_at ? 1 : -1;
}

/** Public verified breeder profile + farm pets (for sale + completed). */
export async function getPublicBreederProfile(profileId) {
  const safeId = trimText(profileId, 80);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();

  let profile = null;
  if (!supabase) {
    profile = memoryProfiles.find(
      (row) => row.id === safeId && row.verification_status === 'verified',
    ) ?? null;
  } else {
    const { data, error } = await supabase
      .from('breeder_profiles')
      .select('*')
      .eq('id', safeId)
      .eq('verification_status', 'verified')
      .maybeSingle();
    if (error) {
      if (error.code === '22P02' || error.code === 'PGRST116') return null;
      throw error;
    }
    profile = data;
  }
  if (!profile) return null;

  const publicProfile = toPublicBreeder(profile, { includeContact: true });
  let listings = [];
  if (!supabase) {
    listings = memoryPosts
      .filter((post) => post.breeder_profile_id === safeId && isPublicFarmPetListing(post))
      .sort(sortPublicFarmPetListings)
      .map((post) => toPublicListPost({ ...post, breeder_profile: publicProfile }));
  } else {
    const { data, error } = await supabase
      .from('pet_feed_posts')
      .select('*, breeder_profile:breeder_profiles(*)')
      .eq('breeder_profile_id', safeId)
      .eq('post_kind', 'listing')
      .in('status', ['published', 'deposit_hold', 'sold', 'cancelled', 'archived'])
      .order('created_at', { ascending: false })
      .limit(96);
    if (error) throw error;
    listings = (data ?? [])
      .filter((row) => isPublicFarmPetListing(row))
      .sort(sortPublicFarmPetListings)
      .slice(0, 48)
      .map((row) => toPublicListPost(row));
  }

  const listingsWithEngagement = await withPostsEngagementCounts(listings, null);
  return {
    profile: enrichPublicProfileWithFarmPetCounts(publicProfile, listingsWithEngagement),
    listings: listingsWithEngagement,
  };
}

/** Verified breeder profile for direct farm chat routing. */
export async function getVerifiedBreederProfileForMessaging(profileId, accessToken) {
  const safeId = trimText(profileId, 80);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    return toProfile(
      memoryProfiles.find(
        (row) => row.id === safeId && row.verification_status === 'verified',
      ) ?? null,
    );
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('id', safeId)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (error) {
    if (error.code === '22P02' || error.code === 'PGRST116') return null;
    throw error;
  }
  return toProfile(data);
}

export async function getMyBreederProfile(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) return toProfile(memoryProfiles.find((profile) => profile.user_id === userId) ?? null);
  const { data, error } = await supabase.from('breeder_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

export async function upsertMyBreederProfile(userId, payload, accessToken) {
  // Prefer service role so profile save is not blocked by JWT/RLS/network edge cases
  // (same pattern as updateMyBreederProfilePhotos).
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  let existing = null;
  if (supabase) {
    const { data, error } = await supabase
      .from('breeder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    existing = toProfile(data);
  } else {
    existing = await getMyBreederProfile(userId, accessToken);
  }
  const row = normalizeProfilePayload(
    userId,
    { ...payload, existingVerificationStatus: existing?.verification_status },
    existing?.id,
  );
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    const next = { ...(idx >= 0 ? memoryProfiles[idx] : { created_at: new Date().toISOString() }), ...row };
    if (idx >= 0) memoryProfiles[idx] = next;
    else memoryProfiles.push(next);
    return toProfile(next);
  }
  const { data, error } = await supabase.from('breeder_profiles').upsert(row, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  if (!data) {
    const err = new Error('Breeder profile save returned no row.');
    err.status = 500;
    err.code = 'BREEDER_PROFILE_UPSERT_EMPTY';
    throw err;
  }
  return toProfile(data);
}

/** Update avatar/cover only — does not change verification_status. */
export async function updateMyBreederProfilePhotos(userId, payload, accessToken) {
  const existing = await getMyBreederProfile(userId, accessToken);
  if (!existing) {
    const err = new Error('Breeder profile not found.');
    err.status = 404;
    err.code = 'BREEDER_PROFILE_NOT_FOUND';
    throw err;
  }

  const avatarUrl = trimText(payload.avatarUrl ?? payload.avatar_url, 1000);
  const coverUrl = trimText(payload.coverUrl ?? payload.cover_url, 1000);
  if (!avatarUrl && !coverUrl) {
    const err = new Error('avatarUrl or coverUrl is required.');
    err.status = 400;
    err.code = 'BREEDER_PHOTO_REQUIRED';
    throw err;
  }
  if (
    (avatarUrl && (avatarUrl.startsWith('memory://') || avatarUrl.startsWith('storage://')))
    || (coverUrl && (coverUrl.startsWith('memory://') || coverUrl.startsWith('storage://')))
  ) {
    const err = new Error('Photo storage is unavailable. Please retry shortly.');
    err.status = 503;
    err.code = 'BREEDER_PHOTO_STORAGE_UNAVAILABLE';
    throw err;
  }

  const metadata = {
    ...normalizeJsonObject(existing.metadata),
  };
  if (coverUrl) {
    metadata.cover_url = coverUrl;
    metadata.coverUrl = coverUrl;
    metadata.coverImageUrl = coverUrl;
  }

  const updates = {
    updated_at: new Date().toISOString(),
    metadata,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  };

  // Prefer service role so photo updates always persist (public pages read via service).
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    if (idx < 0) {
      const err = new Error('Breeder profile not found.');
      err.status = 404;
      err.code = 'BREEDER_PROFILE_NOT_FOUND';
      throw err;
    }
    memoryProfiles[idx] = { ...memoryProfiles[idx], ...updates };
    return toProfile(memoryProfiles[idx]);
  }

  const { data, error } = await supabase
    .from('breeder_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return toProfile(data);
}

export async function cancelMyBreederVerificationRequest(userId, accessToken) {
  const existing = await getMyBreederProfile(userId, accessToken);
  if (!existing) {
    const err = new Error('Breeder profile not found.');
    err.status = 404;
    err.code = 'BREEDER_PROFILE_NOT_FOUND';
    throw err;
  }
  if (existing.verification_status !== 'pending_review') {
    const err = new Error('Only pending breeder verification requests can be cancelled.');
    err.status = 400;
    err.code = 'BREEDER_CANCEL_NOT_ALLOWED';
    throw err;
  }
  const next = {
    ...existing,
    verification_status: 'unverified',
    updated_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    if (idx < 0) {
      const err = new Error('Breeder profile not found.');
      err.status = 404;
      err.code = 'BREEDER_PROFILE_NOT_FOUND';
      throw err;
    }
    memoryProfiles[idx] = { ...memoryProfiles[idx], verification_status: 'unverified', updated_at: next.updated_at };
    return toProfile(memoryProfiles[idx]);
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({ verification_status: 'unverified', updated_at: next.updated_at })
    .eq('user_id', userId)
    .eq('verification_status', 'pending_review')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error('Only pending breeder verification requests can be cancelled.');
    err.status = 400;
    err.code = 'BREEDER_CANCEL_NOT_ALLOWED';
    throw err;
  }
  return toProfile(data);
}

export async function createPetFeedPost(userId, payload, accessToken, _options = {}) {
  const profile = await getMyBreederProfile(userId, accessToken);
  assertVerifiedBreederProfile(profile);
  assertHealthEvidenceForReview(payload);
  const base = {
    ...normalizePostPayload(userId, { ...payload, breederProfileId: profile?.id, postKind: 'listing' }),
    post_kind: 'listing',
    status: normalizeUserEditablePostStatus(payload.status, 'draft'),
    created_at: new Date().toISOString(),
  };
  const row = applyWarrantyPolicyBind(null, base, profile);
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    memoryPosts.push(row);
    return toPost(row, new Set(), new Map(profile ? [[profile.id, profile]] : []), userId);
  }
  const { data, error } = await supabase.from('pet_feed_posts').insert(row).select('*, breeder_profile:breeder_profiles(*)').single();
  if (error) throw error;
  return toPost(data, new Set(), new Map(), userId);
}

/** Count listing posts with video created by the user since `sinceIso` (inclusive). */
export async function countMyPetFeedVideoListingsSince(userId, sinceIso, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    return memoryPosts.filter(
      (post) =>
        post.user_id === userId
        && post.post_kind === 'listing'
        && Boolean(post.video_url)
        && String(post.created_at || '') >= sinceIso,
    ).length;
  }
  const { count, error } = await supabase
    .from('pet_feed_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('post_kind', 'listing')
    .not('video_url', 'is', null)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function createAnnouncementPost(userId, payload, accessToken) {
  const title = trimText(payload.title, 120);
  const description = trimText(payload.description, 2000);
  if (!title) {
    const err = new Error('Announcement title is required.');
    err.status = 400;
    err.code = 'ANNOUNCEMENT_TITLE_REQUIRED';
    throw err;
  }
  if (!description) {
    const err = new Error('Announcement description is required.');
    err.status = 400;
    err.code = 'ANNOUNCEMENT_DESCRIPTION_REQUIRED';
    throw err;
  }
  const category = normalizeAnnouncementCategory(payload.category);
  const row = {
    id: randomUUID(),
    user_id: userId,
    breeder_profile_id: null,
    post_kind: 'announcement',
    title,
    species: 'general',
    breed: '',
    gender: '',
    age_months: null,
    location: '',
    price_note: '',
    description,
    personality: [],
    vaccine_status: '',
    deworming_status: '',
    paperwork: [],
    media_urls: normalizeStringArray(payload.mediaUrls ?? payload.media_urls, 6),
    video_url: trimText(payload.videoUrl ?? payload.video_url, 1000) || null,
    contact: {},
    status: 'published',
    metadata: {
      category,
      ctaLabel: trimText(payload.ctaLabel ?? payload.cta_label, 80),
      ctaUrl: trimText(payload.ctaUrl ?? payload.cta_url, 500),
      authorLabel: 'PetCare: Pet Marketplace',
      ...normalizeJsonObject(payload.metadata),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    memoryPosts.push(row);
    return toPost(row);
  }
  const { data, error } = await supabase.from('pet_feed_posts').insert(row).select('*').single();
  if (error) throw error;
  return toPost(data);
}

export async function adminUpdateAnnouncementPost(postId, payload) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId && post.post_kind === 'announcement');
    if (idx < 0) return null;
    const existing = memoryPosts[idx];
    const metadata = { ...(existing.metadata ?? {}) };
    if (payload.category !== undefined) metadata.category = normalizeAnnouncementCategory(payload.category);
    if (payload.ctaLabel !== undefined || payload.cta_label !== undefined) {
      metadata.ctaLabel = trimText(payload.ctaLabel ?? payload.cta_label, 80);
    }
    if (payload.ctaUrl !== undefined || payload.cta_url !== undefined) {
      metadata.ctaUrl = trimText(payload.ctaUrl ?? payload.cta_url, 500);
    }
    memoryPosts[idx] = {
      ...existing,
      title: payload.title !== undefined ? trimText(payload.title, 120) || existing.title : existing.title,
      description: payload.description !== undefined ? trimText(payload.description, 2000) || existing.description : existing.description,
      status: payload.status !== undefined ? normalizeStatus(payload.status, existing.status) : existing.status,
      metadata,
      updated_at: new Date().toISOString(),
    };
    return toPost(memoryPosts[idx]);
  }
  const { data: existing, error: loadError } = await supabase
    .from('pet_feed_posts')
    .select('*')
    .eq('id', postId)
    .eq('post_kind', 'announcement')
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) return null;
  const metadata = { ...(existing.metadata ?? {}) };
  if (payload.category !== undefined) metadata.category = normalizeAnnouncementCategory(payload.category);
  if (payload.ctaLabel !== undefined || payload.cta_label !== undefined) {
    metadata.ctaLabel = trimText(payload.ctaLabel ?? payload.cta_label, 80);
  }
  if (payload.ctaUrl !== undefined || payload.cta_url !== undefined) {
    metadata.ctaUrl = trimText(payload.ctaUrl ?? payload.cta_url, 500);
  }
  const patch = {
    title: payload.title !== undefined ? trimText(payload.title, 120) || existing.title : existing.title,
    description: payload.description !== undefined ? trimText(payload.description, 2000) || existing.description : existing.description,
    status: payload.status !== undefined ? normalizeStatus(payload.status, existing.status) : existing.status,
    metadata,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('pet_feed_posts').update(patch).eq('id', postId).select('*').maybeSingle();
  if (error) throw error;
  return toPost(data);
}

export async function listMyAnnouncementPosts(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    return memoryPosts
      .filter((post) => post.user_id === userId && normalizePostKind(post.post_kind, 'listing') === 'announcement')
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post));
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('post_kind', 'announcement')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toPost(row));
}

export async function updatePetFeedPost(userId, postId, payload, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId && post.user_id === userId);
    if (idx < 0) return null;
    const profile = await getMyBreederProfile(userId, accessToken);
    assertVerifiedBreederProfile(profile);
    if (memoryPosts[idx].status === 'deposit_hold' || CLOSED_LISTING_STATUSES.has(memoryPosts[idx].status)) {
      throw httpError('This listing cannot be edited while deposit is held or completed.', 400, 'LISTING_LOCKED');
    }
    const nextRow = applyWarrantyPolicyBind(
      memoryPosts[idx],
      {
        ...memoryPosts[idx],
        ...normalizePostPayload(userId, payload, memoryPosts[idx]),
        status: normalizeUserEditablePostStatus(payload.status, memoryPosts[idx].status),
      },
      profile,
    );
    memoryPosts[idx] = nextRow;
    return toPost(memoryPosts[idx], new Set(), new Map(profile ? [[profile.id, profile]] : []), userId);
  }
  const existing = await getPetFeedPost(userId, postId, accessToken);
  if (!existing || existing.user_id !== userId) return null;
  if (existing.status === 'deposit_hold' || CLOSED_LISTING_STATUSES.has(existing.status)) {
    throw httpError('This listing cannot be edited while deposit is held or completed.', 400, 'LISTING_LOCKED');
  }
  const profile = await getMyBreederProfile(userId, accessToken);
  assertVerifiedBreederProfile(profile);
  const updates = applyWarrantyPolicyBind(
    existing,
    {
      ...normalizePostPayload(userId, payload, existing),
      status: normalizeUserEditablePostStatus(payload.status, existing.status),
    },
    profile,
  );
  const { id: _id, user_id: _userId, ...patch } = updates;
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .update(patch)
    .eq('id', postId)
    .eq('user_id', userId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .maybeSingle();
  if (error) throw error;
  return toPost(data, new Set(), new Map(), userId);
}

/** Bind/change warranty policy without demoting published listings to pending_review. */
export async function updateListingWarrantyPolicy(userId, postId, warrantyPolicyId, accessToken) {
  const existing = await getPetFeedPost(userId, postId, accessToken);
  if (!existing || existing.user_id !== userId) return null;
  if (existing.status === 'deposit_hold' || CLOSED_LISTING_STATUSES.has(existing.status)) {
    throw httpError('This listing cannot be edited while deposit is held or completed.', 400, 'LISTING_LOCKED');
  }
  const profile = await getMyBreederProfile(userId, accessToken);
  assertVerifiedBreederProfile(profile);

  const requested =
    warrantyPolicyId == null || String(warrantyPolicyId).trim() === ''
      ? null
      : String(warrantyPolicyId).trim();
  const bound = applyWarrantyPolicyBind(
    existing,
    {
      ...existing,
      metadata: {
        ...asObject(existing.metadata),
        warranty_policy_id: requested,
      },
    },
    profile,
  );

  const patch = { metadata: bound.metadata };
  // Repair listings accidentally demoted by full PUT while attaching warranty.
  const meta = asObject(existing.metadata);
  if (
    existing.status === 'pending_review'
    && !meta.rejection_reason
    && !meta.rejected_at
  ) {
    patch.status = 'published';
  }

  return persistPostRow(postId, patch, accessToken);
}

function assertOwnerCanDeleteListing(post) {
  const deal = asObject(asObject(post?.metadata).deal);
  const decision = evaluateOwnerDeleteListing({
    isOwner: true,
    status: post?.status,
    metadata: post?.metadata,
    metadataSold: isSoldListingMetadata(post?.metadata),
    metadataCancelled: isCancelledListingMetadata(post?.metadata),
    completedAt: deal.completed_at || deal.completedAt,
    senConfirmedCompleteAt: deal.sen_confirmed_complete_at || deal.senConfirmedCompleteAt,
    autoCompletedAt: deal.auto_completed_at || deal.autoCompletedAt,
    updatedAt: post?.updated_at,
    createdAt: post?.created_at,
  });
  if (decision.allowed) return;
  if (decision.reason === 'deposit_hold') {
    throw httpError(
      'Listings with an active deposit cannot be deleted.',
      400,
      'LISTING_DELETE_DEPOSIT_HOLD',
    );
  }
  if (decision.reason === 'sold_cooldown') {
    throw httpError(
      `Completed listings can be deleted ${OWNER_DELETE_SOLD_COOLDOWN_DAYS} days after completion.`,
      400,
      'LISTING_DELETE_SOLD_COOLDOWN',
    );
  }
  throw httpError('This listing cannot be deleted.', 400, 'LISTING_DELETE_NOT_ALLOWED');
}

/** Soft-delete: owner archives their listing so it leaves the public feed and farm. */
export async function archiveMyPetFeedPost(userId, postId, accessToken) {
  const existing = await getPetFeedPost(userId, postId, accessToken);
  if (!existing || existing.user_id !== userId) return null;
  assertOwnerCanDeleteListing(existing);

  const now = new Date().toISOString();
  const meta = asObject(existing.metadata);
  const nextMeta = {
    ...meta,
    owner_deleted: true,
    owner_deleted_at: now,
  };
  delete nextMeta.soft_status;
  delete nextMeta.soft_deposit_hold;

  return persistPostRow(
    postId,
    { status: 'archived', metadata: nextMeta },
    accessToken,
  );
}

export async function favoritePetFeedPost(userId, postId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    if (!memoryFavorites.some((row) => row.user_id === userId && row.post_id === postId)) {
      memoryFavorites.push({ user_id: userId, post_id: postId, created_at: new Date().toISOString() });
    }
    return true;
  }
  // Prefer INSERT over UPSERT: RLS has insert/delete but no update policy.
  // Upsert-on-conflict requires UPDATE and returns 42501 INTERNAL_ERROR when the row exists.
  const { error } = await supabase
    .from('pet_feed_favorites')
    .insert({ user_id: userId, post_id: postId });
  if (!error) return true;
  if (error.code === '23505') return true;
  if (/duplicate|unique/i.test(String(error.message || ''))) return true;
  throw error;
}

export async function unfavoritePetFeedPost(userId, postId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryFavorites.findIndex((row) => row.user_id === userId && row.post_id === postId);
    if (idx >= 0) memoryFavorites.splice(idx, 1);
    return true;
  }
  const { error } = await supabase.from('pet_feed_favorites').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) throw error;
  return true;
}

/** True when this user favorited the post (works for listing + announcement). */
export async function isPetFeedPostFavorited(userId, postId, accessToken) {
  const safePostId = trimText(postId, 80);
  if (!userId || !safePostId) return false;
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    return memoryFavorites.some((row) => row.user_id === userId && row.post_id === safePostId);
  }
  const { data, error } = await supabase
    .from('pet_feed_favorites')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_id', safePostId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.post_id);
}

export async function listFavoritePetFeedPosts(userId, accessToken) {
  const posts = await listPublishedPetFeedPosts(userId, accessToken);
  return posts.filter((post) => post.is_favorited);
}

export async function listMyPetFeedPosts(userId, accessToken, options = {}) {
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : undefined;
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    const rows = memoryPosts
      .filter((post) => post.user_id === userId && isOwnerVisibleMyListing(post))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const slice = limit ? rows.slice(0, limit) : rows;
    return slice.map((post) => toPost(post, new Set(), profilesById, userId));
  }
  let query = supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).filter((row) => isOwnerVisibleMyListing(row));
  const slice = limit ? rows.slice(0, limit) : rows;
  return slice.map((row) => toPost(row, new Set(), new Map(), userId));
}

export async function countMyPetFeedPostStats(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const mine = memoryPosts.filter((post) => post.user_id === userId && post.status !== 'archived');
    return {
      total: mine.length,
      published: mine.filter((post) => post.status === 'published').length,
      pending: mine.filter((post) => post.status === 'pending_review').length,
    };
  }
  const base = () =>
    supabase.from('pet_feed_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'archived');
  const [totalRes, publishedRes, pendingRes] = await Promise.all([
    base(),
    base().eq('status', 'published'),
    base().eq('status', 'pending_review'),
  ]);
  if (totalRes.error) throw totalRes.error;
  if (publishedRes.error) throw publishedRes.error;
  if (pendingRes.error) throw pendingRes.error;
  return {
    total: totalRes.count ?? 0,
    published: publishedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
  };
}

export async function reportPetFeedPost(userId, postId, payload, accessToken) {
  const row = {
    id: randomUUID(),
    user_id: userId,
    target_type: 'post',
    post_id: postId,
    breeder_profile_id: null,
    comment_id: null,
    reason: trimText(payload.reason, 120) || 'other',
    note: trimText(payload.note, 1200),
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    memoryReports.push(row);
    return toReport(row);
  }
  const { data, error } = await supabase.from('pet_feed_reports').insert(row).select('*').single();
  if (error) throw error;
  return toReport(data);
}

export async function reportBreederProfile(userId, profileId, payload, accessToken) {
  const row = {
    id: randomUUID(),
    user_id: userId,
    target_type: 'breeder_profile',
    post_id: null,
    breeder_profile_id: profileId,
    comment_id: null,
    reason: trimText(payload.reason, 120) || 'other',
    note: trimText(payload.note, 1200),
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const profile = memoryProfiles.find((item) => item.id === profileId) ?? null;
    memoryReports.push(row);
    return toReport({ ...row, breeder_profile: toProfile(profile) });
  }
  const { data, error } = await supabase
    .from('pet_feed_reports')
    .insert(row)
    .select('*, breeder_profile:breeder_profiles(*)')
    .single();
  if (error) throw error;
  return toReport(data);
}

export async function blockBreederProfile(userId, profileId, accessToken) {
  const row = {
    user_id: userId,
    breeder_profile_id: profileId,
    created_at: new Date().toISOString(),
  };
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const exists = memoryBlockedBreeders.some((item) => item.user_id === userId && item.breeder_profile_id === profileId);
    if (!exists) memoryBlockedBreeders.push(row);
    return row;
  }
  const { data, error } = await supabase
    .from('pet_feed_blocked_breeders')
    .upsert(row, { onConflict: 'user_id,breeder_profile_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function unblockBreederProfile(userId, profileId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memoryBlockedBreeders.findIndex((item) => item.user_id === userId && item.breeder_profile_id === profileId);
    if (idx >= 0) memoryBlockedBreeders.splice(idx, 1);
    return;
  }
  const { error } = await supabase
    .from('pet_feed_blocked_breeders')
    .delete()
    .eq('user_id', userId)
    .eq('breeder_profile_id', profileId);
  if (error) throw error;
}

export async function listAdminPetFeedPosts(status = 'pending_review') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryPosts
      .filter((post) => normalizePostKind(post.post_kind, 'listing') === 'listing' && (!status || post.status === status))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((post) => toPost(post, new Set(), profilesById));
  }
  let query = supabase.from('pet_feed_posts').select('*, breeder_profile:breeder_profiles(*)').eq('post_kind', 'listing').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toPost(row));
}

export async function getAdminPetFeedPostById(postId) {
  const safeId = trimText(postId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryPosts.find((post) => post.id === safeId) ?? null;
    return row ? toPost(row) : null;
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data) : null;
}

export async function getAdminPetFeedReportById(reportId) {
  const safeId = trimText(reportId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryReports.find((report) => report.id === safeId) ?? null;
    return row ? toReport(row) : null;
  }
  const { data, error } = await supabase
    .from('pet_feed_reports')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return data ? toReport(data) : null;
}

export async function getAdminBreederProfileByUserId(userId) {
  const safeId = trimText(userId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memoryProfiles.find((profile) => profile.user_id === safeId) ?? null;
    return row ? toProfile(row) : null;
  }
  const { data, error } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('user_id', safeId)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

export async function adminUpdatePetFeedPostStatus(postId, status, options = {}) {
  const safeStatus = normalizeStatus(status, '');
  if (!safeStatus) {
    const err = new Error('Invalid post status');
    err.status = 400;
    err.code = 'INVALID_POST_STATUS';
    throw err;
  }
  const rejectionReason = trimText(options.rejectionReason ?? options.rejection_reason, 500);
  const adminNote = trimText(options.adminNote ?? options.admin_note, 500);
  const adminAction = trimText(options.adminAction ?? options.admin_action, 300);
  const now = new Date().toISOString();

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryPosts.findIndex((post) => post.id === postId);
    if (idx < 0) return null;
    const existing = memoryPosts[idx];
    const metadata = { ...(existing.metadata ?? {}) };
    if (safeStatus === 'archived' && String(existing.status || '') === 'pending_review') {
      metadata.rejection_reason = rejectionReason || metadata.rejection_reason || '';
      if (adminNote) metadata.admin_note = adminNote;
      else delete metadata.admin_note;
      if (adminAction) metadata.admin_action = adminAction;
      else delete metadata.admin_action;
      metadata.rejected_at = now;
    } else if (safeStatus === 'published') {
      delete metadata.rejection_reason;
      delete metadata.admin_note;
      delete metadata.admin_action;
      delete metadata.rejected_at;
    } else if (safeStatus === 'sold') {
      Object.assign(metadata, stampClosedListingMetadata(metadata, 'sold'));
      const deal = asObject(metadata.deal);
      if (!deal.completed_at && !deal.completedAt) {
        metadata.deal = {
          ...deal,
          status: 'completed',
          completed_at: trimText(options.completedAt ?? options.completed_at, 40) || now,
        };
      }
    } else if (safeStatus === 'cancelled') {
      Object.assign(metadata, stampClosedListingMetadata(metadata, 'cancelled'));
      const deal = asObject(metadata.deal);
      if (!deal.completed_at && !deal.cancelled_at) {
        metadata.deal = {
          ...deal,
          status: 'cancelled',
          completed_at: trimText(options.completedAt ?? options.completed_at, 40) || now,
        };
      }
    }
    if (options.metadata && typeof options.metadata === 'object') {
      Object.assign(metadata, options.metadata);
    }
    memoryPosts[idx] = {
      ...existing,
      status: safeStatus,
      metadata,
      updated_at: now,
    };
    return toPost(memoryPosts[idx]);
  }

  const { data: existing, error: existingError } = await supabase
    .from('pet_feed_posts')
    .select('status, metadata')
    .eq('id', postId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;

  const metadata = { ...(asObject(existing.metadata) || {}) };
  if (safeStatus === 'archived' && String(existing.status || '') === 'pending_review') {
    metadata.rejection_reason = rejectionReason || metadata.rejection_reason || '';
    if (adminNote) metadata.admin_note = adminNote;
    else delete metadata.admin_note;
    if (adminAction) metadata.admin_action = adminAction;
    else delete metadata.admin_action;
    metadata.rejected_at = now;
  } else if (safeStatus === 'published') {
    delete metadata.rejection_reason;
    delete metadata.admin_note;
    delete metadata.admin_action;
    delete metadata.rejected_at;
  } else if (safeStatus === 'sold') {
    Object.assign(metadata, stampClosedListingMetadata(metadata, 'sold'));
    const deal = asObject(metadata.deal);
    if (!deal.completed_at && !deal.completedAt) {
      metadata.deal = {
        ...deal,
        status: 'completed',
        completed_at: trimText(options.completedAt ?? options.completed_at, 40) || now,
      };
    }
  } else if (safeStatus === 'cancelled') {
    Object.assign(metadata, stampClosedListingMetadata(metadata, 'cancelled'));
    const deal = asObject(metadata.deal);
    if (!deal.completed_at && !deal.cancelled_at) {
      metadata.deal = {
        ...deal,
        status: 'cancelled',
        completed_at: trimText(options.completedAt ?? options.completed_at, 40) || now,
      };
    }
  }

  if (options.metadata && typeof options.metadata === 'object') {
    Object.assign(metadata, options.metadata);
  }

  const { data, error } = await supabase
    .from('pet_feed_posts')
    .update({ status: safeStatus, metadata, updated_at: now })
    .eq('id', postId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .maybeSingle();
  if (error) throw error;
  return toPost(data);
}

export async function listAdminPetFeedReports(status = 'open') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const profilesById = new Map(memoryProfiles.map((profile) => [profile.id, toProfile(profile)]));
    return memoryReports
      .filter((report) => !status || report.status === status)
      .map((report) => toReport({ ...report, breeder_profile: profilesById.get(report.breeder_profile_id) ?? null }));
  }
  let query = supabase.from('pet_feed_reports').select('*, breeder_profile:breeder_profiles(*)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toReport);
}

export async function listAdminBreederProfiles(status = '') {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memoryProfiles
      .filter((profile) => !status || profile.verification_status === status)
      .map(toProfile);
  }
  let query = supabase.from('breeder_profiles').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('verification_status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

export async function adminUpdateBreederProfileStatus(userId, verificationStatus, options = {}) {
  const safeStatus = normalizeVerificationStatus(verificationStatus);
  const rejectionReason = trimText(options.rejectionReason ?? options.rejection_reason, 500);
  const adminNote = trimText(options.adminNote ?? options.admin_note, 500);
  const adminAction = trimText(options.adminAction ?? options.admin_action, 300);
  const now = new Date().toISOString();

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.user_id === userId);
    if (idx < 0) return null;
    const existing = memoryProfiles[idx];
    const metadata = { ...(existing.metadata ?? {}) };
    if (safeStatus === 'rejected') {
      metadata.rejection_reason = rejectionReason || metadata.rejection_reason || '';
      if (adminNote) metadata.admin_note = adminNote;
      else delete metadata.admin_note;
      if (adminAction) metadata.admin_action = adminAction;
      else delete metadata.admin_action;
      metadata.rejected_at = now;
      delete metadata.verified_at;
    } else if (safeStatus === 'verified') {
      delete metadata.rejection_reason;
      delete metadata.admin_note;
      delete metadata.admin_action;
      delete metadata.rejected_at;
      metadata.verified_at = now;
      metadata.verified_base_trust_awarded = Boolean(metadata.verified_base_trust_awarded) || true;
    }
    memoryProfiles[idx] = {
      ...existing,
      verification_status: safeStatus,
      metadata,
      updated_at: now,
    };
    return toProfile(memoryProfiles[idx]);
  }

  const { data: existing, error: existingError } = await supabase
    .from('breeder_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;

  const metadata = { ...(existing.metadata ?? {}) };
  if (safeStatus === 'rejected') {
    metadata.rejection_reason = rejectionReason || '';
    if (adminNote) metadata.admin_note = adminNote;
    else delete metadata.admin_note;
    if (adminAction) metadata.admin_action = adminAction;
    else delete metadata.admin_action;
    metadata.rejected_at = now;
    delete metadata.verified_at;
  } else if (safeStatus === 'verified') {
    delete metadata.rejection_reason;
    delete metadata.admin_note;
    delete metadata.admin_action;
    delete metadata.rejected_at;
    metadata.verified_at = now;
    metadata.verified_base_trust_awarded = Boolean(metadata.verified_base_trust_awarded) || true;
  }

  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({
      verification_status: safeStatus,
      metadata,
      updated_at: now,
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toProfile(data);
}

async function findBreederProfileRowForPenalty({ breederProfileId, postId }) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    if (breederProfileId) {
      return memoryProfiles.find((profile) => profile.id === breederProfileId) ?? null;
    }
    if (postId) {
      const post = memoryPosts.find((item) => item.id === postId);
      if (!post) return null;
      if (post.breeder_profile_id) {
        return memoryProfiles.find((profile) => profile.id === post.breeder_profile_id) ?? null;
      }
      return memoryProfiles.find((profile) => profile.user_id === post.user_id) ?? null;
    }
    return null;
  }

  if (breederProfileId) {
    const { data, error } = await supabase.from('breeder_profiles').select('*').eq('id', breederProfileId).maybeSingle();
    if (error) throw error;
    return data;
  }
  if (!postId) return null;
  const { data: post, error: postError } = await supabase
    .from('pet_feed_posts')
    .select('user_id, breeder_profile_id')
    .eq('id', postId)
    .maybeSingle();
  if (postError) throw postError;
  if (!post) return null;
  if (post.breeder_profile_id) {
    const { data, error } = await supabase.from('breeder_profiles').select('*').eq('id', post.breeder_profile_id).maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('breeder_profiles').select('*').eq('user_id', post.user_id).maybeSingle();
  if (error) throw error;
  return data;
}

async function appendBreederViolationFromReport(report) {
  const profileRow = await findBreederProfileRowForPenalty({
    breederProfileId: report.breeder_profile_id,
    postId: report.post_id,
  });
  if (!profileRow?.id) return null;

  const profileBefore = {
    ...profileRow,
    metadata: profileRow.metadata && typeof profileRow.metadata === 'object'
      ? { ...profileRow.metadata }
      : {},
  };

  const metadata = profileRow.metadata && typeof profileRow.metadata === 'object' ? { ...profileRow.metadata } : {};
  const existingViolations = Array.isArray(metadata.violations) ? [...metadata.violations] : [];
  if (existingViolations.some((item) => item && item.reportId === report.id)) {
    return null;
  }

  const points = DEFAULT_VIOLATION_PENALTY_POINTS;
  const violationId = randomUUID();
  existingViolations.push({
    id: violationId,
    reportId: report.id,
    reason: trimText(report.reason, 120) || 'report_upheld',
    points,
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    status: 'active',
  });
  const penaltyPoints = existingViolations
    .filter((item) => item && item.status === 'active')
    .reduce((sum, item) => sum + (Number.isFinite(Number(item.points)) ? Math.max(0, Math.floor(Number(item.points))) : 0), 0);

  metadata.violations = existingViolations;
  metadata.penaltyPoints = penaltyPoints;
  const updatedAt = new Date().toISOString();

  const supabase = getSupabaseServiceClient();
  let profileAfter = null;
  if (!supabase) {
    const idx = memoryProfiles.findIndex((profile) => profile.id === profileRow.id);
    if (idx < 0) return null;
    memoryProfiles[idx] = {
      ...memoryProfiles[idx],
      metadata,
      updated_at: updatedAt,
    };
    profileAfter = memoryProfiles[idx];
  } else {
    const { data, error } = await supabase
      .from('breeder_profiles')
      .update({ metadata, updated_at: updatedAt })
      .eq('id', profileRow.id)
      .select('*')
      .single();
    if (error) throw error;
    profileAfter = data;
  }

  const warning = await maybeCreateTransparencyWarningAfterPenalty({
    profileBefore,
    profileAfter,
    triggerViolationId: violationId,
  }).catch(() => null);

  return { profile: profileAfter, warning, violationId };
}

export async function adminUpdatePetFeedReportStatus(reportId, status) {
  const safeStatus = ['open', 'reviewed', 'dismissed'].includes(trimText(status, 32).toLowerCase())
    ? trimText(status, 32).toLowerCase()
    : 'reviewed';
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memoryReports.findIndex((report) => report.id === reportId);
    if (idx < 0) return null;
    const previous = memoryReports[idx];
    memoryReports[idx] = { ...previous, status: safeStatus, updated_at: new Date().toISOString() };
    let transparencyWarning = null;
    if (safeStatus === 'reviewed' && previous.status !== 'reviewed') {
      const penaltyResult = await appendBreederViolationFromReport(memoryReports[idx]);
      transparencyWarning = penaltyResult?.warning ?? null;
    }
    return { ...toReport(memoryReports[idx]), transparency_warning: transparencyWarning };
  }
  const { data: existing, error: existingError } = await supabase
    .from('pet_feed_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;

  const { data, error } = await supabase
    .from('pet_feed_reports')
    .update({ status: safeStatus, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  let transparencyWarning = null;
  if (safeStatus === 'reviewed' && existing.status !== 'reviewed') {
    const penaltyResult = await appendBreederViolationFromReport(data);
    transparencyWarning = penaltyResult?.warning ?? null;
  }
  return { ...toReport(data), transparency_warning: transparencyWarning };
}

export function listMyWarrantyPolicies(profile) {
  return listWarrantyPoliciesFromMetadata(profile?.metadata);
}

export async function createMyWarrantyPolicy(userId, payload, accessToken) {
  const profile = await getMyBreederProfile(userId, accessToken);
  if (!profile) throw httpError('Breeder profile not found.', 404, 'BREEDER_PROFILE_NOT_FOUND');

  const fields = parseWarrantyPolicyInput(payload);
  if (!fields || !fields.title) {
    throw httpError('Warranty policy title and required fields are missing.', 400, 'WARRANTY_INVALID');
  }

  const policy = normalizeWarrantyPolicy({
    id: randomUUID(),
    ...fields,
    created_at: new Date().toISOString(),
  });
  if (!policy) {
    throw httpError('Warranty policy is invalid.', 400, 'WARRANTY_INVALID');
  }

  const meta = asObject(profile.metadata);
  const policies = listWarrantyPoliciesFromMetadata(meta);
  const isFirst = policies.length === 0 && !meta.warranty_policy_trust_awarded;
  const nextMeta = {
    ...meta,
    warranty_policies: [...policies, policy],
    warranty_policy_trust_awarded: Boolean(meta.warranty_policy_trust_awarded) || isFirst,
  };
  const updated = await persistBreederMetadata(userId, nextMeta, accessToken);
  return {
    profile: updated,
    policy,
    trust_awarded: isFirst,
  };
}

export async function deleteMyWarrantyPolicy(userId, policyId, accessToken) {
  const profile = await getMyBreederProfile(userId, accessToken);
  if (!profile) throw httpError('Breeder profile not found.', 404, 'BREEDER_PROFILE_NOT_FOUND');
  const safeId = trimText(policyId, 80);
  if (!safeId) throw httpError('Warranty policy id is required.', 400, 'WARRANTY_POLICY_ID_REQUIRED');

  const locked = await listPostsLockingWarrantyPolicy(profile.id, safeId, accessToken);
  if (locked.length > 0) {
    throw httpError(
      'Cannot delete a warranty policy bound to a deposit hold or completed listing.',
      400,
      'WARRANTY_POLICY_IN_USE',
    );
  }

  const meta = asObject(profile.metadata);
  const policies = listWarrantyPoliciesFromMetadata(meta).filter((p) => p.id !== safeId);
  if (policies.length === listWarrantyPoliciesFromMetadata(meta).length) {
    throw httpError('Warranty policy not found.', 404, 'WARRANTY_POLICY_NOT_FOUND');
  }
  const updated = await persistBreederMetadata(userId, { ...meta, warranty_policies: policies }, accessToken);
  return updated;
}

export async function updateMyWarrantyPolicy(userId, policyId, payload, accessToken) {
  const profile = await getMyBreederProfile(userId, accessToken);
  if (!profile) throw httpError('Breeder profile not found.', 404, 'BREEDER_PROFILE_NOT_FOUND');
  const safeId = trimText(policyId, 80);
  if (!safeId) throw httpError('Warranty policy id is required.', 400, 'WARRANTY_POLICY_ID_REQUIRED');

  const locked = await listPostsLockingWarrantyPolicy(profile.id, safeId, accessToken);
  if (locked.length > 0) {
    throw httpError(
      'Cannot update a warranty policy bound to a deposit hold or completed listing.',
      400,
      'WARRANTY_POLICY_IN_USE',
    );
  }

  const fields = parseWarrantyPolicyInput(payload);
  if (!fields || !fields.title) {
    throw httpError('Warranty policy title and required fields are missing.', 400, 'WARRANTY_INVALID');
  }

  const meta = asObject(profile.metadata);
  const policies = listWarrantyPoliciesFromMetadata(meta);
  const existing = policies.find((p) => p.id === safeId);
  if (!existing) {
    throw httpError('Warranty policy not found.', 404, 'WARRANTY_POLICY_NOT_FOUND');
  }

  const policy = normalizeWarrantyPolicy({
    ...fields,
    id: existing.id,
    created_at: existing.created_at,
  });
  if (!policy) {
    throw httpError('Warranty policy is invalid.', 400, 'WARRANTY_INVALID');
  }

  const nextPolicies = policies.map((p) => (p.id === safeId ? policy : p));
  const updated = await persistBreederMetadata(
    userId,
    { ...meta, warranty_policies: nextPolicies },
    accessToken,
  );
  return { profile: updated, policy };
}

async function listPostsLockingWarrantyPolicy(breederProfileId, policyId, accessToken) {
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    return memoryPosts.filter((post) => {
      if (post.breeder_profile_id !== breederProfileId) return false;
      if (post.status !== 'deposit_hold' && post.status !== 'sold') return false;
      const meta = asObject(post.metadata);
      return String(meta.warranty_policy_id ?? '') === policyId
        || String(asObject(meta.warranty_policy_snapshot).id ?? '') === policyId;
    });
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('id, status, metadata')
    .eq('breeder_profile_id', breederProfileId)
    .in('status', ['deposit_hold', 'sold']);
  if (error) throw error;
  return (data ?? []).filter((post) => {
    const meta = asObject(post.metadata);
    return String(meta.warranty_policy_id ?? '') === policyId
      || String(asObject(meta.warranty_policy_snapshot).id ?? '') === policyId;
  });
}

function toBreederSubmission(row) {
  if (!row) return row;
  return {
    id: row.id,
    breeder_profile_id: row.breeder_profile_id,
    user_id: row.user_id,
    submission_type: row.submission_type,
    payload: asObject(row.payload) || {},
    status: row.status ?? 'pending',
    rejection_reason: row.rejection_reason ?? '',
    admin_note: row.admin_note ?? '',
    created_at: row.created_at,
    reviewed_at: row.reviewed_at ?? null,
    breeder_profile: row.breeder_profile ? toProfile(row.breeder_profile) : null,
  };
}

export async function listMyBreederProfileSubmissions(userId, accessToken) {
  const supabase = getFeedSupabase(accessToken);
  if (!supabase) {
    return memorySubmissions
      .filter((row) => row.user_id === userId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map(toBreederSubmission);
  }
  const { data, error } = await supabase
    .from('breeder_profile_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toBreederSubmission);
}

export async function createBreederProfileSubmission(userId, payload, accessToken) {
  const submissionType = normalizeBreederSubmissionType(
    payload?.submissionType ?? payload?.submission_type,
  );
  if (!submissionType) {
    throw httpError('Invalid submission type.', 400, 'INVALID_SUBMISSION_TYPE');
  }

  const profile = await getMyBreederProfile(userId, accessToken);
  if (!profile?.id) {
    throw httpError('Breeder profile not found.', 404, 'BREEDER_PROFILE_NOT_FOUND');
  }
  if (profile.verification_status !== 'verified') {
    throw httpError(
      'Only verified breeders can submit transparency details.',
      403,
      'BREEDER_NOT_VERIFIED',
    );
  }

  const validated = validateBreederSubmissionPayload(submissionType, payload?.payload ?? payload);
  if (!validated.ok) {
    throw httpError(validated.error, 400, validated.code);
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);

  if (!supabase) {
    const pendingIdx = memorySubmissions.findIndex(
      (row) =>
        row.user_id === userId
        && row.submission_type === submissionType
        && row.status === 'pending',
    );
    if (pendingIdx >= 0) {
      throw httpError(
        'A pending submission already exists for this item.',
        409,
        'SUBMISSION_ALREADY_PENDING',
      );
    }
    const row = {
      id: randomUUID(),
      breeder_profile_id: profile.id,
      user_id: userId,
      submission_type: submissionType,
      payload: validated.payload,
      status: 'pending',
      rejection_reason: '',
      admin_note: '',
      created_at: now,
      reviewed_at: null,
    };
    memorySubmissions.push(row);
    return toBreederSubmission(row);
  }

  const { data: existingPending, error: pendingError } = await supabase
    .from('breeder_profile_submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('submission_type', submissionType)
    .eq('status', 'pending')
    .maybeSingle();
  if (pendingError) throw pendingError;

  if (existingPending?.id) {
    throw httpError(
      'A pending submission already exists for this item.',
      409,
      'SUBMISSION_ALREADY_PENDING',
    );
  }

  const { data, error } = await supabase
    .from('breeder_profile_submissions')
    .insert({
      breeder_profile_id: profile.id,
      user_id: userId,
      submission_type: submissionType,
      payload: validated.payload,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toBreederSubmission(data);
}

export async function cancelMyBreederProfileSubmission(userId, submissionId, accessToken) {
  const safeId = trimText(submissionId, 64);
  if (!safeId) throw httpError('submissionId is required.', 400, 'MISSING_SUBMISSION_ID');

  const supabase = getSupabaseServiceClient() ?? getFeedSupabase(accessToken);
  if (!supabase) {
    const idx = memorySubmissions.findIndex(
      (row) => row.id === safeId && row.user_id === userId && row.status === 'pending',
    );
    if (idx < 0) throw httpError('Pending submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    memorySubmissions[idx] = {
      ...memorySubmissions[idx],
      status: 'cancelled',
      reviewed_at: new Date().toISOString(),
    };
    return toBreederSubmission(memorySubmissions[idx]);
  }

  const { data: existing, error: existingError } = await supabase
    .from('breeder_profile_submissions')
    .select('*')
    .eq('id', safeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw httpError('Pending submission not found.', 404, 'SUBMISSION_NOT_FOUND');
  if (existing.status !== 'pending') {
    throw httpError('Only pending submissions can be cancelled.', 400, 'SUBMISSION_NOT_PENDING');
  }

  const { data, error } = await supabase
    .from('breeder_profile_submissions')
    .update({ status: 'cancelled', reviewed_at: new Date().toISOString() })
    .eq('id', safeId)
    .select('*')
    .single();
  if (error) throw error;
  return toBreederSubmission(data);
}

export async function listAdminBreederProfileSubmissions(status = 'pending') {
  const safeStatus = normalizeBreederSubmissionStatus(status) || (status ? '' : 'pending');
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return memorySubmissions
      .filter((row) => !safeStatus || row.status === safeStatus)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((row) => {
        const profile = memoryProfiles.find((p) => p.id === row.breeder_profile_id) ?? null;
        return toBreederSubmission({ ...row, breeder_profile: profile });
      });
  }
  let query = supabase
    .from('breeder_profile_submissions')
    .select('*, breeder_profile:breeder_profiles(*)')
    .order('created_at', { ascending: false });
  if (safeStatus) query = query.eq('status', safeStatus);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toBreederSubmission);
}

export async function getAdminBreederProfileSubmissionById(submissionId) {
  const safeId = trimText(submissionId, 64);
  if (!safeId) return null;
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const row = memorySubmissions.find((item) => item.id === safeId) ?? null;
    if (!row) return null;
    const profile = memoryProfiles.find((p) => p.id === row.breeder_profile_id) ?? null;
    return toBreederSubmission({ ...row, breeder_profile: profile });
  }
  const { data, error } = await supabase
    .from('breeder_profile_submissions')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return toBreederSubmission(data);
}

export async function adminReviewBreederProfileSubmission(
  submissionId,
  status,
  options = {},
) {
  const safeStatus = normalizeBreederSubmissionStatus(status);
  if (safeStatus !== 'approved' && safeStatus !== 'rejected') {
    throw httpError('status must be approved or rejected.', 400, 'INVALID_SUBMISSION_STATUS');
  }
  const rejectionReason = trimText(options.rejectionReason ?? options.rejection_reason, 500);
  const adminNote = trimText(options.adminNote ?? options.admin_note, 500);
  if (safeStatus === 'rejected' && !rejectionReason) {
    throw httpError('rejectionReason is required when rejecting.', 400, 'MISSING_REJECTION_REASON');
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const idx = memorySubmissions.findIndex((row) => row.id === submissionId);
    if (idx < 0) return null;
    const existing = memorySubmissions[idx];
    if (existing.status !== 'pending') {
      throw httpError('Submission is not pending review.', 400, 'SUBMISSION_NOT_PENDING');
    }
    memorySubmissions[idx] = {
      ...existing,
      status: safeStatus,
      rejection_reason: safeStatus === 'rejected' ? rejectionReason : '',
      admin_note: adminNote,
      reviewed_at: now,
    };
    const submission = toBreederSubmission(memorySubmissions[idx]);
    if (safeStatus === 'approved') {
      const profileIdx = memoryProfiles.findIndex((p) => p.id === existing.breeder_profile_id);
      if (profileIdx >= 0) {
        const profile = memoryProfiles[profileIdx];
        const merged = applyApprovedBreederSubmission(profile, submission, now);
        memoryProfiles[profileIdx] = {
          ...profile,
          contact: merged.contact,
          metadata: sanitizeBreederProfileMetadata(merged.metadata),
          updated_at: now,
        };
        submission.breeder_profile = toProfile(memoryProfiles[profileIdx]);
      }
    }
    return submission;
  }

  const { data: existing, error: existingError } = await supabase
    .from('breeder_profile_submissions')
    .select('*, breeder_profile:breeder_profiles(*)')
    .eq('id', submissionId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;
  if (existing.status !== 'pending') {
    throw httpError('Submission is not pending review.', 400, 'SUBMISSION_NOT_PENDING');
  }

  const { data: updatedSubmission, error: updateError } = await supabase
    .from('breeder_profile_submissions')
    .update({
      status: safeStatus,
      rejection_reason: safeStatus === 'rejected' ? rejectionReason : '',
      admin_note: adminNote,
      reviewed_at: now,
    })
    .eq('id', submissionId)
    .select('*, breeder_profile:breeder_profiles(*)')
    .single();
  if (updateError) throw updateError;

  if (safeStatus === 'approved' && existing.breeder_profile) {
    const profile = toProfile(existing.breeder_profile);
    const merged = applyApprovedBreederSubmission(profile, toBreederSubmission(existing), now);
    const { data: updatedProfile, error: profileError } = await supabase
      .from('breeder_profiles')
      .update({
        contact: merged.contact,
        metadata: sanitizeBreederProfileMetadata(merged.metadata),
        updated_at: now,
      })
      .eq('id', profile.id)
      .select('*')
      .single();
    if (profileError) throw profileError;
    return toBreederSubmission({
      ...updatedSubmission,
      breeder_profile: updatedProfile,
    });
  }

  return toBreederSubmission(updatedSubmission);
}
