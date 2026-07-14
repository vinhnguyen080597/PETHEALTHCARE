/** Keep in sync with pet-health-backend/src/constants/petFeedMediaLimits.js */
export const PET_FEED_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PET_FEED_PHOTO_TARGET_BYTES = 3 * 1024 * 1024;
export const PET_FEED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const PET_FEED_VIDEO_MAX_DURATION_SECONDS = 180;
export const PET_FEED_LIST_THUMB_MAX_BYTES = 2 * 1024 * 1024;

export function formatBytesAsMb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))}MB`;
}

/** Expo ImagePicker Asset.duration is milliseconds for videos. */
export function isPetFeedVideoDurationAllowed(duration: number | null | undefined): boolean {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return true;
  const seconds = duration / 1000;
  return seconds <= PET_FEED_VIDEO_MAX_DURATION_SECONDS + 0.5;
}
