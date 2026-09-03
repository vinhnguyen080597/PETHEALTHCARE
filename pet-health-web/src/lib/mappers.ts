import {
  type ApiBreederProfile,
  type ApiPetFeedPost,
  type ApiWarrantyPolicy,
  type BreederProfile,
  type BreederType,
  type ChecklistItem,
  type Listing,
  type TemplateId,
  type VerificationStatus,
  type WarrantyPolicy,
  isTemplateId,
} from "./types";
import { formatPriceVnd } from "./formatPrice";
import {
  computeBreederQualityIndex,
  contactFieldCount,
  parseTrustActivityFromMeta,
  transparencyInputFromBreeder,
} from "./breederTrust";
import {
  listingMetadataMarksCancelled,
  listingMetadataMarksSold,
} from "./farmPets";
import { metadataMarksOwnerDeleted } from "./listingOwnerDelete";
import { getComplianceScoreFromMetadata } from "./breederComplianceScore";
import { parseReviewStatsFromMeta } from "./breederDealReviews";
import {
  coverUrlFromMetadata,
  resolveBreederAvatarUrl,
  resolveBreederCoverUrl,
} from "./breederProfileImages";
import { publicFacilityVideoUrl } from "./farmFacility";

const PLACEHOLDER_MEDIA =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23E2E8F0' width='800' height='600'/%3E%3C/svg%3E";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mapWarrantyPolicy(
  raw: ApiWarrantyPolicy | Record<string, unknown> | null | undefined,
): WarrantyPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "").trim();
  const title = String(row.title ?? "").trim();
  if (!id || !title) return null;
  const numOrUndef = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    id,
    title,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    frozen: Boolean(row.frozen),
    vaccineShotsCount: numOrUndef(row.vaccine_shots_count ?? row.vaccineShotsCount),
    vaccineTypes: String(row.vaccine_types ?? row.vaccineTypes ?? ""),
    dewormingNote: String(row.deworming_note ?? row.dewormingNote ?? ""),
    hasHealthBook: Boolean(row.has_health_book ?? row.hasHealthBook),
    careParvoCoverageDays: numOrUndef(
      row.care_parvo_coverage_days ?? row.careParvoCoverageDays,
    ),
    respiratorySkinCoverageDays: numOrUndef(
      row.respiratory_skin_coverage_days ?? row.respiratorySkinCoverageDays,
    ),
    congenitalCoverageDays: numOrUndef(
      row.congenital_coverage_days ?? row.congenitalCoverageDays,
    ),
    reportWithinHours: numOrUndef(
      row.report_within_hours ?? row.reportWithinHours,
    ),
    vetRequirement: String(row.vet_requirement ?? row.vetRequirement ?? ""),
    buyerGuidelines: asStringArray(row.buyer_guidelines ?? row.buyerGuidelines),
    exclusions: asStringArray(row.exclusions),
    medicalFeeSupportPercent: numOrUndef(
      row.medical_fee_support_percent ?? row.medicalFeeSupportPercent,
    ),
    allowEquivalentSwap: Boolean(
      row.allow_equivalent_swap ?? row.allowEquivalentSwap,
    ),
    shippingParty: String(row.shipping_party ?? row.shippingParty ?? ""),
    evidenceRequired: asStringArray(
      row.evidence_required ?? row.evidenceRequired,
    ),
    breederResponseHours: numOrUndef(
      row.breeder_response_hours ?? row.breederResponseHours,
    ),
    fileUrl: String(row.file_url ?? row.fileUrl ?? ""),
    contentType: String(row.content_type ?? row.contentType ?? ""),
  };
}

export function mapWarrantyPolicies(raw: unknown): WarrantyPolicy[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => mapWarrantyPolicy(item as ApiWarrantyPolicy))
    .filter((p): p is WarrantyPolicy => Boolean(p));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeVerification(status?: string): VerificationStatus {
  const s = (status || "unverified").toLowerCase();
  if (
    s === "verified" ||
    s === "pending_review" ||
    s === "rejected" ||
    s === "suspended" ||
    s === "unverified"
  ) {
    return s;
  }
  return "unverified";
}

