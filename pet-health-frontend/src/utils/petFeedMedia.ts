import * as ImageManipulator from 'expo-image-manipulator';
import {
  formatBytesAsMb,
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_VIDEO_MAX_BYTES,
} from './petFeedMediaLimits';

export {
  formatBytesAsMb,
  PET_FEED_PHOTO_MAX_BYTES,
  PET_FEED_VIDEO_MAX_BYTES,
} from './petFeedMediaLimits';

export async function getLocalUriByteSize(uri: string): Promise<number | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return typeof blob.size === 'number' ? blob.size : null;
  } catch {
    return null;
  }
}

/** Resize/compress camera-roll photos so uploads stay under the Pet Feed photo limit. */
export async function optimizePetFeedPhotoUri(uri: string): Promise<string> {
  const optimized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
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
