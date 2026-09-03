import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { getAccountProfile } from './accountRepository.js';
import { asObject } from '../utils/warrantyPolicy.js';
import {
  computeFarmReviewPool,
  countFarmReviewDisplayThreads,
  countFiveStarDirectReviews,
  filterApprovedFarmReviews,
  filterFarmReviewsForViewer,
  isFarmReviewActive,
  isFarmReviewApproved,
  normalizeFarmReviewPhotoUrls,
  normalizeFarmReviewStatus,
  validateFarmReviewInput,
} from '../utils/breederFarmReviews.js';

const memoryReviews = [];
const memoryProfilesRef = { getter: () => [], setter: null };
const memoryPostsRef = { getter: () => [] };

export function bindBreederFarmReviewMemoryProfiles(getter, setter) {
  memoryProfilesRef.getter = getter;
  memoryProfilesRef.setter = setter;
}

export function bindBreederFarmReviewMemoryPosts(getter) {
  memoryPostsRef.getter = getter;
}

export function resetBreederFarmReviewMemoryForTests() {
  memoryReviews.length = 0;
}

function getSupabase(accessToken) {
  return getSupabaseServiceClient() ?? createSupabaseWithUserAccessToken(accessToken);
}

function trimText(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function httpError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function toReviewRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    breeder_profile_id: row.breeder_profile_id,
    reviewer_user_id: row.reviewer_user_id,
    kind: row.kind,
    parent_review_id: row.parent_review_id ?? null,
    post_id: row.post_id ?? null,
    rating: row.rating,
    body: row.body ?? '',
    photo_urls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
    status: normalizeFarmReviewStatus(row.status),
    rejection_reason: row.rejection_reason ?? '',
    admin_note: row.admin_note ?? '',
    reviewed_at: row.reviewed_at ?? null,
    reviewed_by: row.reviewed_by ?? null,
    created_at: row.created_at,
    reviewer_display_name: row.reviewer_display_name ?? '',
    reviewer_avatar_url: row.reviewer_avatar_url ?? null,
  };
}

async function loadReviewerPublicProfiles(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    for (const id of unique) {
      map.set(id, { display_name: '', avatar_url: null });
    }
    return map;
  }

  const [{ data: profiles, error: profilesError }, { data: breeders, error: breedersError }] =
    await Promise.all([
      supabase.from('app_user_profiles').select('user_id, display_name').in('user_id', unique),
      supabase.from('breeder_profiles').select('user_id, avatar_url').in('user_id', unique),
    ]);
  if (profilesError) throw profilesError;
  if (breedersError) throw breedersError;

  const avatarByUser = new Map(
    (breeders ?? []).map((row) => [row.user_id, trimText(row.avatar_url, 1000) || null]),
  );
  for (const row of profiles ?? []) {
    map.set(row.user_id, {
      display_name: trimText(row.display_name, 160) || '',
      avatar_url: avatarByUser.get(row.user_id) ?? null,
    });
  }
  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, { display_name: '', avatar_url: avatarByUser.get(id) ?? null });
    }
  }
  return map;
}

function enrichReviewRowWithReviewer(row, reviewerMap) {
  const info = reviewerMap.get(row.reviewer_user_id) ?? { display_name: '', avatar_url: null };
  return {
    ...row,
    reviewer_display_name: info.display_name,
    reviewer_avatar_url: info.avatar_url,
  };
}

async function enrichReviewThreadsWithReviewers(threads) {
  const userIds = [];
  for (const thread of threads) {
    if (thread.reviewer_user_id) userIds.push(thread.reviewer_user_id);
    for (const supplement of thread.supplements ?? []) {
      if (supplement.reviewer_user_id) userIds.push(supplement.reviewer_user_id);
    }
  }
  const reviewerMap = await loadReviewerPublicProfiles(userIds);
  return threads.map((thread) => ({
    ...enrichReviewRowWithReviewer(thread, reviewerMap),
    supplements: (thread.supplements ?? []).map((supplement) =>
      enrichReviewRowWithReviewer(supplement, reviewerMap),
    ),
  }));
}

