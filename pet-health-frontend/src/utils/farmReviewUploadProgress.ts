import type { TFunction } from 'i18next';
import {
  farmReviewUploadPercent,
  type FarmReviewUploadProgress,
} from './farmReviewUploadShared.ts';

export function farmReviewUploadProgressLabel(
  progress: FarmReviewUploadProgress,
  t: TFunction,
): string {
  const percent = farmReviewUploadPercent(progress.completedSteps, progress.totalSteps);
  if (progress.phase === 'submitting') {
    return `${t('farm.review.submittingReview')} (${percent}%)`;
  }
  if (progress.phase === 'uploading_photo' && progress.current && progress.total) {
    return `${t('farm.review.uploadingPhoto', {
      current: progress.current,
      total: progress.total,
    })} (${percent}%)`;
  }
  return `${t('farm.review.photosUploading')} (${percent}%)`;
}
