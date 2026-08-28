import { compressImageFile } from "./compressImageFile";
import { DealSubmitError } from "./dealPhotoUpload";
import {
  LISTING_MAX_VIDEO_BYTES,
  LISTING_PHOTO_MAX_BYTES,
} from "./listingFormOptions";

export class ListingMediaUploadError extends DealSubmitError {}

type UploadKind = "photo" | "video";

async function uploadPetFeedListingFile(
  kind: UploadKind,
  file: File,
): Promise<string> {
  const ready =
    kind === "photo"
      ? await compressImageFile(file, { maxBytes: LISTING_PHOTO_MAX_BYTES })
      : file;

  if (kind === "photo" && ready.size > LISTING_PHOTO_MAX_BYTES) {
    throw new ListingMediaUploadError(
      "Photo is too large",
      400,
      "PET_FEED_PHOTO_TOO_LARGE",
    );
  }
  if (kind === "video" && ready.size > LISTING_MAX_VIDEO_BYTES) {
    throw new ListingMediaUploadError(
      "Video is too large",
      400,
      "PET_FEED_VIDEO_TOO_LARGE",
    );
  }

  const fd = new FormData();
  fd.set("kind", kind);
  fd.set(
    "file",
    ready,
    ready.name || (kind === "video" ? "clip.mp4" : "photo.jpg"),
  );

  const res = await fetch("/api/pet-feed/upload-file", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    data?: { publicUrl?: string };
  };
  if (!res.ok) {
    throw new ListingMediaUploadError(
      String(data.error || "Failed"),
      res.status,
      data.code,
    );
  }
  const url = data.data?.publicUrl;
  if (!url) {
    throw new ListingMediaUploadError("Failed", res.status, "PET_FEED_DIRECT_UPLOAD_FAILED");
  }
  return url;
}

/** Upload listing media one file at a time (mobile parity — avoids giant multipart bodies). */
export async function uploadListingDraftMedia(input: {
  photos: File[];
  video: File;
  healthEvidence?: File[];
}): Promise<{
  mediaUrls: string[];
  videoUrl: string;
  healthEvidenceUrls: string[];
}> {
  const mediaUrls: string[] = [];
  for (const photo of input.photos) {
    mediaUrls.push(await uploadPetFeedListingFile("photo", photo));
  }

  const videoUrl = await uploadPetFeedListingFile("video", input.video);

  const healthEvidenceUrls: string[] = [];
  for (const file of input.healthEvidence ?? []) {
    healthEvidenceUrls.push(await uploadPetFeedListingFile("photo", file));
  }

  return { mediaUrls, videoUrl, healthEvidenceUrls };
}
