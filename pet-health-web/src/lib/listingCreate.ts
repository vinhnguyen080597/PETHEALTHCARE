/** Create-listing payload — mirrors mobile CreatePetFeedPostPayload + sequential uploads. */

export function buildListingCreatePayload(input: {
  title: string;
  species: string;
  breed: string;
  gender: string;
  ageMonths: string | number;
  location: string;
  priceNote: string;
  description: string;
  vaccineStatus: string;
  dewormingStatus: string;
  personality: string[];
  paperwork: string[];
  mediaUrls: string[];
  videoUrl: string;
  warrantyPolicyId?: string;
  healthEvidenceUrls?: string[];
  status?: string;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (input.warrantyPolicyId?.trim()) {
    metadata.warranty_policy_id = input.warrantyPolicyId.trim();
  }
  if (input.healthEvidenceUrls?.length) {
    metadata.health_evidence_urls = input.healthEvidenceUrls;
  }
  if (input.mediaUrls[0]) {
    metadata.video_poster_url = input.mediaUrls[0];
  }

  return {
    title: input.title.trim(),
    species: input.species.trim(),
    breed: input.breed.trim(),
    gender: input.gender.trim(),
    ageMonths: Number(input.ageMonths),
    location: input.location.trim(),
    priceNote: input.priceNote.trim(),
    description: input.description.trim(),
    vaccineStatus: input.vaccineStatus.trim(),
    dewormingStatus: input.dewormingStatus.trim(),
    personality: input.personality,
    paperwork: input.paperwork,
    mediaUrls: input.mediaUrls,
    videoUrl: input.videoUrl,
    status: input.status || "pending_review",
    metadata,
  };
}

export function listingMediaUploadErrorKey(input: {
  code?: string | null;
  message?: string | null;
}): "listing.new.field.mediaTooLarge" | "listing.new.field.uploadTooLarge" | null {
  const code = String(input.code || "").toUpperCase();
  const message = String(input.message || "");
  if (
    code === "MEDIA_TOO_LARGE" ||
    code === "PET_FEED_VIDEO_TOO_LARGE" ||
    code === "PET_FEED_PHOTO_TOO_LARGE" ||
    code === "LISTING_UPLOAD_TOO_LARGE" ||
    /exceeded the maximum allowed size|entitytoolarge|too large for storage/i.test(
      message,
    )
  ) {
    return code === "LISTING_UPLOAD_TOO_LARGE"
      ? "listing.new.field.uploadTooLarge"
      : "listing.new.field.mediaTooLarge";
  }
  return null;
}
