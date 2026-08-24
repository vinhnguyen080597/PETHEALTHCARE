import type { PetFeedPost } from '../types';
import {
  listingAvailability,
  listingMetadataMarksCancelled,
  listingMetadataMarksSold,
  type ListingAvailability,
} from './marketplaceListingCard.ts';

export type FarmPetAvailability = ListingAvailability;
export type FarmPetAvailabilityFilter = 'all' | FarmPetAvailability;

export type FarmPetAvailabilityCounts = Record<FarmPetAvailability, number>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function ownerDeleted(post: PetFeedPost): boolean {
  const meta = asRecord(post.metadata);
  return (
    meta.owner_deleted === true
    || meta.ownerDeleted === true
    || meta.owner_deleted === 1
    || meta.owner_deleted === 'true'
  );
}

/** Availability for farm "Pets" tab — mirrors web `farmPetAvailability`. */
export function farmPetAvailability(post: PetFeedPost): FarmPetAvailability | null {
  if (ownerDeleted(post)) return null;
  return listingAvailability(post);
}

export function isFarmRehomedListing(post: PetFeedPost): boolean {
  if (ownerDeleted(post)) return false;
  const meta = asRecord(post.metadata);
  if (post.status === 'cancelled' || listingMetadataMarksCancelled(meta)) return false;
  return post.status === 'sold' || listingMetadataMarksSold(meta);
}

export function countFarmPetsRehomed(posts: PetFeedPost[]): number {
  return posts.filter(isFarmRehomedListing).length;
}

function availabilityRank(value: FarmPetAvailability | null): number {
  if (value === 'for_sale') return 0;
  if (value === 'deposit_hold') return 1;
  if (value === 'completed') return 2;
  return 9;
}

export function sortFarmPets(posts: PetFeedPost[]): PetFeedPost[] {
  return [...posts]
    .filter((post) => farmPetAvailability(post) != null)
    .sort(
      (a, b) => availabilityRank(farmPetAvailability(a)) - availabilityRank(farmPetAvailability(b)),
    );
}

export function farmPetTabCount(posts: PetFeedPost[]): number {
  return posts.filter((post) => farmPetAvailability(post) != null).length;
}

export function countFarmPetsByAvailability(posts: PetFeedPost[]): FarmPetAvailabilityCounts {
  const counts: FarmPetAvailabilityCounts = {
    for_sale: 0,
    deposit_hold: 0,
    completed: 0,
  };
  for (const post of posts) {
    const availability = farmPetAvailability(post);
    if (availability) counts[availability] += 1;
  }
  return counts;
}

export function filterFarmPetsByAvailability(
  posts: PetFeedPost[],
  filter: FarmPetAvailabilityFilter,
): PetFeedPost[] {
  const sorted = sortFarmPets(posts);
  if (filter === 'all') return sorted;
  return sorted.filter((post) => farmPetAvailability(post) === filter);
}