async function listReviewsForBreeder(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return [];
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return memoryReviews.filter((row) => row.breeder_profile_id === safeId);
  }
  const { data, error } = await supabase
    .from('breeder_farm_reviews')
    .select('*')
    .eq('breeder_profile_id', safeId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function countPetsSoldOnPlatform(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return 0;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return memoryPostsRef.getter().filter((row) => {
      if (row.breeder_profile_id !== safeId) return false;
      const meta = asObject(row.metadata);
      return String(meta.sale_channel || '').trim().toLowerCase() === 'on_platform';
    }).length;
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('id, metadata')
    .eq('breeder_profile_id', safeId)
    .eq('post_kind', 'listing')
    .in('status', ['sold', 'archived']);
  if (error) throw error;
  let count = 0;
  for (const row of data ?? []) {
    const meta = asObject(row.metadata);
    if (String(meta.sale_channel || '').trim().toLowerCase() === 'on_platform') count += 1;
  }
  return count;
}

export async function recomputeBreederReviewStats(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return null;
  const reviews = await listReviewsForBreeder(safeId, accessToken);
  const pool = computeFarmReviewPool(reviews);
  const petsSoldOnPlatform = await countPetsSoldOnPlatform(safeId, accessToken);
  const reviewDisplayCount = countFarmReviewDisplayThreads(reviews);
  const patch = {
    review_count: reviewDisplayCount,
    review_avg: pool.review_avg,
    five_star_review_count: countFiveStarDirectReviews(reviews),
    pets_sold_on_platform: petsSoldOnPlatform,
    sen_confirmed_completions: petsSoldOnPlatform,
    farm_reviews_synced_at: new Date().toISOString(),
  };

  const supabase = getSupabase(accessToken);
  if (!supabase) {
    const profiles = memoryProfilesRef.getter();
    const idx = profiles.findIndex((profile) => profile.id === safeId);
    if (idx < 0) return patch;
    const next = {
      ...profiles[idx],
      metadata: { ...asObject(profiles[idx].metadata), ...patch },
      updated_at: new Date().toISOString(),
    };
    if (typeof memoryProfilesRef.setter === 'function') {
      memoryProfilesRef.setter(idx, next);
    } else {
      profiles[idx] = next;
    }
    return next.metadata;
  }

  const { data: existing, error: existingError } = await supabase
    .from('breeder_profiles')
    .select('metadata')
    .eq('id', safeId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return null;

  const metadata = { ...asObject(existing.metadata), ...patch };
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', safeId)
    .select('metadata')
    .single();
  if (error) throw error;
  return data?.metadata ?? patch;
}

function buildReviewThreads(reviews) {
  const visible = filterApprovedFarmReviews(Array.isArray(reviews) ? reviews : []);
  const primaries = visible.filter((row) => row.kind === 'primary');
  const sales = visible.filter((row) => row.kind === 'sale');
  const approvedPrimaryIds = new Set(primaries.map((row) => row.id));
  const byParent = new Map();
  for (const row of visible) {
    if (row.kind !== 'supplement' || !row.parent_review_id) continue;
    const parentId = String(row.parent_review_id);
    if (!approvedPrimaryIds.has(parentId)) continue;
    const list = byParent.get(parentId) ?? [];
    list.push(toReviewRow(row));
    byParent.set(parentId, list);
  }
  const primaryThreads = primaries.map((primary) => ({
    ...toReviewRow(primary),
    supplements: (byParent.get(primary.id) ?? []).sort(
      (a, b) => String(a.created_at).localeCompare(String(b.created_at)),
    ),
  }));
  const saleThreads = sales.map((sale) => ({
    ...toReviewRow(sale),
    supplements: [],
  }));
  return [...primaryThreads, ...saleThreads].sort(
    (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
  );
}

export async function getBreederFarmReviewAggregate(breederProfileId, accessToken, viewerUserId = null) {
  const reviews = await listReviewsForBreeder(breederProfileId, accessToken);
  const displayReviews = filterFarmReviewsForViewer(reviews, viewerUserId);
  const pool = computeFarmReviewPool(reviews);
  const petsSoldOnPlatform = await countPetsSoldOnPlatform(breederProfileId, accessToken);
  const threads = await enrichReviewThreadsWithReviewers(buildReviewThreads(displayReviews));
  return {
    review_count: threads.length,
    review_avg: pool.review_avg,
    five_star_review_count: countFiveStarDirectReviews(reviews),
    pets_sold_on_platform: petsSoldOnPlatform,
    sen_confirmed_completions: petsSoldOnPlatform,
    threads,
  };
}

async function getPrimaryReview(userId, breederProfileId, accessToken) {
  const reviews = await listReviewsForBreeder(breederProfileId, accessToken);
  return reviews.find(
    (row) => row.kind === 'primary'
      && row.reviewer_user_id === userId
      && isFarmReviewActive(row),
  ) ?? null;
}

export async function createBreederFarmReview(reviewerUserId, breederProfileId, payload, accessToken) {
  const validated = validateFarmReviewInput(payload);
  if (!validated.ok) {
    throw httpError(validated.error, 400, validated.code);
  }
  const safeProfileId = trimText(breederProfileId, 64);
  if (!safeProfileId) throw httpError('profileId is required.', 400, 'MISSING_PROFILE_ID');

  const supabase = getSupabase(accessToken);
  const existingPrimary = await getPrimaryReview(reviewerUserId, safeProfileId, accessToken);
  const kind = existingPrimary ? 'supplement' : 'primary';
  const parentReviewId = existingPrimary?.id ?? null;

  let breederUserId = null;
  let breederDisplayName = '';
  if (!supabase) {
    const profile = memoryProfilesRef.getter().find((p) => p.id === safeProfileId);
    breederUserId = profile?.user_id ?? null;
    breederDisplayName = trimText(profile?.display_name, 120);
  } else {
    const { data: profile } = await supabase
      .from('breeder_profiles')
      .select('user_id, display_name')
      .eq('id', safeProfileId)
      .maybeSingle();
    breederUserId = profile?.user_id ?? null;
    breederDisplayName = trimText(profile?.display_name, 120);
  }
  if (breederUserId && breederUserId === reviewerUserId) {
    throw httpError('You cannot review your own farm.', 403, 'REVIEW_FORBIDDEN');
  }

  const row = {
    id: randomUUID(),
    breeder_profile_id: safeProfileId,
    reviewer_user_id: reviewerUserId,
    kind,
    parent_review_id: parentReviewId,
    post_id: null,
    rating: validated.rating,
    body: validated.body,
    photo_urls: validated.photoUrls,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    memoryReviews.push(row);
  } else {
    const { data, error } = await supabase
      .from('breeder_farm_reviews')
      .insert({
        breeder_profile_id: safeProfileId,
        reviewer_user_id: reviewerUserId,
        kind,
        parent_review_id: parentReviewId,
        rating: validated.rating,
        body: validated.body,
        photo_urls: validated.photoUrls,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) {
      if (String(error.code) === '23505') {
        throw httpError('You already have a primary review for this farm.', 400, 'REVIEW_ALREADY_EXISTS');
      }
      throw error;
    }
    Object.assign(row, data);
  }

  return {
    review: toReviewRow(row),
    kind,
    status: 'pending',
    notify_user_id: null,
    breeder_display_name: breederDisplayName,
    transparency_points_awarded: 0,
  };
}

export async function getMyDirectFarmReviewForBreeder(
  reviewerUserId,
  breederProfileId,
  accessToken,
) {
  const review = await getPrimaryReview(reviewerUserId, breederProfileId, accessToken);
  return review ? toReviewRow(review) : null;
}

export async function getMySaleReviewForPost(reviewerUserId, postId, accessToken) {
  const safePostId = trimText(postId, 64);
  if (!safePostId) return null;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return toReviewRow(
      memoryReviews.find(
        (row) => row.kind === 'sale' && row.post_id === safePostId && row.reviewer_user_id === reviewerUserId,
      ) ?? null,
    );
  }
  const { data, error } = await supabase
    .from('breeder_farm_reviews')
    .select('*')
    .eq('post_id', safePostId)
    .eq('reviewer_user_id', reviewerUserId)
    .eq('kind', 'sale')
    .maybeSingle();
  if (error) throw error;
  return toReviewRow(data);
}

async function canUserSubmitSaleReview(post, reviewerUserId, accessToken) {
  const meta = asObject(post?.metadata);
  if (String(meta.sale_channel || '').trim().toLowerCase() !== 'on_platform') return false;
  const buyerId = trimText(meta.buyer_user_id, 80);
  if (buyerId && buyerId === reviewerUserId) return true;
  const buyerEmail = trimText(meta.buyer_email, 320).toLowerCase();
  if (!buyerEmail) return false;
  const account = await getAccountProfile(reviewerUserId);
  const reviewerEmail = trimText(account?.email, 320).toLowerCase();
  const reviewerLogin = trimText(account?.login_identifier, 320).toLowerCase();
  return buyerEmail === reviewerEmail || buyerEmail === reviewerLogin;
}

export async function createSaleFarmReview(reviewerUserId, postId, payload, accessToken) {
  const validated = validateFarmReviewInput(payload);
  if (!validated.ok) {
    throw httpError(validated.error, 400, validated.code);
  }
  const safePostId = trimText(postId, 64);
  if (!safePostId) throw httpError('postId is required.', 400, 'MISSING_POST_ID');

  const supabase = getSupabase(accessToken);
  let post = null;
  if (!supabase) {
    post = memoryPostsRef.getter().find((row) => row.id === safePostId) ?? null;
  } else {
    const { data, error } = await supabase
      .from('pet_feed_posts')
      .select('id, status, metadata, breeder_profile_id, user_id, title')
      .eq('id', safePostId)
      .maybeSingle();
    if (error) throw error;
    post = data;
  }

  if (!post) throw httpError('Listing not found.', 404, 'PET_FEED_POST_NOT_FOUND');
  const status = String(post.status || '').trim().toLowerCase();
  const meta = asObject(post.metadata);
  if (status !== 'sold' && meta.listing_outcome !== 'sold' && !meta.sold) {
    throw httpError('Sale reviews are only allowed on sold listings.', 400, 'REVIEW_NOT_ALLOWED');
  }

  const buyerId = trimText(meta.buyer_user_id, 80);
  if (buyerId && buyerId !== reviewerUserId) {
    throw httpError('Only the matched buyer can review this sale.', 403, 'REVIEW_FORBIDDEN');
  }
  if (!buyerId) {
    const eligible = await canUserSubmitSaleReview(post, reviewerUserId, accessToken);
    if (!eligible) {
      throw httpError('You are not eligible to review this sale.', 403, 'REVIEW_FORBIDDEN');
    }
  }

  const breederProfileId = trimText(post.breeder_profile_id, 64);
  if (!breederProfileId) {
    throw httpError('Breeder profile missing on listing.', 400, 'BREEDER_PROFILE_MISSING');
  }

  const existing = await getMySaleReviewForPost(reviewerUserId, safePostId, accessToken);
  if (existing?.id && isFarmReviewActive(existing)) {
    throw httpError('You already reviewed this sale.', 400, 'REVIEW_ALREADY_EXISTS');
  }

  const row = {
    id: randomUUID(),
    breeder_profile_id: breederProfileId,
    reviewer_user_id: reviewerUserId,
    kind: 'sale',
    parent_review_id: null,
    post_id: safePostId,
    rating: validated.rating,
    body: validated.body,
    photo_urls: validated.photoUrls,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    memoryReviews.push(row);
  } else {
    const { data, error } = await supabase
      .from('breeder_farm_reviews')
      .insert({
        breeder_profile_id: breederProfileId,
        reviewer_user_id: reviewerUserId,
        kind: 'sale',
        post_id: safePostId,
        rating: validated.rating,
        body: validated.body,
        photo_urls: validated.photoUrls,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) {
      if (String(error.code) === '23505') {
        throw httpError('You already reviewed this sale.', 400, 'REVIEW_ALREADY_EXISTS');
      }
      throw error;
    }
    Object.assign(row, data);
  }

  let breederDisplayName = '';
  if (!supabase) {
    const profile = memoryProfilesRef.getter().find((p) => p.id === breederProfileId);
    breederDisplayName = trimText(profile?.display_name, 120);
  } else {
    const { data: profile } = await supabase
      .from('breeder_profiles')
      .select('display_name')
      .eq('id', breederProfileId)
      .maybeSingle();
    breederDisplayName = trimText(profile?.display_name, 120);
  }

  return {
    review: toReviewRow(row),
    status: 'pending',
    notify_user_id: null,
    post_title: trimText(post.title, 200),
    breeder_profile_id: breederProfileId,
    breeder_display_name: breederDisplayName,
    transparency_points_awarded: 0,
  };
}

async function getReviewById(reviewId, accessToken) {
  const safeId = trimText(reviewId, 64);
  if (!safeId) return null;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return toReviewRow(memoryReviews.find((row) => row.id === safeId) ?? null);
  }
  const { data, error } = await supabase
    .from('breeder_farm_reviews')
    .select('*')
    .eq('id', safeId)
    .maybeSingle();
  if (error) throw error;
  return toReviewRow(data);
}

async function listReviewsByStatus(status, accessToken) {
  const safeStatus = normalizeFarmReviewStatus(status);
  const supabase = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (!supabase) {
    return memoryReviews
      .filter((row) => normalizeFarmReviewStatus(row.status) === safeStatus)
      .map(toReviewRow)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }
  const { data, error } = await supabase
    .from('breeder_farm_reviews')
    .select('*, breeder_profiles(display_name)')
    .eq('status', safeStatus)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...toReviewRow(row),
    breeder_profile: row.breeder_profiles ?? null,
  }));
}

