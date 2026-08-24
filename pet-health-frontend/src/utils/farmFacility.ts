import { parseTrustAwardedFromMeta } from './breederTransparencyScore.ts';

export type FarmFacilitySocialId = 'facebook' | 'tiktok' | 'instagram' | 'zalo';

export type FarmFacilitySocialLink = {
  id: FarmFacilitySocialId;
  labelKey: string;
  display: string;
  href: string | null;
};

const SOCIAL_ORDER: FarmFacilitySocialId[] = ['facebook', 'zalo', 'tiktok', 'instagram'];

function displayHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return `${parsed.host.replace(/^www\./i, '')}${path}` || url;
  } catch {
    return url;
  }
}

/** Public Zalo: 0901234567 → 090***567 */
export function maskZaloPublicDisplay(raw: string): string {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length < 7) return '';
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

export function publicFacilityVideoUrl(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  const record = meta && typeof meta === 'object' ? meta : {};
  const awarded = parseTrustAwardedFromMeta(record);
  if (!awarded.facilityVideo) return null;
  const url =
    typeof record.facility_video_url === 'string'
      ? record.facility_video_url.trim()
      : typeof record.facilityVideoUrl === 'string'
        ? record.facilityVideoUrl.trim()
        : '';
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export function farmFacilitySocialLinks(contact: {
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  zalo?: string;
} & Record<string, unknown>): FarmFacilitySocialLink[] {
  const links: FarmFacilitySocialLink[] = [];
  for (const id of SOCIAL_ORDER) {
    const raw = String(contact[id] || '').trim();
    if (!raw) continue;
    if (id === 'zalo') {
      const display = maskZaloPublicDisplay(raw);
      if (!display) continue;
      links.push({
        id,
        labelKey: 'farm.facility.zalo',
        display,
        href: null,
      });
      continue;
    }
    const href = /^https?:\/\//i.test(raw) ? raw : null;
    if (!href) continue;
    links.push({
      id,
      labelKey: `farm.facility.${id}`,
      display: displayHttpUrl(href),
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
  if (String(input.bio || '').trim()) return true;
  if ((input.socialCount ?? 0) > 0) return true;
  return Boolean(input.videoUrl);
}
