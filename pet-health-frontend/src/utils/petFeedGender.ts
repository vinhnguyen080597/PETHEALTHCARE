import type { BreederProfile, PetFeedPost } from '../types';
import { normalizeSearchText } from './petFeedText.ts';

export type PostGender = 'male' | 'female' | 'unknown';

export type GenderFilter = 'all' | 'male' | 'female';

export function resolvePostGender(gender: string | null | undefined): PostGender {
  const normalized = normalizeSearchText(gender ?? '');
  if (!normalized || normalized === 'unknown' || normalized.includes('chua ro')) return 'unknown';
  if (normalized === 'female' || normalized === 'f' || normalized === 'cai' || normalized.includes('female') || normalized.includes('cai')) {
    return 'female';
  }
  if (normalized === 'male' || normalized === 'm' || normalized === 'duc' || normalized.includes('male') || normalized.includes('duc')) {
    return 'male';
  }
  return 'unknown';
}

export function postMatchesGender(post: Pick<PetFeedPost, 'gender'>, filter: Exclude<GenderFilter, 'all'>): boolean {
  return resolvePostGender(post.gender) === filter;
}

export function breederHasGenderPosts(
  posts: Pick<PetFeedPost, 'gender'>[],
  filter: Exclude<GenderFilter, 'all'>,
): boolean {
  return posts.some((post) => postMatchesGender(post, filter));
}

export function breederMatchesGender(item: { posts: Pick<PetFeedPost, 'gender'>[] }, filter: Exclude<GenderFilter, 'all'>): boolean {
  return breederHasGenderPosts(item.posts, filter);
}

export function countPostsByGender(posts: Pick<PetFeedPost, 'gender'>[], gender: Exclude<GenderFilter, 'all'>): number {
  return posts.filter((post) => resolvePostGender(post.gender) === gender).length;
}