async function cascadeReviewStatusForPrimary(primaryId, nextStatus, adminUserId, accessToken, extras = {}) {
  const supabase = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (!supabase) {
    for (const row of memoryReviews) {
      if (row.id === primaryId || row.parent_review_id === primaryId) {
        row.status = nextStatus;
        row.reviewed_at = new Date().toISOString();
        row.reviewed_by = adminUserId;
        if (nextStatus === 'rejected') row.rejection_reason = extras.rejectionReason ?? '';
        if (extras.adminNote) row.admin_note = extras.adminNote;
      }
    }
    return;
  }
  const patch = {
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminUserId,
    ...(nextStatus === 'rejected'
      ? { rejection_reason: trimText(extras.rejectionReason, 500) }
      : { rejection_reason: '' }),
    ...(extras.adminNote ? { admin_note: trimText(extras.adminNote, 500) } : {}),
  };
  const { error: primaryError } = await supabase
    .from('breeder_farm_reviews')
    .update(patch)
    .eq('id', primaryId);
  if (primaryError) throw primaryError;
  const { error: supplementError } = await supabase
    .from('breeder_farm_reviews')
    .update(patch)
    .eq('parent_review_id', primaryId)
    .eq('status', 'pending');
  if (supplementError) throw supplementError;
}

export async function listAdminFarmReviews(status = 'pending', accessToken) {
  return listReviewsByStatus(status, accessToken);
}

