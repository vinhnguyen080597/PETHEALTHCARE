/**
 * Keep in sync with pet-health-frontend/src/utils/petFeedMediaLimits.ts
 *
 * Supabase Free global file size limit is 50MB — product limits must stay under that.
 */
export const PET_FEED_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/** After client encode. */
export const PET_FEED_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

/** Prefer compressing toward this size for faster feed uploads. */
export const PET_FEED_PHOTO_TARGET_BYTES = 3 * 1024 * 1024;

/** After encode / picker — must stay ≤ Supabase global file limit (Free = 50MB). */
export const PET_FEED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Listing video duration cap (Chợ Tốt-style). */
export const PET_FEED_VIDEO_MAX_DURATION_SECONDS = 180;

/** Soft anti-abuse quota aligned with marketplace peers (~30 video listings / month). */
export const PET_FEED_VIDEO_LISTINGS_PER_MONTH = 30;

export const PET_FEED_LIST_THUMB_MAX_BYTES = 2 * 1024 * 1024;

export function petFeedPhotoMaxLabel() {
  return `${Math.round(PET_FEED_PHOTO_MAX_BYTES / (1024 * 1024))}MB`;
}

export function petFeedVideoMaxLabel() {
  return `${Math.round(PET_FEED_VIDEO_MAX_BYTES / (1024 * 1024))}MB`;
}
