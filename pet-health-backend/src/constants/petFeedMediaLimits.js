/** Per-file multer ceiling — must be >= largest allowed photo or video. */
export const PET_FEED_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export const PET_FEED_PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export const PET_FEED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function petFeedPhotoMaxLabel() {
  return `${Math.round(PET_FEED_PHOTO_MAX_BYTES / (1024 * 1024))}MB`;
}

export function petFeedVideoMaxLabel() {
  return `${Math.round(PET_FEED_VIDEO_MAX_BYTES / (1024 * 1024))}MB`;
}
