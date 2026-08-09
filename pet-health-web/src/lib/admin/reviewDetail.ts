/** Pure helpers for admin request review detail panels. */

export type AdminReviewPost = {
  id: string;
  title?: string;
  status?: string;
  species?: string;
  breed?: string;
  gender?: string;
  age_months?: number | null;
  location?: string;
  price_note?: string;
  description?: string;
  personality?: string[];
  vaccine_status?: string;
  deworming_status?: string;
  paperwork?: string[];
  media_urls?: string[];
  video_url?: string | null;
  contact?: Record<string, string | undefined> | null;
  metadata?: Record<string, unknown> | null;
  warranty_policy?: {
    id?: string;
    title?: string;
    care_parvo_coverage_days?: number;
    vaccine_shots_count?: number;
  } | null;
  breeder_profile?: {
    id?: string;
    display_name?: string;
    user_id?: string;
    location?: string;
  } | null;
  breeder_profile_id?: string | null;
  created_at?: string;
};

export type AdminReviewBreeder = {
  id: string;
  user_id?: string;
  display_name?: string;
  verification_status?: string;
  location?: string;
  bio?: string;
  care_environment?: string;
  avatar_url?: string | null;
  primary_species?: string[];
  main_breeds?: string[];
  contact?: Record<string, string | undefined> | null;
  metadata?: Record<string, unknown> | null;
  warranty_policies?: Array<{ id?: string; title?: string }> | null;
  created_at?: string;
};

export type AdminReviewReport = {
  id: string;
  reason?: string;
  status?: string;
  note?: string;
  created_at?: string;
  target_type?: string;
  post_id?: string | null;
  breeder_profile_id?: string | null;
  comment_id?: string | null;
  breeder_profile?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    bio?: string;
  } | null;
};

export type AdminReviewSpec = { id: string; labelKey: string; value: string };

export function healthEvidenceUrlsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  const raw = metadata?.health_evidence_urls ?? metadata?.evidence_urls;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function adminListingMediaUrls(post: AdminReviewPost): string[] {
  return (post.media_urls || []).filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );
}

export function adminListingContactEntries(
  contact: Record<string, string | undefined> | null | undefined,
): Array<{ key: string; value: string }> {
  if (!contact || typeof contact !== "object") return [];
  return Object.entries(contact)
    .map(([key, value]) => ({ key, value: String(value || "").trim() }))
    .filter((item) => item.value.length > 0);
}

export function adminListingSpecRows(post: AdminReviewPost): AdminReviewSpec[] {
  const rows: AdminReviewSpec[] = [];
  if (post.species?.trim()) {
    rows.push({ id: "species", labelKey: "admin.review.species", value: post.species.trim() });
  }
  if (post.breed?.trim()) {
    rows.push({ id: "breed", labelKey: "admin.review.breed", value: post.breed.trim() });
  }
  if (post.gender?.trim()) {
    rows.push({ id: "gender", labelKey: "admin.review.gender", value: post.gender.trim() });
  }
  if (post.age_months != null && Number(post.age_months) > 0) {
    rows.push({
      id: "age",
      labelKey: "admin.review.age",
      value: String(post.age_months),
    });
  }
  if (post.location?.trim()) {
    rows.push({
      id: "location",
      labelKey: "admin.review.location",
      value: post.location.trim(),
    });
  }
  if (post.price_note?.trim()) {
    rows.push({
      id: "price",
      labelKey: "admin.review.price",
      value: post.price_note.trim(),
    });
  }
  if (post.vaccine_status?.trim()) {
    rows.push({
      id: "vaccine",
      labelKey: "admin.review.vaccine",
      value: post.vaccine_status.trim(),
    });
  }
  if (post.deworming_status?.trim()) {
    rows.push({
      id: "deworming",
      labelKey: "admin.review.deworming",
      value: post.deworming_status.trim(),
    });
  }
  return rows;
}

export function adminBreederSpecRows(profile: AdminReviewBreeder): AdminReviewSpec[] {
  const rows: AdminReviewSpec[] = [];
  if (profile.location?.trim()) {
    rows.push({
      id: "location",
      labelKey: "admin.review.location",
      value: profile.location.trim(),
    });
  }
  if ((profile.primary_species || []).length) {
    rows.push({
      id: "species",
      labelKey: "admin.review.species",
      value: (profile.primary_species || []).join(", "),
    });
  }
  if ((profile.main_breeds || []).length) {
    rows.push({
      id: "breeds",
      labelKey: "admin.review.mainBreeds",
      value: (profile.main_breeds || []).join(", "),
    });
  }
  if (profile.user_id?.trim()) {
    rows.push({
      id: "user",
      labelKey: "admin.review.userId",
      value: profile.user_id.trim(),
    });
  }
  return rows;
}

export function toggleExpandedReviewId(
  current: string | null,
  nextId: string,
): string | null {
  return current === nextId ? null : nextId;
}
