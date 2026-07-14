import * as ImageManipulator from 'expo-image-manipulator';
import {
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_PHOTO_TARGET_BYTES,
  PET_FEED_VIDEO_MAX_BYTES,
} from './petFeedMediaLimits';

export {
  formatBytesAsMb,
  isPetFeedVideoDurationAllowed,
  PET_FEED_LIST_THUMB_MAX_BYTES,
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_PHOTO_TARGET_BYTES,
  PET_FEED_VIDEO_MAX_BYTES,
  PET_FEED_VIDEO_MAX_DURATION_SECONDS,
} from './petFeedMediaLimits';

const PHOTO_QUALITY_LADDER: Array<{ width: number; compress: number }> = [
  { width: 2048, compress: 0.85 },
  { width: 1920, compress: 0.8 },
  { width: 1600, compress: 0.75 },
  { width: 1280, compress: 0.7 },
  { width: 1024, compress: 0.65 },
];

export async function getLocalUriByteSize(uri: string): Promise<number | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return typeof blob.size === 'number' ? blob.size : null;
  } catch {
    return null;
  }
}

/**
 * Encode listing photos for retina display, stepping down until under the target size.
 */
export async function optimizePetFeedPhotoUri(uri: string): Promise<string> {
  let bestUri = uri;
  for (const step of PHOTO_QUALITY_LADDER) {
    const optimized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: step.width } }],
      { compress: step.compress, format: ImageManipulator.SaveFormat.JPEG },
    );
    bestUri = optimized.uri;
    const sizeBytes = await getLocalUriByteSize(optimized.uri);
    if (sizeBytes == null) return optimized.uri;
    if (sizeBytes <= PET_FEED_PHOTO_TARGET_BYTES) return optimized.uri;
    if (sizeBytes <= PET_FEED_PHOTO_MAX_BYTES && step === PHOTO_QUALITY_LADDER[PHOTO_QUALITY_LADDER.length - 1]) {
      return optimized.uri;
    }
  }
  return bestUri;
}

/** Small feed-card thumbnail derived from the first listing photo. */
export async function optimizePetFeedListThumbUri(uri: string): Promise<string> {
  const optimized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 720 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
  );
  return optimized.uri;
}

export type PetFeedMediaSizeIssue =
  | { kind: 'photo'; index: number; sizeBytes: number }
  | { kind: 'video'; sizeBytes: number };

export async function findOversizedPetFeedMedia(options: {
  photoUris: string[];
  videoUri?: string | null;
}): Promise<PetFeedMediaSizeIssue | null> {
  for (let index = 0; index < options.photoUris.length; index += 1) {
    const sizeBytes = await getLocalUriByteSize(options.photoUris[index]);
    if (sizeBytes != null && sizeBytes > PET_FEED_PHOTO_MAX_BYTES) {
      return { kind: 'photo', index, sizeBytes };
    }
  }
  if (options.videoUri) {
    const sizeBytes = await getLocalUriByteSize(options.videoUri);
    if (sizeBytes != null && sizeBytes > PET_FEED_VIDEO_MAX_BYTES) {
      return { kind: 'video', sizeBytes };
    }
  }
  return null;
}
