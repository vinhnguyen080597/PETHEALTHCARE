/** Keep in sync with pet-health-backend/src/constants/petFeedMediaLimits.js */
export const PET_FEED_PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export const PET_FEED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function formatBytesAsMb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))}MB`;
}
