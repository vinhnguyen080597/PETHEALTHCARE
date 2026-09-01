import type { Lang } from "../lib/types";
import type { EnKey } from "@/i18n";
import {
  farmReviewUploadPercent,
  type FarmReviewUploadProgress,
} from "./uploadFarmReviewMedia";

export function farmReviewUploadProgressLabel(
  lang: Lang,
  progress: FarmReviewUploadProgress,
  translate: (lang: Lang, key: EnKey) => string,
): string {
  const percent = farmReviewUploadPercent(progress.completedSteps, progress.totalSteps);
  let label = translate(lang, "farm.review.photosUploading");
  if (progress.phase === "submitting") {
    label = translate(lang, "farm.review.submittingReview");
  } else if (progress.phase === "uploading_photo" && progress.current && progress.total) {
    label = translate(lang, "farm.review.uploadingPhoto")
      .replace("{{current}}", String(progress.current))
      .replace("{{total}}", String(progress.total));
  }
  return `${label} (${percent}%)`;
}
