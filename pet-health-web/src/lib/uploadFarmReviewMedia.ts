import { FARM_REVIEW_MAX_PHOTOS } from "./breederFarmReviews";
import { compressImageFile } from "./compressImageFile";
import {
  DealSubmitError,
  FUNCTION_SAFE_PHOTO_BYTES,
  NEXT_FUNCTION_PHOTO_MAX_BYTES,
  dealPhotoSubmitErrorKey,
} from "./dealPhotoUpload";

export class FarmReviewMediaUploadError extends DealSubmitError {}

export type FarmReviewUploadProgress = {
  phase: "uploading_photo" | "submitting";
  completedSteps: number;
  totalSteps: number;
  current?: number;
  total?: number;
};

export function farmReviewUploadPercent(completedSteps: number, totalSteps: number): number {
  if (totalSteps <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)));
}

export function farmReviewMediaUploadErrorKey(input: {
  status?: number | null;
  code?: string | null;
  message?: string | null;
}): "farm.review.photosTooLarge" | null {
  if (dealPhotoSubmitErrorKey(input)) return "farm.review.photosTooLarge";
  const code = String(input.code || "").toUpperCase();
  if (code === "PET_FEED_PHOTO_TOO_LARGE") return "farm.review.photosTooLarge";
  return null;
}

async function uploadFarmReviewPhotoFile(file: File): Promise<string> {
  const ready = await compressImageFile(file, { maxBytes: FUNCTION_SAFE_PHOTO_BYTES });
  if (ready.size > NEXT_FUNCTION_PHOTO_MAX_BYTES) {
    throw new FarmReviewMediaUploadError(
      "Photo is too large",
      413,
      "FUNCTION_PAYLOAD_TOO_LARGE",
    );
  }

  const fd = new FormData();
  fd.set("file", ready, ready.name || "farm-review.jpg");

  const res = await fetch("/api/uploads/farm-review-photo", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    data?: { publicUrl?: string };
  };
  if (!res.ok) {
    throw new FarmReviewMediaUploadError(
      String(data.error || "Failed to upload photo"),
      res.status,
      data.code,
    );
  }
  const url = data.data?.publicUrl;
  if (!url) {
    throw new FarmReviewMediaUploadError(
      "Failed to upload photo",
      res.status,
      "PET_FEED_REVIEW_PHOTO_UPLOAD_FAILED",
    );
  }
  return url;
}

/** Upload review photos one file at a time (listing parity — avoids serverless payload limits). */
export async function uploadFarmReviewPhotos(
  files: File[],
  onProgress?: (progress: FarmReviewUploadProgress) => void,
): Promise<string[]> {
  const capped = files.slice(0, FARM_REVIEW_MAX_PHOTOS);
  const totalSteps = capped.length + 1;
  const urls: string[] = [];
  let completedSteps = 0;

  for (let index = 0; index < capped.length; index += 1) {
    onProgress?.({
      phase: "uploading_photo",
      completedSteps,
      totalSteps,
      current: index + 1,
      total: capped.length,
    });
    urls.push(await uploadFarmReviewPhotoFile(capped[index]!));
    completedSteps += 1;
  }

  onProgress?.({
    phase: "submitting",
    completedSteps,
    totalSteps,
  });
  return urls;
}
