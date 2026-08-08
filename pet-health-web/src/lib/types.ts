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
  evidenceUrls?: string[];
  status: "published" | "pending_review" | "draft" | "archived";
  breeder: BreederProfile;
  saved: boolean;
  postKind?: string;
  /** Listing accepts PetCare escrow deposit (Phase B UI). */
  escrowEnabled: boolean;
}

/** Raw API shapes (snake_case from backend). */
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
