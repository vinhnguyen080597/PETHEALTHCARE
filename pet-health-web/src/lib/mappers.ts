import {
  type ApiBreederProfile,
  type ApiPetFeedPost,
  type BreederProfile,
  type BreederType,
  type ChecklistItem,
  type Listing,
  type TemplateId,
  type VerificationStatus,
  isTemplateId,
} from "./types";
import { formatPriceVnd } from "./formatPrice";
import {
  computeBreederQualityIndex,
  contactFieldCount,
  parseStoredTrustScore,
} from "./breederTrust";

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23E2E8F0' width='120' height='120'/%3E%3C/svg%3E";

const PLACEHOLDER_MEDIA =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23E2E8F0' width='800' height='600'/%3E%3C/svg%3E";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
  signals: Parameters<typeof computeBreederQualityIndex>[0],
): number {
  const stored = parseStoredTrustScore(meta);
  if (stored != null) return stored;
  return computeBreederQualityIndex(signals);
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
  options?: { activeListings?: number },
): BreederProfile {
  const meta = asRecord(profile?.metadata);
  const verificationStatus = normalizeVerification(profile?.verification_status);
  const verified = verificationStatus === "verified";
  const name = profile?.display_name || "Breeder";
  const bio = profile?.bio || "";
  const contact = profile?.contact || {};
  const avatar = profile?.avatar_url || String(meta.avatar_url || "") || PLACEHOLDER_AVATAR;
  const coverUrl =
    typeof meta.cover_url === "string"
      ? meta.cover_url
      : typeof meta.coverUrl === "string"
        ? meta.coverUrl
        : undefined;
  const activeListings =
    options?.activeListings ?? (Number(meta.active_listings) || 0);
  const checklist = parseChecklist(meta);
  const commitments = asStringArray(meta.commitments);
  const careEnvironment = profile?.care_environment || "";
  const mappedContact = {
    zalo: contact.zalo,
    phone: contact.phone,
    facebook: contact.facebook,
  };
  const trustScore = resolveTrustScore(meta, {
    verified,
    checklistDoneCount: checklist.filter((c) => c.done).length,
    commitmentsCount: commitments.length,
    contactCount: contactFieldCount(mappedContact),
    hasCareEnvironment: Boolean(
      careEnvironment.trim() || bio.trim(),
    ),
    activeListings,
  });
  const scaleRaw = String(meta.scale || "").trim();

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
    penaltyPoints: parsePenalty(meta),
    violations: Array.isArray(meta.violations)
      ? (meta.violations as Array<Record<string, unknown>>).map((v, i) => ({
          id: String(v.id || `v${i}`),
          reason: String(v.reason || ""),
          date: String(v.date || ""),
          points: Number(v.points) || 0,
        }))
      : [],
    activeListings,
    template: parseTemplate(meta),
    contact: mappedContact,
    scale: scaleRaw === "—" || scaleRaw === "-" ? "" : scaleRaw,
    careEnvironment,
    commitments,
    checklist,
    verificationTier: parseVerificationTier(meta, verificationStatus, trustScore),
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
  const status =
    statusRaw === "pending_review" ||
    statusRaw === "draft" ||
    statusRaw === "archived" ||
    statusRaw === "published"
      ? statusRaw
      : "published";

  const breeder = mapApiBreeder(post.breeder_profile);
  const rawPrice = post.price_note || "";
  const formatted = formatPriceVnd(rawPrice);

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
    mediaUrl: media[0] || PLACEHOLDER_MEDIA,
    mediaUrls: media.length ? media : [PLACEHOLDER_MEDIA],
    evidenceUrls: evidence.length ? evidence : undefined,
    status,
    breeder,
    saved: Boolean(post.is_favorited),
    postKind: post.post_kind,
    escrowEnabled: parseEscrowEnabled(meta),
  };
}

export function mapApiPosts(posts: ApiPetFeedPost[]): Listing[] {
  return posts.map(mapApiPost);
}
