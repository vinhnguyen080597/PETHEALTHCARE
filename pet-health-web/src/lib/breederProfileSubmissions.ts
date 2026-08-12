/** Breeder transparency detail submissions — shared web/mobile contract. */

export const BREEDER_SUBMISSION_TYPES = [
  "facility_video",
  "business_license",
  "social_facebook",
  "social_zalo",
  "social_tiktok",
  "social_instagram",
] as const;

export type BreederSubmissionType = (typeof BREEDER_SUBMISSION_TYPES)[number];

export type BreederSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type BreederProfileSubmission = {
  id: string;
  breeder_profile_id: string;
  user_id: string;
  submission_type: BreederSubmissionType;
  payload: { url?: string; note?: string };
  status: BreederSubmissionStatus;
  rejection_reason?: string;
  admin_note?: string;
  created_at?: string;
  reviewed_at?: string | null;
  breeder_profile?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
    location?: string;
  } | null;
};

export function isSocialSubmissionType(type: string): boolean {
  return type.startsWith("social_");
}

export function breederSubmissionTypeLabel(
  type: string,
  lang: "VI" | "EN" = "VI",
): string {
  const vi: Record<string, string> = {
    facility_video: "Video cơ sở",
    business_license: "Giấy phép kinh doanh",
    social_facebook: "Facebook",
    social_zalo: "Zalo",
    social_tiktok: "TikTok",
    social_instagram: "Instagram",
  };
  const en: Record<string, string> = {
    facility_video: "Facility video",
    business_license: "Business license",
    social_facebook: "Facebook",
    social_zalo: "Zalo",
    social_tiktok: "TikTok",
    social_instagram: "Instagram",
  };
  const table = lang === "EN" ? en : vi;
  return table[type] || type;
}

export function validateSocialSubmissionUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "URL is required";
  if (!/^https?:\/\//i.test(trimmed)) {
    return "Link must start with http:// or https://";
  }
  return null;
}

export function submissionStatusForType(
  submissions: BreederProfileSubmission[],
  type: BreederSubmissionType,
): BreederProfileSubmission | undefined {
  return submissions.find((s) => s.submission_type === type);
}

export function pendingSubmissionTypes(
  submissions: BreederProfileSubmission[],
): BreederSubmissionType[] {
  return submissions
    .filter((s) => s.status === "pending")
    .map((s) => s.submission_type);
}

export function approvedSubmissionTypes(
  submissions: BreederProfileSubmission[],
): BreederSubmissionType[] {
  return submissions
    .filter((s) => s.status === "approved")
    .map((s) => s.submission_type);
}

export function adminBreederDetailFocusHref(submissionId: string): string {
  return `/app/admin?section=requests&type=detail&focus=${encodeURIComponent(submissionId)}`;
}
