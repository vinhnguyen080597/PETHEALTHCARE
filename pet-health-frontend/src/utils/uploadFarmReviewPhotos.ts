import { uploadFarmReviewPhoto } from '../api';
import { FARM_REVIEW_MAX_PHOTOS } from './farmReview';
import {
  farmReviewUploadPercent,
  type FarmReviewUploadProgress,
} from './farmReviewUploadShared.ts';

export { farmReviewUploadPercent, type FarmReviewUploadProgress };

export async function uploadFarmReviewPhotoUris(
  token: string,
  photoUris: string[],
  onProgress?: (progress: FarmReviewUploadProgress) => void,
): Promise<string[]> {
  const capped = photoUris.slice(0, FARM_REVIEW_MAX_PHOTOS);
  const totalSteps = capped.length + 1;
  const urls: string[] = [];
  let completedSteps = 0;

  for (let index = 0; index < capped.length; index += 1) {
    onProgress?.({
      phase: 'uploading_photo',
      completedSteps,
      totalSteps,
      current: index + 1,
      total: capped.length,
    });
    urls.push(await uploadFarmReviewPhoto(token, capped[index]!));
    completedSteps += 1;
  }

  onProgress?.({
    phase: 'submitting',
    completedSteps,
    totalSteps,
  });
  return urls;
}
