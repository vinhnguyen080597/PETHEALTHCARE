export type Lang = "VI" | "EN";

export type TemplateId = "T1" | "T2" | "T3" | "T4" | "T5";

export type BreederType =
  | "registered_kennel"
  | "home_breeder"
  | "rescue_foster"
  | "rehoming"
  | "other";

export type VerificationStatus =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected"
  | "suspended";

export type TrustLevel = "L0" | "L1" | "L2" | "L3" | "L4";

/** Verification tier shown on public breeder cards (product Phase 1+). */
export type VerificationTier = 1 | 2 | 3;

export type AdminSection =
  | "home"
  | "requests"
  | "listings"
  | "breeders"
  | "reports"
  | "history"
  | "users"
  | "features"
  | "news";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Violation {
  id: string;
  reason: string;
  date: string;
  points: number;
}

export interface BreederProfile {
  id: string;
  userId?: string;
  name: string;
  displayNameVI: string;
  location: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  breederType: BreederType;
  primarySpecies: string[];
  mainBreeds: string[];
  avatar: string;
  coverUrl?: string;
  bio: string;
  bioVI: string;
  trustScore: number;
  penaltyPoints: number;
  violations: Violation[];
  activeListings: number;
  /** Confirmed rehomes when available; otherwise 0 (never invent). */
  petsRehomed?: number;
  template: TemplateId;
  contact: {
    zalo?: string;
    phone?: string;
    facebook?: string;
    tiktok?: string;
  };
  scale: string;
  careEnvironment: string;
  commitments: string[];
  checklist: ChecklistItem[];
  /** Public badge T1/T2/T3 — never expose template id. */
  verificationTier: VerificationTier;
  /** Breeder warranty policy library (files). */
  warrantyPolicies?: WarrantyPolicy[];
  /** True after first warranty policy creation (+10 trust once). */
  warrantyPolicyTrustAwarded?: boolean;
}

export interface WarrantyPolicy {
  id: string;
  title: string;
  createdAt?: string;
  frozen?: boolean;
  vaccineShotsCount?: number;
  vaccineTypes?: string;
  dewormingNote?: string;
  hasHealthBook?: boolean;
  careParvoCoverageDays?: number;
  respiratorySkinCoverageDays?: number;
  congenitalCoverageDays?: number;
  reportWithinHours?: number;
  vetRequirement?: string;
  buyerGuidelines?: string[];
  exclusions?: string[];
  medicalFeeSupportPercent?: number;
  allowEquivalentSwap?: boolean;
  shippingParty?: string;
  evidenceRequired?: string[];
  breederResponseHours?: number;
  /** @deprecated file-based policies removed; kept for old snapshots */
  fileUrl?: string;
  contentType?: string;
}

export interface ListingDeal {
  status?: string;
  senUserId?: string;
  senDisplayName?: string;
  senEmail?: string;
  breederConfirmedDepositAt?: string | null;
  senConfirmedDepositAt?: string | null;
  breederConfirmedCompleteAt?: string | null;
  senConfirmedCompleteAt?: string | null;
  handoffPhotos?: string[];
  completeRequestedAt?: string | null;
  completeDeadlineAt?: string | null;
  completedAt?: string | null;
  cancelReason?: string | null;
  cancelPhotos?: string[];
  cancelRequestedAt?: string | null;
  disputeMessage?: string | null;
  disputeEvidenceUrls?: string[];
  disputeOpenedAt?: string | null;
}

export interface Listing {
  id: string;
  title: string;
  titleVI: string;
  species: string;
  breed: string;
  gender: string;
  ageMonths: number;
  location: string;
  price: string;
  description: string;
  descriptionVI: string;
  personality: string[];
  personalityVI: string[];
  vaccineStatus: string;
  dewormingStatus: string;
  mediaUrl: string;
  mediaUrls: string[];
  /** Short listing video when provided. */
  videoUrl?: string | null;
  evidenceUrls?: string[];
  status:
    | "published"
    | "pending_review"
    | "draft"
    | "archived"
    | "sold"
    | "cancelled"
    | "deposit_hold";
  breeder: BreederProfile;
  /** Post author user id (for owner-only UI). */
  ownerUserId?: string;
  saved: boolean;
  postKind?: string;
  /** Listing accepts PetCare escrow deposit (Phase B UI). */
  escrowEnabled: boolean;
  /** True when archive/sold metadata marks a completed rehome. */
  metadataSold?: boolean;
  /** True when the listing closed as a cancelled deposit (negative outcome). */
  metadataCancelled?: boolean;
  /** True after the owner deleted the listing (hidden from farm / feed). */
  ownerDeleted?: boolean;
  warrantyPolicy?: WarrantyPolicy | null;
  deal?: ListingDeal | null;
}

