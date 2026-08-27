/** Phases shown while preparing media and submitting a listing for review. */
export type PetFeedSubmitProgressPhase =
  | 'preparing_photo'
  | 'preparing_thumb'
  | 'uploading_photo'
  | 'uploading_video'
  | 'uploading_thumb'
  | 'uploading_health_evidence'
  | 'saving'
  | 'done';

export type PetFeedSubmitProgress = {
  phase: PetFeedSubmitProgressPhase;
  /** Steps already finished (0 … totalSteps). */
  completedSteps: number;
  totalSteps: number;
  /** 0–100 overall progress. */
  percent: number;
  /** 1-based index when phase is preparing/uploading photos. */
  current?: number;
  total?: number;
};

export type PetFeedMediaUploadProgress = {
  phase: Exclude<
    PetFeedSubmitProgressPhase,
    'preparing_photo' | 'preparing_thumb'
  >;
  /** Upload/save steps finished before this event (0 … uploadTotalSteps). */
  completedSteps: number;
  uploadTotalSteps: number;
  current?: number;
  total?: number;
};

export type PetFeedSubmitProgressOptions = {
  onProgress?: (progress: PetFeedMediaUploadProgress) => void;
};

export function petFeedSubmitPercent(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)));
}

export function isRemotePetFeedMediaUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri) || uri.startsWith('memory://');
}

/** Count sequential upload + final save steps for progress totals. */
export function countPetFeedUploadAndSaveSteps(media: {
  photoUris: string[];
  videoUri?: string | null;
  listThumbUri?: string | null;
  healthEvidenceUris?: string[] | null;
}): number {
  let steps = 0;
  for (const uri of media.photoUris) {
    if (uri?.trim() && !isRemotePetFeedMediaUri(uri)) steps += 1;
  }
  const videoUri = typeof media.videoUri === 'string' ? media.videoUri.trim() : '';
  if (videoUri && !isRemotePetFeedMediaUri(videoUri)) steps += 1;
  const thumbUri = typeof media.listThumbUri === 'string' ? media.listThumbUri.trim() : '';
  if (thumbUri && !isRemotePetFeedMediaUri(thumbUri)) steps += 1;
  for (const uri of media.healthEvidenceUris ?? []) {
    if (uri?.trim() && !isRemotePetFeedMediaUri(uri)) steps += 1;
  }
  return steps + 1; // + save listing
}

export function countPetFeedPrepareSteps(photoUris: string[]): {
  preparePhotoCount: number;
  prepareThumb: boolean;
} {
  const localPhotos = photoUris.filter((uri) => uri?.trim() && !isRemotePetFeedMediaUri(uri));
  return {
    preparePhotoCount: localPhotos.length,
    prepareThumb: localPhotos.length > 0,
  };
}

export function buildPetFeedSubmitProgress(input: {
  phase: PetFeedSubmitProgressPhase;
  completedSteps: number;
  totalSteps: number;
  current?: number;
  total?: number;
}): PetFeedSubmitProgress {
  return {
    phase: input.phase,
    completedSteps: input.completedSteps,
    totalSteps: input.totalSteps,
    percent: petFeedSubmitPercent(input.completedSteps, input.totalSteps),
    current: input.current,
    total: input.total,
  };
}