export async function adminUpdateFarmReviewStatus(
  reviewId,
  nextStatus,
  adminUserId,
  accessToken,
  extras = {},
) {
  const safeStatus = normalizeFarmReviewStatus(nextStatus);
  if (!['approved', 'rejected'].includes(safeStatus)) {
    throw httpError('status must be approved or rejected', 400, 'INVALID_REVIEW_STATUS');
  }
  if (safeStatus === 'rejected' && !trimText(extras.rejectionReason, 500)) {
    throw httpError('rejectionReason is required when rejecting a review', 400, 'MISSING_REJECTION_REASON');
  }

  const existing = await getReviewById(reviewId, accessToken);
  if (!existing?.id) {
    throw httpError('Review not found.', 404, 'REVIEW_NOT_FOUND');
  }
  if (normalizeFarmReviewStatus(existing.status) !== 'pending') {
    throw httpError('Review is not pending moderation.', 400, 'REVIEW_NOT_PENDING');
  }

  const supabase = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (!supabase) {
    const idx = memoryReviews.findIndex((row) => row.id === existing.id);
    if (idx >= 0) {
      memoryReviews[idx] = {
        ...memoryReviews[idx],
        status: safeStatus,
        rejection_reason: safeStatus === 'rejected' ? trimText(extras.rejectionReason, 500) : '',
        admin_note: trimText(extras.adminNote, 500),
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      };
    }
  } else if (existing.kind === 'primary') {
    await cascadeReviewStatusForPrimary(existing.id, safeStatus, adminUserId, accessToken, extras);
  } else {
    const { error } = await supabase
      .from('breeder_farm_reviews')
      .update({
        status: safeStatus,
        rejection_reason: safeStatus === 'rejected' ? trimText(extras.rejectionReason, 500) : '',
        admin_note: trimText(extras.adminNote, 500),
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
      })
      .eq('id', existing.id);
    if (error) throw error;
  }

  await recomputeBreederReviewStats(existing.breeder_profile_id, accessToken);
  const updated = await getReviewById(existing.id, accessToken);
  let breederUserId = null;
  const supabaseForProfile = getSupabaseServiceClient() ?? getSupabase(accessToken);
  if (supabaseForProfile) {
    const { data: profile } = await supabaseForProfile
      .from('breeder_profiles')
      .select('user_id')
      .eq('id', existing.breeder_profile_id)
      .maybeSingle();
    breederUserId = profile?.user_id ?? null;
  } else {
    const profile = memoryProfilesRef.getter().find((p) => p.id === existing.breeder_profile_id);
    breederUserId = profile?.user_id ?? null;
  }
  return {
    review: updated,
    breeder_profile_id: existing.breeder_profile_id,
    breeder_user_id: breederUserId,
    reviewer_user_id: existing.reviewer_user_id,
    notify_breeder_on_approve: safeStatus === 'approved',
    notify_reviewer_on_reject: safeStatus === 'rejected',
    transparency_points_awarded: 0,
  };
}

export function normalizeFarmReviewPhotoUrlsFromBody(body) {
  return normalizeFarmReviewPhotoUrls(
    body?.photoUrls ?? body?.photo_urls ?? body?.photos,
  );
}
