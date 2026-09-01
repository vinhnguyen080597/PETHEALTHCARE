export type FarmReviewUploadProgress = {
  phase: 'uploading_photo' | 'submitting';
  completedSteps: number;
  totalSteps: number;
  current?: number;
  total?: number;
};

export function farmReviewUploadPercent(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)));
}