function normalizeBreederType(value: unknown): BreederType {
  const s = String(value || "other").toLowerCase();
  if (
    s === "registered_kennel" ||
    s === "home_breeder" ||
    s === "rescue_foster" ||
    s === "rehoming" ||
    s === "other"
  ) {
    return s;
  }
  return "other";
}

function parseChecklist(meta: Record<string, unknown>): ChecklistItem[] {
  const raw = meta.checklist ?? meta.care_checklist;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { label: item, done: true };
    const obj = asRecord(item);
    return {
      label: String(obj.label || obj.name || "Checklist"),
      done: Boolean(obj.done ?? obj.checked ?? false),
    };
  });
}

function parseTemplate(meta: Record<string, unknown>): TemplateId {
  const t = meta.template ?? meta.template_id;
  return isTemplateId(t) ? t : "T1";
}

function resolveTrustScore(
  meta: Record<string, unknown>,
  breeder: Pick<
    import("./types").BreederProfile,
    "verified" | "verificationStatus" | "penaltyPoints" | "violations" | "warrantyPolicyTrustAwarded"
  >,
  extras: { senConfirmedCompletions?: number; fiveStarReviewCount?: number },
): number {
  return computeBreederQualityIndex(
    transparencyInputFromBreeder(breeder, meta, extras),
  );
}

function contactPresenceFlags(meta: Record<string, unknown>): {
  zalo: boolean;
  phone: boolean;
  facebook: boolean;
  tiktok: boolean;
} {
  const raw = asRecord(meta.contact_presence);
  const flag = (key: string) => {
    const v = raw[key];
    return v === true || v === 1 || v === "1" || v === "true";
  };
  return {
    zalo: flag("zalo"),
    phone: flag("phone"),
    facebook: flag("facebook"),
    tiktok: flag("tiktok"),
  };
}

function parsePenalty(meta: Record<string, unknown>): number {
  const raw = meta.penalty_points ?? meta.penaltyPoints;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw);
  return 0;
}

function parseVerificationTier(
  meta: Record<string, unknown>,
  verificationStatus: VerificationStatus,
  trustScore: number,
): 1 | 2 | 3 {
  const raw = meta.verification_tier ?? meta.verificationTier ?? meta.tier;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  if (verificationStatus !== "verified") return 1;
  if (trustScore >= 90 || meta.elite === true || meta.stake_active === true) return 3;
  if (meta.environment_verified === true || meta.farm_verified === true || trustScore >= 70) {
    return 2;
  }
  return 1;
}

