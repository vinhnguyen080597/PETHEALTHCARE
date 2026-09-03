import { parseTrustAwardedFromMeta } from "./breederTransparencyScore";
import { isBlankDisplayValue } from "./formatPrice";

/** 16:9 matches YouTube/Airbnb tour embeds; 420px cap keeps reviews on-screen. */
export const FARM_FACILITY_VIDEO_ASPECT = "16 / 9";
export const FARM_FACILITY_VIDEO_MAX_HEIGHT_PX = 420;

export const FARM_OVERVIEW_SECTIONS = ["health", "facility", "reviews"] as const;

export type FarmFacilitySocialId = "facebook" | "tiktok" | "instagram" | "zalo";

export type FarmFacilitySocialLink = {
  id: FarmFacilitySocialId;
  labelKey:
    | "farm.facility.facebook"
    | "farm.facility.tiktok"
    | "farm.facility.instagram"
    | "farm.facility.zalo";
  display: string;
  href: string | null;
};

const SOCIAL_ORDER: FarmFacilitySocialId[] = [
  "facebook",
  "zalo",
  "tiktok",
  "instagram",
];

const SOCIAL_HOSTS: Record<Exclude<FarmFacilitySocialId, "zalo">, readonly string[]> = {
  facebook: ["facebook.com", "fb.com", "m.facebook.com", "m.me"],
  tiktok: ["tiktok.com"],
  instagram: ["instagram.com", "instagr.am"],
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isLocalOrPrivateHost(host: string): boolean {
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function isAllowedPublicSocialHref(
  id: Exclude<FarmFacilitySocialId, "zalo">,
  href: string,
): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  const host = hostnameOf(href);
  if (isLocalOrPrivateHost(host)) return false;
  return SOCIAL_HOSTS[id].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function displayHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    return `${parsed.host.replace(/^www\./i, "")}${path}` || url;
  } catch {
    return url;
  }
}

/** Public Zalo: 0901234567 → 090***567 (first 3 + last 3). */
export function maskZaloPublicDisplay(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length < 7) return "";
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

export function publicFacilityVideoUrl(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  const record = meta && typeof meta === "object" ? meta : {};
  const awarded = parseTrustAwardedFromMeta(record);
  if (!awarded.facilityVideo) return null;
  const url =
    typeof record.facility_video_url === "string"
      ? record.facility_video_url.trim()
      : "";
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export function farmFacilitySocialLinks(contact: {
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  zalo?: string;
}): FarmFacilitySocialLink[] {
  const links: FarmFacilitySocialLink[] = [];
  for (const id of SOCIAL_ORDER) {
    const raw = String(contact[id] || "").trim();
    if (!raw) continue;
    if (id === "zalo") {
      const display = maskZaloPublicDisplay(raw);
      if (!display) continue;
      links.push({
        id,
        labelKey: "farm.facility.zalo",
        display,
        href: null,
      });
      continue;
    }
    const href = /^https?:\/\//i.test(raw) ? raw : null;
    if (!href || !isAllowedPublicSocialHref(id, href)) continue;
    const labelKey =
      id === "facebook"
        ? "farm.facility.facebook"
        : id === "tiktok"
          ? "farm.facility.tiktok"
          : "farm.facility.instagram";
    links.push({
      id,
      labelKey,
      display: displayHttpUrl(raw),
      href,
    });
  }
  return links;
}

export function farmFacilityHasContent(input: {
  bio?: string;
  socialCount?: number;
  videoUrl?: string | null;
}): boolean {
  if (!isBlankDisplayValue(input.bio)) return true;
  if ((input.socialCount ?? 0) > 0) return true;
  return Boolean(input.videoUrl);
}
