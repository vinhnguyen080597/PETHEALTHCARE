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
  registration_unit?: string;
  registration_unit_other?: string;
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

export function adminBreederCoverUrl(
  profile: Pick<AdminReviewBreeder, "metadata">,
): string {
  const meta = profile.metadata;
  if (!meta || typeof meta !== "object") return "";
  for (const key of ["cover_url", "coverUrl", "coverImageUrl", "cover_image_url"]) {
    const value = meta[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }
  return "";
}

export function adminBreederAvatarUrl(
  profile: Pick<AdminReviewBreeder, "avatar_url" | "metadata">,
): string {
  const direct = String(profile.avatar_url || "").trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  const meta = profile.metadata;
  if (!meta || typeof meta !== "object") return "";
  for (const key of ["avatar_url", "avatarUrl"]) {
    const value = meta[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }
  return "";
}

export function adminBreederSpecRows(profile: AdminReviewBreeder): AdminReviewSpec[] {
  const rows: AdminReviewSpec[] = [];
  const meta =
    profile.metadata && typeof profile.metadata === "object" ? profile.metadata : {};
  const breederType = String(meta.breederType || meta.breeder_type || "").trim();
  if (breederType) {
    rows.push({
      id: "breederType",
      labelKey: "admin.review.breederType",
      value: breederType,
    });
  }
  if (profile.location?.trim()) {
    rows.push({
      id: "location",
      labelKey: "admin.review.location",
      value: profile.location.trim(),
    });
  }
  if (profile.care_environment?.trim()) {
    rows.push({
      id: "careEnvironment",
      labelKey: "admin.review.careEnvironment",
      value: profile.care_environment.trim(),
    });
  }
  if ((profile.primary_species || []).length) {
    rows.push({
      id: "primarySpecies",
      labelKey: "admin.review.primarySpecies",
      value: (profile.primary_species || []).join(", "),
    });
  }
  const registrationUnit = String(profile.registration_unit || "").trim();
  if (registrationUnit) {
    rows.push({
      id: "registrationUnit",
      labelKey: "admin.review.registrationUnit",
      value:
        registrationUnit === "other"
          ? String(profile.registration_unit_other || "").trim() || "other"
          : registrationUnit,
    });
  }
  const kennelName = String(
    meta.registeredKennelName || meta.registered_kennel_name || "",
  ).trim();
  if (kennelName) {
    rows.push({
      id: "registeredKennelName",
      labelKey: "admin.review.registeredKennelName",
      value: kennelName,
    });
  }
  const registeredAt = String(meta.registeredAt || meta.registered_at || "").trim();
  if (registeredAt) {
    rows.push({
      id: "registeredAt",
      labelKey: "admin.review.registeredAt",
      value: registeredAt,
    });
  }
  if ((profile.main_breeds || []).length) {
    rows.push({
      id: "breeds",
      labelKey: "admin.review.mainBreeds",
      value: (profile.main_breeds || []).join(", "),
    });
  }
  if (profile.verification_status?.trim()) {
    rows.push({
      id: "status",
      labelKey: "admin.review.verificationStatus",
      value: profile.verification_status.trim(),
    });
  }
  if (profile.created_at?.trim()) {
    rows.push({
      id: "createdAt",
      labelKey: "admin.review.createdAt",
      value: profile.created_at.trim(),
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

export function adminBreederCommitmentLabels(
  profile: Pick<AdminReviewBreeder, "metadata">,
): string[] {
  const meta = profile.metadata;
  if (!meta || typeof meta !== "object") return [];
  const raw =
    meta.transparencyCommitments ?? meta.transparency_commitments;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

/** i18n key for a stored commitment id, or null if unknown. */
export function adminBreederCommitmentLabelKey(
  commitmentId: string,
): string | null {
  const id = String(commitmentId || "").trim();
  if (!id) return null;
  return `breederForm.commitment.${id}`;
}

/** i18n key for a species slug such as cat/dog. */
export function adminSpeciesLabelKey(species: string): string | null {
  const slug = String(species || "")
    .trim()
    .toLowerCase();
  if (!slug) return null;
  return `listing.new.species.${slug}`;
}

/** i18n key for breeder verification_status. */
export function adminVerificationStatusLabelKey(status: string): string {
  const slug = String(status || "")
    .trim()
    .toLowerCase();
  if (!slug) return "admin.verification.unverified";
  return `admin.verification.${slug}`;
}

export function toggleExpandedReviewId(
  current: string | null,
  nextId: string,
): string | null {
  return current === nextId ? null : nextId;
}

export function breederPublicHref(profileId: string): string {
  return `/app/breeders/${encodeURIComponent(profileId)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function isDealDisputeReport(reason?: string | null): boolean {
  return String(reason || "")
    .trim()
    .toLowerCase() === "deal_dispute";
}

export function dealDisputeFromPost(
  post: AdminReviewPost | null | undefined,
): {
  dealStatus: string;
  message: string;
  evidenceUrls: string[];
  handoffPhotos: string[];
} | null {
  const meta = asRecord(post?.metadata);
  const deal = asRecord(meta?.deal);
  if (!deal) return null;
  const dispute = asRecord(deal.dispute);
  const message = String(dispute?.message || "").trim();
  const evidenceUrls = stringUrlList(
    dispute?.evidence_urls ?? dispute?.evidenceUrls,
  );
  const handoffPhotos = stringUrlList(
    deal.handoff_photos ?? deal.handoffPhotos,
  );
  const dealStatus = String(deal.status || "").trim().toLowerCase();
  if (!message && evidenceUrls.length < 1 && handoffPhotos.length < 1) {
    return dealStatus ? { dealStatus, message: "", evidenceUrls: [], handoffPhotos: [] } : null;
  }
  return { dealStatus, message, evidenceUrls, handoffPhotos };
}

/** True when an open deal_dispute sits on a deposit_hold listing (force-resolve not shipped). */
export function isOpenDealDisputeOnHold(input: {
  reportReason?: string | null;
  reportStatus?: string | null;
  linkedPostStatus?: string | null;
}): boolean {
  if (!isDealDisputeReport(input.reportReason)) return false;
  if (
    String(input.reportStatus || "")
      .trim()
      .toLowerCase() !== "open"
  ) {
    return false;
  }
  return (
    String(input.linkedPostStatus || "")
      .trim()
      .toLowerCase() === "deposit_hold"
  );
}
