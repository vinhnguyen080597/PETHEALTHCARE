import type { BreederProfile, PetFeedPost } from '../types';
import { normalizeSearchText } from './petFeedText.ts';

import { provinceMatchNeedles } from './vietnamProvinceSelection.ts';

function compactLocation(value: string) {
  return normalizeSearchText(value);
}

export function postMatchesProvince(
  post: Pick<PetFeedPost, 'location' | 'breeder_profile'>,
  province: string,
): boolean {
  const needles = provinceMatchNeedles(province);
  if (!needles.length) return true;
  const haystack = compactLocation([post.location, post.breeder_profile?.location].filter(Boolean).join(' '));
  return needles.some((needle) => haystack.includes(needle));
}

export function breederMatchesProvince(
  profile: Pick<BreederProfile, 'location'>,
  postLocations: string[],
  province: string,
): boolean {
  const needles = provinceMatchNeedles(province);
  if (!needles.length) return true;
  const haystack = compactLocation([profile.location, ...postLocations].filter(Boolean).join(' '));
  return needles.some((needle) => haystack.includes(needle));
}

export function countPostsInProvince(posts: Pick<PetFeedPost, 'location' | 'breeder_profile'>[], province: string): number {
  return posts.filter((post) => postMatchesProvince(post, province)).length;
}