function petsRehomedFromMeta(meta: Record<string, unknown>): number {
  const raw = meta.pets_rehomed ?? meta.petsRehomed ?? meta.sold_count;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function parseEscrowEnabled(meta: Record<string, unknown>): boolean {
  return Boolean(
    meta.escrow_enabled ??
      meta.escrowEnabled ??
      meta.accept_escrow ??
      meta.acceptEscrow ??
      meta.petcoin_escrow,
  );
}

function normalizeGender(value?: string): string {
  const g = (value || "").trim().toLowerCase();
  if (!g) return "";
  if (
    g === "male" ||
    g === "m" ||
    g === "đực" ||
    g === "duc" ||
    g.includes("male") ||
    g.includes("đực")
  ) {
    return "male";
  }
  if (
    g === "female" ||
    g === "f" ||
    g === "cái" ||
    g === "cai" ||
    g.includes("female") ||
    g.includes("cái")
  ) {
    return "female";
  }
  return g;
}

export function mapApiBreeder(
  profile: ApiBreederProfile | null | undefined,
  options?: { activeListings?: number; petsRehomed?: number },
): BreederProfile {
  const meta = asRecord(profile?.metadata);
  const verificationStatus = normalizeVerification(profile?.verification_status);
  const verified = verificationStatus === "verified";
  const name = profile?.display_name || "Breeder";
  const bio = profile?.bio || "";
  const contact = profile?.contact || {};
  const avatar = resolveBreederAvatarUrl(
    profile?.avatar_url,
    typeof meta.avatar_url === "string" ? meta.avatar_url : undefined,
  );
  const coverUrl = resolveBreederCoverUrl(coverUrlFromMetadata(meta));
  const activeListings =
    options?.activeListings ?? (Number(meta.active_listings) || 0);
  const petsRehomed =
    options?.petsRehomed ?? petsRehomedFromMeta(meta);
  const checklist = parseChecklist(meta);
  const commitments = asStringArray(meta.commitments);
  const mappedContact = {
    zalo: contact.zalo,
    phone: contact.phone,
    facebook: contact.facebook,
    tiktok: contact.tiktok,
    instagram: contact.instagram,
  };
  const penaltyPoints = parsePenalty(meta);
  const violations = Array.isArray(meta.violations)
    ? (meta.violations as Array<Record<string, unknown>>).map((v, i) => ({
        id: String(v.id || `v${i}`),
        reason: String(v.reason || ""),
        date: String(v.date || ""),
        points: Number(v.points) || 0,
      }))
    : [];
  const activity = parseTrustActivityFromMeta(meta);
  const reviewStats = parseReviewStatsFromMeta(meta);
  const breederSignals = {
    verified,
    verificationStatus,
    penaltyPoints,
    violations,
    warrantyPolicyTrustAwarded:
      Boolean(profile?.warranty_policy_trust_awarded) ||
      activity.hasFirstWarrantyPolicy,
  };
  const trustScore = resolveTrustScore(meta, breederSignals, {
    senConfirmedCompletions:
      reviewStats.senConfirmedCompletions ||
      activity.senConfirmedCompletions ||
      petsRehomed,
    fiveStarReviewCount:
      reviewStats.fiveStarReviewCount || activity.fiveStarReviewCount,
  });
  const scaleRaw = String(meta.scale || meta.scaleRange || "").trim();
  const warrantyPolicies = mapWarrantyPolicies(
    profile?.warranty_policies ?? meta.warranty_policies,
  );

  return {
    id: profile?.id || "unknown",
    userId: profile?.user_id,
    name,
    displayNameVI: name,
    location: profile?.location || "",
    verified,
    verificationStatus,
    breederType: normalizeBreederType(meta.breeder_type ?? meta.breederType),
    primarySpecies: profile?.primary_species || [],
    mainBreeds: profile?.main_breeds || [],
    avatar,
    coverUrl,
    bio,
    bioVI: bio,
    trustScore,
    complianceScore: getComplianceScoreFromMetadata(meta),
    penaltyPoints,
    violations,
    activeListings,
    petsRehomed,
    reviewAverage: reviewStats.reviewAverage,
    reviewCount: reviewStats.reviewCount,
    template: parseTemplate(meta),
    contact: mappedContact,
    scale: scaleRaw === "—" || scaleRaw === "-" ? "" : scaleRaw,
    careEnvironment: "",
    commitments,
    checklist,
    verificationTier: parseVerificationTier(meta, verificationStatus, trustScore),
    warrantyPolicies,
    warrantyPolicyTrustAwarded:
      Boolean(profile?.warranty_policy_trust_awarded) ||
      activity.hasFirstWarrantyPolicy,
    facilityVideoUrl: publicFacilityVideoUrl(meta),
  };
}

export function mapApiPost(post: ApiPetFeedPost): Listing {
  const media = Array.isArray(post.media_urls)
    ? post.media_urls.filter(Boolean)
    : [];
  const meta = asRecord(post.metadata);
  const evidence = asStringArray(meta.health_evidence_urls ?? meta.evidence_urls);
  const title = post.title || "Pet listing";
  const description = post.description || "";
  const personality = post.personality || [];
  const statusRaw = (post.status || "published").toLowerCase();
  const metadataSold = listingMetadataMarksSold(meta);
  const metadataCancelled = listingMetadataMarksCancelled(meta);
  const ownerDeleted = metadataMarksOwnerDeleted(meta);
  const softStatus = String(
    (meta.soft_status as string | undefined) || "",
  )
    .trim()
    .toLowerCase();
  let status: Listing["status"];
  if (ownerDeleted) {
    status = "archived";
  } else if (
    softStatus === "deposit_hold" ||
    softStatus === "sold" ||
    softStatus === "cancelled"
  ) {
    status = softStatus;
  } else if (statusRaw === "cancelled" || (statusRaw === "archived" && metadataCancelled)) {
    status = "cancelled";
  } else if (statusRaw === "sold" || (statusRaw === "archived" && metadataSold)) {
    status = "sold";
  } else if (
    statusRaw === "archived" &&
    (String((meta.deal as { status?: string } | undefined)?.status || "") ===
      "deposit_hold" ||
      Boolean(meta.soft_deposit_hold))
  ) {
    status = "deposit_hold";
  } else if (
    statusRaw === "pending_review" ||
    statusRaw === "draft" ||
    statusRaw === "archived" ||
    statusRaw === "published" ||
    statusRaw === "deposit_hold"
  ) {
    const dealStatus = String(
      (meta.deal as { status?: string } | undefined)?.status || "",
    )
      .trim()
      .toLowerCase();
    const heldDeal =
      dealStatus === "deposit_hold" ||
      dealStatus === "pending_cancel_confirm" ||
      dealStatus === "pending_sen_complete" ||
      dealStatus === "pending_complete" ||
      dealStatus === "dispute_open";
    if ((statusRaw === "published" || statusRaw === "pending_review") && heldDeal) {
      status = "deposit_hold";
    } else if (metadataCancelled) {
      status = "cancelled";
    } else if (metadataSold) {
      status = "sold";
    } else {
      status = statusRaw;
    }
  } else if (statusRaw === "cancelled" || metadataCancelled) {
    status = "cancelled";
  } else {
    status = metadataSold ? "sold" : "published";
  }

  const breeder = mapApiBreeder(post.breeder_profile);
  const ownerUserId =
    String(post.user_id || breeder.userId || "").trim() || undefined;
  if (ownerUserId && !breeder.userId) {
    breeder.userId = ownerUserId;
  }
  const rawPrice = post.price_note || "";
  const formatted = formatPriceVnd(rawPrice);
  const warrantyPolicy = mapWarrantyPolicy(post.warranty_policy);
  const dealRaw = asRecord(post.deal ?? meta.deal);

  return {
    id: post.id,
    title,
    titleVI: title,
    species: (post.species || "other").toLowerCase(),
    breed: post.breed || "",
    gender: normalizeGender(post.gender),
    ageMonths: Number(post.age_months) || 0,
    location: post.location || "",
    price: formatted || rawPrice,
    description,
    descriptionVI: description,
    personality,
    personalityVI: personality,
    vaccineStatus: post.vaccine_status || "",
    dewormingStatus: post.deworming_status || "",
    paperwork: Array.isArray(post.paperwork)
      ? post.paperwork.filter((item) => Boolean(String(item || "").trim()))
      : [],
    mediaUrl: media[0] || PLACEHOLDER_MEDIA,
    mediaUrls: media.length ? media : [PLACEHOLDER_MEDIA],
    videoUrl: post.video_url?.trim() || null,
    mediaCount: Number(post.media_count) || media.length || 0,
    evidenceUrls: evidence.length ? evidence : undefined,
    status,
    breeder,
    ownerUserId,
    saved: Boolean(post.is_favorited),
    postKind: post.post_kind,
    createdAt: String(post.created_at || "").trim() || undefined,
    announcementCategory:
      String(post.post_kind || "").toLowerCase() === "announcement"
        ? String(meta.category || meta.announcement_category || "general")
        : undefined,
    authorLabel:
      String(post.post_kind || "").toLowerCase() === "announcement"
        ? String(meta.authorLabel || meta.author_label || "").trim() ||
          undefined
        : undefined,
    ctaLabel: String(meta.ctaLabel || meta.cta_label || "").trim() || undefined,
    ctaUrl: String(meta.ctaUrl || meta.cta_url || "").trim() || undefined,
    favoriteCount: Number(post.favorite_count) || 0,
    commentCount: Number(post.comment_count) || 0,
    escrowEnabled: parseEscrowEnabled(meta),
    metadataSold: !ownerDeleted && (status === "sold" || metadataSold),
    metadataCancelled:
      !ownerDeleted && (status === "cancelled" || metadataCancelled),
    ownerDeleted,
    warrantyPolicy,
    deal: Object.keys(dealRaw).length
      ? {
          status: String(dealRaw.status || ""),
          senUserId: String(dealRaw.sen_user_id || dealRaw.senUserId || ""),
          senDisplayName: String(
            dealRaw.sen_display_name || dealRaw.senDisplayName || "",
          ),
          senEmail: String(dealRaw.sen_email || dealRaw.senEmail || ""),
          breederConfirmedDepositAt: (dealRaw.breeder_confirmed_deposit_at ??
            dealRaw.breederConfirmedDepositAt) as string | null | undefined,
          senConfirmedDepositAt: (dealRaw.sen_confirmed_deposit_at ??
            dealRaw.senConfirmedDepositAt) as string | null | undefined,
          breederConfirmedCompleteAt: (dealRaw.breeder_confirmed_complete_at ??
            dealRaw.breederConfirmedCompleteAt) as string | null | undefined,
          senConfirmedCompleteAt: (dealRaw.sen_confirmed_complete_at ??
            dealRaw.senConfirmedCompleteAt) as string | null | undefined,
          handoffPhotos: Array.isArray(dealRaw.handoff_photos)
            ? (dealRaw.handoff_photos as unknown[]).filter(
                (u): u is string => typeof u === "string" && Boolean(u.trim()),
              )
            : Array.isArray(dealRaw.handoffPhotos)
              ? (dealRaw.handoffPhotos as unknown[]).filter(
                  (u): u is string => typeof u === "string" && Boolean(u.trim()),
                )
              : [],
          completeRequestedAt: (dealRaw.complete_requested_at ??
            dealRaw.completeRequestedAt) as string | null | undefined,
          completeDeadlineAt: (dealRaw.complete_deadline_at ??
            dealRaw.completeDeadlineAt) as string | null | undefined,
          completedAt: (dealRaw.completed_at ?? dealRaw.completedAt) as
            | string
            | null
            | undefined,
          cancelReason: String(
            dealRaw.cancel_reason || dealRaw.cancelReason || "",
          ) || null,
          cancelPhotos: Array.isArray(dealRaw.cancel_photos)
            ? (dealRaw.cancel_photos as unknown[]).filter(
                (u): u is string => typeof u === "string" && Boolean(u.trim()),
              )
            : Array.isArray(dealRaw.cancelPhotos)
              ? (dealRaw.cancelPhotos as unknown[]).filter(
                  (u): u is string => typeof u === "string" && Boolean(u.trim()),
                )
              : [],
          cancelRequestedAt: (dealRaw.cancel_requested_at ??
            dealRaw.cancelRequestedAt) as string | null | undefined,
          disputeMessage: (() => {
            const d = (dealRaw.dispute || {}) as Record<string, unknown>;
            return String(d.message || "").trim() || null;
          })(),
          disputeEvidenceUrls: (() => {
            const d = (dealRaw.dispute || {}) as Record<string, unknown>;
            const raw = d.evidence_urls ?? d.evidenceUrls;
            return Array.isArray(raw)
              ? raw.filter(
                  (u): u is string => typeof u === "string" && Boolean(u.trim()),
                )
              : [];
          })(),
          disputeOpenedAt: (() => {
            const d = (dealRaw.dispute || {}) as Record<string, unknown>;
            return (d.opened_at ?? d.openedAt) as string | null | undefined;
          })(),
        }
      : null,
  };
}

export function mapApiPosts(posts: ApiPetFeedPost[]): Listing[] {
  return posts.map(mapApiPost);
}
