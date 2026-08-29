import type { PetFeedPost } from '../types';
import { farmPetAvailability } from './farmPets.ts';
import { normalizeSearchText } from './petFeedText.ts';

const SIMILAR_LISTING_LIMIT = 8;

type RelevanceRank = {
  speciesTier: number;
  breedTier: number;
  locationTier: number;
};

function compactLocation(value: string) {
  return normalizeSearchText(value);
}

function sameBreeder(post: PetFeedPost, current: PetFeedPost): boolean {
  const breederId = String(current.breeder_profile_id ?? '').trim();
  if (breederId && String(post.breeder_profile_id ?? '').trim()) {
    return post.breeder_profile_id === breederId;
  }
  const userId = String(current.user_id ?? '').trim();
  return Boolean(userId && post.user_id === userId);
}

function postSpeciesKey(post: PetFeedPost): string {
  const petType = compactLocation(String(post.pet_type ?? '').trim());
  if (petType) return petType;
  return compactLocation(String(post.species ?? '').trim());
}

function sameSpecies(post: PetFeedPost, current: PetFeedPost): boolean {
  const left = postSpeciesKey(post);
  const right = postSpeciesKey(current);
  if (!left || !right) return false;
  return left === right;
}

function sameBreed(post: PetFeedPost, current: PetFeedPost): boolean {
  const left = compactLocation(String(post.breed ?? '').trim());
  const right = compactLocation(String(current.breed ?? '').trim());
  if (!left || !right) return false;
  return left === right;
}

function locationHaystack(post: PetFeedPost): string {
  return compactLocation(
    [post.location, post.breeder_profile?.location].filter(Boolean).join(' '),
  );
}

function sameLocation(post: PetFeedPost, current: PetFeedPost): boolean {
  const left = locationHaystack(post);
  const right = locationHaystack(current);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftTokens = left.split(' ').filter((token) => token.length >= 2);
  const rightTokens = new Set(right.split(' ').filter((token) => token.length >= 2));
  return leftTokens.some((token) => rightTokens.has(token));
}

export function rankSimilarListing(post: PetFeedPost, current: PetFeedPost): RelevanceRank | null {
  const speciesMatch = sameSpecies(post, current);
  const breedMatch = sameBreed(post, current);
  const locationMatch = sameLocation(post, current);
  if (!speciesMatch && !breedMatch && !locationMatch) return null;

  const sameFarm = sameBreeder(post, current);
  return {
    speciesTier: speciesMatch ? (sameFarm ? 2 : 1) : 0,
    breedTier: breedMatch ? (sameFarm ? 2 : 1) : 0,
    locationTier: locationMatch ? 1 : 0,
  };
}

function compareRelevance(a: RelevanceRank, b: RelevanceRank): number {
  if (a.speciesTier !== b.speciesTier) return b.speciesTier - a.speciesTier;
  if (a.breedTier !== b.breedTier) return b.breedTier - a.breedTier;
  if (a.locationTier !== b.locationTier) return b.locationTier - a.locationTier;
  return 0;
}

function isEligibleSimilarListing(post: PetFeedPost, currentPost: PetFeedPost): boolean {
  if (post.id === currentPost.id) return false;
  if (String(post.post_kind || 'listing').toLowerCase() === 'announcement') return false;
  return farmPetAvailability(post) === 'for_sale';
}

/** Similar for-sale listings ranked by species, breed, then location (same farm preferred). */
export function similarForSaleListings(
  posts: PetFeedPost[],
  currentPost: PetFeedPost,
  limit = SIMILAR_LISTING_LIMIT,
): PetFeedPost[] {
  const ranked = posts
    .filter((post) => isEligibleSimilarListing(post, currentPost))
    .map((post) => ({ post, rank: rankSimilarListing(post, currentPost) }))
    .filter((item): item is { post: PetFeedPost; rank: RelevanceRank } => item.rank != null);

  ranked.sort((a, b) => {
    const byRelevance = compareRelevance(a.rank, b.rank);
    if (byRelevance !== 0) return byRelevance;
    return Date.parse(String(b.post.created_at)) - Date.parse(String(a.post.created_at));
  });

  return ranked.slice(0, limit).map((item) => item.post);
}

/** @deprecated Use {@link similarForSaleListings}. */
export function siblingForSaleListings(
  posts: PetFeedPost[],
  currentPost: PetFeedPost,
  limit = SIMILAR_LISTING_LIMIT,
): PetFeedPost[] {
  return similarForSaleListings(posts, currentPost, limit);
}
