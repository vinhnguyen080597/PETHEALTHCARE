/** Breeder transparency detail submissions — shared web/mobile contract. */

/**
 * Web Edit Breeder profile (`/app/account/breeder`) does not show the
 * "Transparency details" upload section. Breeders submit facility video,
 * license, and social links via Farm Trust guide earn actions instead.
 */
export const WEB_EDIT_BREEDER_SHOWS_TRANSPARENCY_DETAILS = false;

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

export function socialSubmissionPlaceholder(type: BreederSubmissionType): string {
  switch (type) {
    case "social_facebook":
      return "https://facebook.com/yourpage";
    case "social_zalo":
      return "090xxxxxxx";
    case "social_tiktok":
      return "https://www.tiktok.com/@username";
    case "social_instagram":
      return "https://www.instagram.com/username";
    default:
      return "https://";
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function zaloDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isZaloPhoneInput(value: string): boolean {
  const digits = zaloDigits(value);
  return /^0\d{9}$/.test(digits) || /^84\d{9}$/.test(digits);
}

export function normalizeSocialSubmissionUrl(
  url: string,
  type?: BreederSubmissionType,
): string {
  const trimmed = url.trim();
  if (type === "social_zalo") {
    if (!isZaloPhoneInput(trimmed)) return trimmed;
    const digits = zaloDigits(trimmed);
    return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
  }
  return trimmed;
}

function isFacebookProfileUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (!["facebook.com", "fb.com", "m.facebook.com", "m.me"].includes(host)) {
    return false;
  }
  const path = pathnameOf(url);
  if (
    /\/(posts|videos|watch|photo|photos|permalink\.php|share)\b/i.test(path)
  ) {
    return false;
  }
  if (path === "/profile.php") return true;
  const slug = path.replace(/^\//, "");
  return slug.length >= 1 && !slug.includes("/");
}

function isTiktokProfileUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (host !== "tiktok.com") return false;
  const path = pathnameOf(url);
  return /^\/@[A-Za-z0-9._]{2,24}$/.test(path);
}

function isInstagramProfileUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (host !== "instagram.com" && host !== "instagr.am") return false;
  const path = pathnameOf(url);
  if (
    /^\/(p|reel|reels|stories|tv|explore|accounts|direct)\b/i.test(path)
  ) {
    return false;
  }
  return /^\/[A-Za-z0-9._]{1,30}$/.test(path);
}

export type SocialUrlErrorCode =
  | "required"
  | "https"
  | "facebook"
  | "zalo"
  | "tiktok"
  | "instagram";

export function socialSubmissionUrlError(
  url: string,
  type?: BreederSubmissionType,
): SocialUrlErrorCode | null {
  const normalized = normalizeSocialSubmissionUrl(url, type);
  if (!normalized) return "required";
  if (type === "social_facebook") {
    return isFacebookProfileUrl(normalized) ? null : "facebook";
  }
  if (type === "social_zalo") {
    return isZaloPhoneInput(normalized) ? null : "zalo";
  }
  if (type === "social_tiktok") {
    return isTiktokProfileUrl(normalized) ? null : "tiktok";
  }
  if (type === "social_instagram") {
    return isInstagramProfileUrl(normalized) ? null : "instagram";
  }
  if (!/^https?:\/\//i.test(normalized)) return "https";
  return null;
}

export const SOCIAL_URL_ERROR_I18N_KEYS: Record<
  SocialUrlErrorCode,
  `account.breederDetails.socialError.${SocialUrlErrorCode}`
> = {
  required: "account.breederDetails.socialError.required",
  https: "account.breederDetails.socialError.https",
  facebook: "account.breederDetails.socialError.facebook",
  zalo: "account.breederDetails.socialError.zalo",
  tiktok: "account.breederDetails.socialError.tiktok",
  instagram: "account.breederDetails.socialError.instagram",
};

export function validateSocialSubmissionUrl(
  url: string,
  type?: BreederSubmissionType,
): string | null {
  const code = socialSubmissionUrlError(url, type);
  if (!code) return null;
  const messages: Record<SocialUrlErrorCode, string> = {
    required: "URL is required",
    https: "Link must start with http:// or https://",
    facebook: "Use a Facebook profile or page URL (facebook.com/yourpage).",
    zalo: "Enter a 10-digit Zalo phone number (090xxxxxxx).",
    tiktok: "Use a TikTok profile URL (tiktok.com/@username).",
    instagram: "Use an Instagram profile URL (instagram.com/username).",
  };
  return messages[code];
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
