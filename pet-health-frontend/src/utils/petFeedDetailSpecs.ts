import type { PetFeedPost } from '../types.ts';
import { resolvePostGender } from './petFeedGender.ts';

export type PetFeedDetailSpecKey = 'breed' | 'gender' | 'location' | 'birthDate';

export type PetFeedDetailSpec = {
  key: PetFeedDetailSpecKey;
  icon: 'paw' | 'calendar' | 'male-female' | 'location';
  labelKey: string;
  value: string;
};

/** Core 2×2 marketplace specs: breed | gender / location | birth date. */
export function buildPetFeedDetailSpecs(
  post: Pick<PetFeedPost, 'breed' | 'gender' | 'location'> & { birthDateLabel?: string },
  labels: {
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
    post.birthDateLabel?.trim()
      ? {
          key: 'birthDate',
          icon: 'calendar',
          labelKey: 'petFeed.detail.birthDate',
          value: post.birthDateLabel.trim(),
        }
      : null,
  ];

  return specs.filter((item): item is PetFeedDetailSpec => item != null);
}
