import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { getAccountProfile } from './accountRepository.js';
import { asObject } from '../utils/warrantyPolicy.js';
import {
  computeFarmReviewPool,
  countFiveStarDirectReviews,
  normalizeFarmReviewPhotoUrls,
  transparencyPointsForFarmReview,
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
    created_at: row.created_at,
  };
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
  const patch = {
    review_count: pool.review_count,
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
  const primaries = reviews.filter((r) => r.kind === 'primary');
  const byParent = new Map();
  for (const row of reviews) {
    if (row.kind !== 'supplement' || !row.parent_review_id) continue;
    const list = byParent.get(row.parent_review_id) ?? [];
    list.push(toReviewRow(row));
    byParent.set(row.parent_review_id, list);
  }
  return primaries.map((primary) => ({
    ...toReviewRow(primary),
    supplements: (byParent.get(primary.id) ?? []).sort(
      (a, b) => String(a.created_at).localeCompare(String(b.created_at)),
    ),
  })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function getBreederFarmReviewAggregate(breederProfileId, accessToken) {
  const reviews = await listReviewsForBreeder(breederProfileId, accessToken);
  const pool = computeFarmReviewPool(reviews);
  const petsSoldOnPlatform = await countPetsSoldOnPlatform(breederProfileId, accessToken);
  const threads = buildReviewThreads(reviews);
  return {
    review_count: pool.review_count,
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
    (row) => row.kind === 'primary' && row.reviewer_user_id === userId,
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

  await recomputeBreederReviewStats(safeProfileId, accessToken);

  let breederUserId = null;
  if (!supabase) {
    const profile = memoryProfilesRef.getter().find((p) => p.id === safeProfileId);
    breederUserId = profile?.user_id ?? null;
  } else {
    const { data: profile } = await supabase
      .from('breeder_profiles')
      .select('user_id, display_name')
      .eq('id', safeProfileId)
      .maybeSingle();
    breederUserId = profile?.user_id ?? null;
  }

  return {
    review: toReviewRow(row),
    kind,
    notify_user_id: breederUserId,
    transparency_points_awarded: transparencyPointsForFarmReview(validated.rating),
  };
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
  if (existing?.id) {
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

  await recomputeBreederReviewStats(breederProfileId, accessToken);
  return {
    review: toReviewRow(row),
    notify_user_id: trimText(post.user_id, 80) || null,
    post_title: trimText(post.title, 200),
    breeder_profile_id: breederProfileId,
    transparency_points_awarded: transparencyPointsForFarmReview(validated.rating),
  };
}

export function normalizeFarmReviewPhotoUrlsFromBody(body) {
  return normalizeFarmReviewPhotoUrls(
    body?.photoUrls ?? body?.photo_urls ?? body?.photos,
  );
}
