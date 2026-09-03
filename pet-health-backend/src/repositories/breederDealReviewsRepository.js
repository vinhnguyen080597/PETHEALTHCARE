import { randomUUID } from 'node:crypto';
import { createSupabaseWithUserAccessToken, getSupabaseServiceClient } from '../config/supabase.js';
import { asObject } from '../utils/warrantyPolicy.js';
import { isOwnerDeletedListing } from '../utils/listingOwnerDelete.js';
import {
  isSenConfirmedDeal,
  normalizeDealReviewRating,
  validateDealReviewInput,
} from '../utils/breederDealReviews.js';

const memoryReviews = [];
const memoryPostsRef = { getter: () => [] };
const memoryProfilesRef = { getter: () => [], setter: null };

/** Wire memory posts from petFeedRepository in tests. */
export function bindBreederDealReviewMemoryPosts(getter) {
  memoryPostsRef.getter = getter;
}

/** Wire memory breeder profiles so recompute persists five_star_review_count without Supabase. */
export function bindBreederDealReviewMemoryProfiles(getter, setter) {
  memoryProfilesRef.getter = getter;
  memoryProfilesRef.setter = setter;
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

function isSoldListingRow(row) {
  if (!row) return false;
  const meta = asObject(row.metadata);
  const status = String(row.status || '').trim().toLowerCase();
  return status === 'sold' || meta.sold === true || meta.listing_outcome === 'sold';
}

function readDeal(row) {
  return asObject(asObject(row?.metadata).deal);
}

function toReview(row) {
  if (!row) return row;
  return {
    id: row.id,
    post_id: row.post_id,
    sen_user_id: row.sen_user_id,
    breeder_profile_id: row.breeder_profile_id,
    rating: row.rating,
    body: row.body ?? '',
    created_at: row.created_at,
  };
}

function aggregateFromReviews(reviews) {
  const count = reviews.length;
  if (count === 0) {
    return {
      review_count: 0,
      review_avg: 0,
      five_star_review_count: 0,
    };
  }
  let sum = 0;
  let fiveStar = 0;
  for (const review of reviews) {
    const rating = normalizeDealReviewRating(review.rating);
    sum += rating;
    if (rating === 5) fiveStar += 1;
  }
  return {
    review_count: count,
    review_avg: Math.round((sum / count) * 10) / 10,
    five_star_review_count: fiveStar,
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
    .from('breeder_deal_reviews')
    .select('*')
    .eq('breeder_profile_id', safeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function countSenConfirmedCompletions(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return 0;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return memoryPostsRef.getter().filter((row) => {
      if (row.breeder_profile_id !== safeId) return false;
      if (!isSoldListingRow(row)) return false;
      if (isOwnerDeletedListing(row.metadata)) return false;
      return isSenConfirmedDeal(readDeal(row));
    }).length;
  }
  const { data, error } = await supabase
    .from('pet_feed_posts')
    .select('id, status, metadata')
    .eq('breeder_profile_id', safeId)
    .eq('post_kind', 'listing')
    .in('status', ['sold', 'archived', 'deposit_hold']);
  if (error) throw error;
  let count = 0;
  for (const row of data ?? []) {
    if (!isSoldListingRow(row)) continue;
    if (isOwnerDeletedListing(row.metadata)) continue;
    if (isSenConfirmedDeal(readDeal(row))) count += 1;
  }
  return count;
}

export async function recomputeBreederDealActivity(breederProfileId, accessToken) {
  const safeId = trimText(breederProfileId, 64);
  if (!safeId) return null;
  const reviews = await listReviewsForBreeder(safeId, accessToken);
  const agg = aggregateFromReviews(reviews);
  const senConfirmedCompletions = await countSenConfirmedCompletions(safeId, accessToken);
  const patch = {
    sen_confirmed_completions: senConfirmedCompletions,
    five_star_review_count: agg.five_star_review_count,
    review_count: agg.review_count,
    review_avg: agg.review_avg,
    deal_reviews_synced_at: new Date().toISOString(),
  };

  const supabase = getSupabase(accessToken);
  if (!supabase) {
    const profiles = memoryProfilesRef.getter();
    const idx = profiles.findIndex((profile) => profile.id === safeId);
    if (idx < 0) return patch;
    const next = {
      ...profiles[idx],
      metadata: {
        ...asObject(profiles[idx].metadata),
        ...patch,
      },
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

  const metadata = {
    ...asObject(existing.metadata),
    ...patch,
  };
  const { data, error } = await supabase
    .from('breeder_profiles')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', safeId)
    .select('metadata')
    .single();
  if (error) throw error;
  return data?.metadata ?? patch;
}

export async function getBreederDealReviewAggregate(breederProfileId, accessToken) {
  const reviews = await listReviewsForBreeder(breederProfileId, accessToken);
  const agg = aggregateFromReviews(reviews);
  const senConfirmedCompletions = await countSenConfirmedCompletions(breederProfileId, accessToken);
  return {
    ...agg,
    sen_confirmed_completions: senConfirmedCompletions,
    reviews: reviews.slice(0, 20).map(toReview),
  };
}

export async function getMyDealReviewForPost(senUserId, postId, accessToken) {
  const safePostId = trimText(postId, 64);
  if (!safePostId) return null;
  const supabase = getSupabase(accessToken);
  if (!supabase) {
    return toReview(
      memoryReviews.find((row) => row.post_id === safePostId && row.sen_user_id === senUserId) ?? null,
    );
  }
  const { data, error } = await supabase
    .from('breeder_deal_reviews')
    .select('*')
    .eq('post_id', safePostId)
    .eq('sen_user_id', senUserId)
    .maybeSingle();
  if (error) throw error;
  return toReview(data);
}

export async function createBreederDealReview(senUserId, postId, payload, accessToken) {
  const validated = validateDealReviewInput(payload);
  if (!validated.ok) {
    throw httpError(validated.error, 400, validated.code);
  }

  const supabase = getSupabase(accessToken);
  let post = null;
  if (!supabase) {
    post = memoryPostsRef.getter().find((row) => row.id === postId) ?? null;
  } else {
    const { data, error } = await supabase
      .from('pet_feed_posts')
      .select('id, status, metadata, breeder_profile_id, user_id')
      .eq('id', postId)
      .maybeSingle();
    if (error) throw error;
    post = data;
  }

  if (!post) throw httpError('Listing not found.', 404, 'PET_FEED_POST_NOT_FOUND');
  if (!isSoldListingRow(post)) {
    throw httpError('Reviews are only allowed on completed deals.', 400, 'REVIEW_NOT_ALLOWED');
  }

  const deal = readDeal(post);
  const assignedSen = trimText(deal.sen_user_id ?? deal.senUserId, 80);
  if (!assignedSen || assignedSen !== senUserId) {
    throw httpError('Only the buyer (Sen) can review this deal.', 403, 'REVIEW_FORBIDDEN');
  }
  if (!isSenConfirmedDeal(deal)) {
    throw httpError('Review is only allowed after you confirmed receipt.', 400, 'REVIEW_NOT_CONFIRMED');
  }

  const breederProfileId = trimText(post.breeder_profile_id, 64);
  if (!breederProfileId) {
    throw httpError('Breeder profile missing on listing.', 400, 'BREEDER_PROFILE_MISSING');
  }

  const existing = await getMyDealReviewForPost(senUserId, postId, accessToken);
  if (existing?.id) {
    throw httpError('You already reviewed this deal.', 400, 'REVIEW_ALREADY_EXISTS');
  }

  const row = {
    id: randomUUID(),
    post_id: postId,
    sen_user_id: senUserId,
    breeder_profile_id: breederProfileId,
    rating: validated.rating,
    body: validated.body,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    memoryReviews.push(row);
  } else {
    const { data, error } = await supabase
      .from('breeder_deal_reviews')
      .insert({
        post_id: postId,
        sen_user_id: senUserId,
        breeder_profile_id: breederProfileId,
        rating: validated.rating,
        body: validated.body,
      })
      .select('*')
      .single();
    if (error) {
      if (String(error.code) === '23505') {
        throw httpError('You already reviewed this deal.', 400, 'REVIEW_ALREADY_EXISTS');
      }
      throw error;
    }
    Object.assign(row, data);
  }

  await recomputeBreederDealActivity(breederProfileId, accessToken);
  return {
    review: toReview(row),
    notify_user_id: trimText(post.user_id, 80) || null,
    post_title: trimText(post.title, 200),
    breeder_profile_id: breederProfileId,
    transparency_points_awarded: 0,
  };
}

export function resetBreederDealReviewMemoryForTests() {
  memoryReviews.length = 0;
}

export function seedBreederDealReviewMemoryForTests(review) {
  memoryReviews.push(review);
}
