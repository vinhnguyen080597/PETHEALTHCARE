import type { PetFeedPost } from '../types';
import { computeBreederTrust } from './breederTrust.ts';
import { isListingOpenForSale } from './farmPets.ts';
import { isListingNewOnFloor, listingHasVideo } from './marketplaceListingCard.ts';

export function listingInterestScore(post: PetFeedPost, now = Date.now()): number {
  const saves = Math.max(0, Math.floor(Number(post.favorite_count) || 0));
  const newBoost = isListingNewOnFloor(post, now) ? 8 : 0;
  const videoBoost = listingHasVideo(post) ? 4 : 0;
  const trust = post.breeder_profile
    ? Math.max(0, Math.round(computeBreederTrust(post.breeder_profile, [post]).score || 0)) / 10
    : 0;
  return saves * 3 + newBoost + videoBoost + trust;
}

/** Open-sale listings ranked by saves, recency, video, and trust — matches web. */
export function pickTopInterestedListings(
  posts: PetFeedPost[],
  limit = 8,
  now = Date.now(),
): PetFeedPost[] {
  return posts
    .filter(isListingOpenForSale)
    .map((post) => ({ post, score: listingInterestScore(post, now) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.post.id.localeCompare(b.post.id);
    })
    .slice(0, limit)
    .map((row) => row.post);
}