/** Raw API shapes (snake_case from backend). */
export interface ApiWarrantyPolicy {
  id: string;
  title?: string;
  created_at?: string;
  frozen?: boolean;
  vaccine_shots_count?: number;
  vaccine_types?: string;
  deworming_note?: string;
  has_health_book?: boolean;
  care_parvo_coverage_days?: number;
  respiratory_skin_coverage_days?: number;
  congenital_coverage_days?: number;
  report_within_hours?: number;
  vet_requirement?: string;
  buyer_guidelines?: string[];
  exclusions?: string[];
  medical_fee_support_percent?: number;
  allow_equivalent_swap?: boolean;
  shipping_party?: string;
  evidence_required?: string[];
  breeder_response_hours?: number;
  file_url?: string;
  content_type?: string;
}

export interface ApiBreederProfile {
  id: string;
  user_id?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string | null;
  contact?: Record<string, string>;
  primary_species?: string[];
  main_breeds?: string[];
  care_environment?: string;
  verification_status?: string;
  metadata?: Record<string, unknown>;
  warranty_policies?: ApiWarrantyPolicy[];
  warranty_policy_trust_awarded?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPetFeedPost {
  id: string;
  user_id?: string;
  breeder_profile_id?: string | null;
  title?: string;
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
  contact?: Record<string, string>;
  status?: string;
  post_kind?: string;
  metadata?: Record<string, unknown>;
  warranty_policy?: ApiWarrantyPolicy | null;
  deal?: Record<string, unknown> | null;
  breeder_profile?: ApiBreederProfile | null;
  is_favorited?: boolean;
  created_at?: string;
  updated_at?: string;
  media_count?: number;
  comment_count?: number;
  favorite_count?: number;
}

export interface ApiAccount {
  id?: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  primary_role?: string;
  roles?: string[];
}

export interface PageResult<T> {
  data: T[];
  nextCursor?: string | null;
}

export const templateMeta: Record<
  TemplateId,
  { nameVI: string; nameEN: string; accent: string; description: string }
> = {
  T1: {
    nameVI: "Tối giản tin cậy",
    nameEN: "Trust Minimal",
    accent: "#1E6FE8",
    description:
      "Hero compact gradient/primary. Metric + Trust nổi bật. Phù hợp hộ gia đình, lần đầu đăng ký.",
  },
  T2: {
    nameVI: "Trại có ảnh bìa",
    nameEN: "Cover Farm",
    accent: "#0F172A",
    description:
      "Cover full-bleed. Story 2-col. Phù hợp kennel có ảnh môi trường đẹp.",
  },
  T3: {
    nameVI: "Ưu tiên tin đăng",
    nameEN: "Listings First",
    accent: "#7C3AED",
    description:
      "Metric mỏng → Listings grid ngay. Accent tím. Phù hợp breeder nhiều tin.",
  },
  T4: {
    nameVI: "Cứu hộ / Foster",
    nameEN: "Rescue Soft",
    accent: "#059669",
    description:
      "Story + commitments nổi. Spacing thoáng. Phù hợp rescue, foster, rehoming.",
  },
  T5: {
    nameVI: "Kennel đăng ký",
    nameEN: "Registered Kennel",
    accent: "#B45309",
    description:
      "Banner credentials. Trust + Verified nhấn mạnh. Phù hợp trại đăng ký chính thức.",
  },
};

export function getTrustLevel(
  score: number,
  _verified?: boolean,
): { level: TrustLevel; label: string } {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 20) return { level: "L0", label: "Cảnh báo rủi ro" };
  if (s <= 40) return { level: "L1", label: "Hồ sơ mới" };
  if (s <= 60) return { level: "L2", label: "Đang xác minh" };
  if (s <= 80) return { level: "L3", label: "Đã kiểm định" };
  return { level: "L4", label: "Trại tiêu chuẩn" };
}

export function getEffectiveTrust(score: number, penalty: number): number {
  return Math.max(0, score - penalty);
}

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    value === "T1" ||
    value === "T2" ||
    value === "T3" ||
    value === "T4" ||
    value === "T5"
  );
}
