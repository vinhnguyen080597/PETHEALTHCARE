import type { PetFeedPost } from '../types.ts';
import { resolvePostGender } from './petFeedGender.ts';

export type PetFeedDetailSpecKey = 'breed' | 'age' | 'gender' | 'location';

export type PetFeedDetailSpec = {
  key: PetFeedDetailSpecKey;
  icon: 'paw' | 'calendar' | 'male-female' | 'location';
  labelKey: string;
  value: string;
};

/** Core 2×2 marketplace specs shown on listing detail (web-aligned). */
export function buildPetFeedDetailSpecs(
  post: Pick<PetFeedPost, 'breed' | 'age_months' | 'gender' | 'location'>,
  labels: {
    ageMonths: (count: number) => string;
    male: string;
    female: string;
  },
): PetFeedDetailSpec[] {
  const gender = resolvePostGender(post.gender);
  const genderValue =
    gender === 'male' ? labels.male : gender === 'female' ? labels.female : (post.gender || '').trim();

  const specs: Array<PetFeedDetailSpec | null> = [
    post.breed?.trim()
      ? { key: 'breed', icon: 'paw', labelKey: 'petFeed.detail.breed', value: post.breed.trim() }
      : null,
    post.age_months != null && post.age_months > 0
      ? {
          key: 'age',
          icon: 'calendar',
          labelKey: 'petFeed.detail.age',
          value: labels.ageMonths(post.age_months),
        }
      : null,
    genderValue
      ? { key: 'gender', icon: 'male-female', labelKey: 'petFeed.detail.gender', value: genderValue }
      : null,
    post.location?.trim()
      ? {
          key: 'location',
          icon: 'location',
          labelKey: 'petFeed.detail.location',
          value: post.location.trim(),
        }
      : null,
  ];

  return specs.filter((item): item is PetFeedDetailSpec => item != null);
}
